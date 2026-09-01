"""ChromaDB vector store operations with per-document collections."""

import re

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

from config.settings import settings


def _sanitize_collection_name(name: str) -> str:
    """Sanitize a string to be a valid ChromaDB collection name."""
    # ChromaDB requires 3-512 chars from [a-zA-Z0-9._-]
    sanitized = re.sub(r'[^a-zA-Z0-9._-]', '_', name)
    # Ensure minimum length
    if len(sanitized) < 3:
        sanitized = sanitized + "_doc"
    # Ensure maximum length
    if len(sanitized) > 512:
        sanitized = sanitized[:512]
    return sanitized


class VectorStore:
    """ChromaDB-backed vector store with per-document collections."""

    def __init__(
        self,
        persist_directory: str | None = None,
        collection_name: str | None = None,
    ):
        """Initialize the vector store.

        Args:
            persist_directory: Directory for ChromaDB persistence.
            collection_name: Name of the global collection.
        """
        self.persist_directory = persist_directory or settings.chroma_persist_directory
        self.collection_name = collection_name or settings.chroma_collection_name

        self._chroma_client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        self._global_chroma = Chroma(
            client=self._chroma_client,
            collection_name=self.collection_name,
        )

    def _get_doc_collection(self, filename: str) -> Chroma:
        """Get or create a per-document Chroma collection."""
        col_name = _sanitize_collection_name(filename)
        return Chroma(
            client=self._chroma_client,
            collection_name=col_name,
        )

    def add_documents(self, chunks: list[dict], filename: str | None = None) -> None:
        """Add document chunks to both global and per-document collections.

        Args:
            chunks: List of chunk dicts with 'content', 'metadata', 'doc_type'.
            filename: If provided, uses this for per-document collection.
                      If not provided, groups chunks by filename from metadata.
        """
        # Add to global collection
        documents = []
        ids = []
        for i, chunk in enumerate(chunks):
            doc = Document(
                page_content=chunk["content"],
                metadata=chunk["metadata"],
            )
            documents.append(doc)
            source = chunk["metadata"].get("source", "unknown")
            chunk_idx = chunk["metadata"].get("chunk_index", i)
            doc_id = f"{source}_{chunk_idx}"
            ids.append(doc_id)
        self._global_chroma.add_documents(documents=documents, ids=ids)

        # Group chunks by filename for per-document collections
        if filename:
            # Single file: add all chunks to one collection
            doc_col = self._get_doc_collection(filename)
            doc_ids = [f"doc_{i}" for i in range(len(documents))]
            doc_col.add_documents(documents=documents, ids=doc_ids)
        else:
            # Multiple files: group by filename and add separately
            by_filename: dict[str, list[tuple[Document, str]]] = {}
            for doc, doc_id in zip(documents, ids):
                fn = doc.metadata.get("filename", "unknown")
                if fn not in by_filename:
                    by_filename[fn] = []
                by_filename[fn].append((doc, doc_id))

            for fn, items in by_filename.items():
                doc_col = self._get_doc_collection(fn)
                fn_docs = [item[0] for item in items]
                fn_ids = [f"doc_{i}" for i in range(len(items))]
                doc_col.add_documents(documents=fn_docs, ids=fn_ids)

        # Store auto-generated signals in collection metadata
        self._store_auto_signals(chunks)

    def _store_auto_signals(self, chunks: list[dict]) -> None:
        """Extract and store TF-IDF signals in per-document collection metadata."""
        import json

        # Group chunks by filename
        by_filename: dict[str, list[dict]] = {}
        for chunk in chunks:
            fn = chunk["metadata"].get("filename", "unknown")
            if fn not in by_filename:
                by_filename[fn] = []
            by_filename[fn].append(chunk)

        for fn, fn_chunks in by_filename.items():
            # Check if first chunk has auto signals
            pos_raw = fn_chunks[0]["metadata"].get("auto_positive_signals")
            neg_raw = fn_chunks[0]["metadata"].get("auto_negative_signals")
            if not pos_raw:
                continue

            try:
                col_name = _sanitize_collection_name(fn)
                collection = self._chroma_client.get_collection(col_name)
                # Update collection metadata with signals
                existing_meta = collection.metadata or {}
                existing_meta["auto_positive_signals"] = pos_raw
                existing_meta["auto_negative_signals"] = neg_raw
                collection.modify(metadata=existing_meta)
            except Exception:
                pass

    def search(
        self,
        query: str,
        k: int = 4,
        filter_doc_type: str | None = None,
        source_filter: str | None = None,
    ) -> list[dict]:
        """Search for similar documents.

        Args:
            query: Search query string.
            k: Number of results to return.
            filter_doc_type: Optional filter by document type.
            source_filter: Optional filename to scope search to a specific document.

        Returns:
            List of result dicts with content, metadata, and score.
        """
        # If source_filter is specified, search only that document's collection
        if source_filter:
            return self._search_single(query, source_filter, k)

        # Otherwise search all per-document collections and merge
        return self._search_all(query, k)

    def _search_single(self, query: str, filename: str, k: int) -> list[dict]:
        """Search within a single document's collection."""
        doc_col = self._get_doc_collection(filename)
        results = doc_col.similarity_search_with_score(query, k=k)
        return [
            {
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score),
            }
            for doc, score in results
        ]

    def _search_all(self, query: str, k: int) -> list[dict]:
        """Search across all per-document collections and merge results.

        Returns top-k results with fair representation across documents.
        """
        doc_collections = self._list_doc_collections()
        if not doc_collections:
            return self._search_global(query, k)

        # Search each collection, returning up to min(5, collection_size) results
        all_results = []
        for col_name in doc_collections:
            try:
                col = Chroma(
                    client=self._chroma_client,
                    collection_name=col_name,
                )
                # Get all chunks if small doc, otherwise top 5
                col_count = col._collection.count()
                per_doc_k = min(5, col_count)
                results = col.similarity_search_with_score(query, k=per_doc_k)
                for doc, score in results:
                    all_results.append({
                        "content": doc.page_content,
                        "metadata": doc.metadata,
                        "score": float(score),
                    })
            except Exception:
                continue

        if not all_results:
            return self._search_global(query, k)

        # Sort by score and deduplicate
        all_results.sort(key=lambda r: r["score"])
        seen = set()
        deduped = []
        for r in all_results:
            key = r["content"][:100]
            if key not in seen:
                seen.add(key)
                deduped.append(r)

        return deduped[:k]

    def _search_global(self, query: str, k: int) -> list[dict]:
        """Fallback search on the global collection."""
        results = self._global_chroma.similarity_search_with_score(query, k=k)
        return [
            {
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": float(score),
            }
            for doc, score in results
        ]

    def _list_doc_collections(self) -> list[str]:
        """List all per-document collection names."""
        all_collections = self._chroma_client.list_collections()
        return [
            c.name for c in all_collections
            if c.name != self.collection_name
        ]

    def list_documents(self) -> list[dict]:
        """List all ingested documents with their chunk counts."""
        documents = []
        for col_name in self._list_doc_collections():
            try:
                col = self._chroma_client.get_collection(col_name)
                count = col.count()
                # Get filename from first document's metadata
                sample = col.get(limit=1)
                filename = "unknown"
                if sample and sample["metadatas"]:
                    filename = sample["metadatas"][0].get("filename", col_name)
                documents.append({
                    "filename": filename,
                    "collection": col_name,
                    "chunks": count,
                })
            except Exception:
                continue
        return documents

    def delete_document(self, filename: str) -> bool:
        """Delete a document's collection and its chunks from the global collection."""
        col_name = _sanitize_collection_name(filename)
        try:
            self._chroma_client.delete_collection(col_name)
        except Exception:
            pass

        # Also remove from global collection
        try:
            global_col = self._chroma_client.get_collection(self.collection_name)
            # Get all IDs for this filename
            all_docs = global_col.get()
            ids_to_delete = []
            for i, meta in enumerate(all_docs["metadatas"]):
                if meta.get("filename") == filename:
                    ids_to_delete.append(all_docs["ids"][i])
            if ids_to_delete:
                global_col.delete(ids=ids_to_delete)
        except Exception:
            pass

        return True

    def get_retriever(self, k: int | None = None) -> BaseRetriever:
        """Get a LangChain-compatible retriever."""
        k = k or settings.retrieval_k
        return self._global_chroma.as_retriever(search_kwargs={"k": k})

    def get_collection_count(self) -> int:
        """Get the number of documents in the global collection."""
        collection = self._chroma_client.get_collection(self.collection_name)
        return collection.count()
