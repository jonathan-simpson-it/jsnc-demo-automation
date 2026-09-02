"""Document management endpoints."""

from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from src.ingestion.loader import load_documents
from src.ingestion.chunker import chunk_documents
from src.api.deps import get_vector_store

router = APIRouter()


@router.post("/upload")
async def upload_document(file: UploadFile):
    """Upload a document to the knowledge base.

    Args:
        file: Document file to upload.

    Returns:
        Upload confirmation with document details.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Sanitize filename to prevent path traversal
    safe_name = Path(file.filename).name
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Reject unsupported file types
    supported = {".pdf", ".txt", ".md"}
    if Path(safe_name).suffix.lower() not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(supported)}",
        )

    # Save uploaded file
    upload_dir = Path("data/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / safe_name

    content = await file.read()
    file_path.write_bytes(content)

    # Auto-ingest into vector store with location tracking
    try:
        from src.ingestion.loader import _infer_doc_type, _load_text_with_lines, _load_pdf_with_pages
        from src.ingestion.chunker import chunk_documents
        from src.api.deps import get_vector_store

        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            locations = _load_pdf_with_pages(file_path)
        else:
            locations = _load_text_with_lines(file_path)

        content_text = "\n\n".join(loc["text"] for loc in locations if loc["text"].strip())
        if content_text.strip():
            doc_type = _infer_doc_type(file_path)
            doc = {
                "content": content_text,
                "metadata": {"source": str(file_path), "filename": safe_name},
                "locations": locations,
                "doc_type": doc_type.value,
            }
            chunks = chunk_documents([doc])
            store = get_vector_store()
            store.add_documents(chunks)
            ingested = len(chunks)
        else:
            ingested = 0
    except Exception:
        ingested = 0  # Non-fatal: file saved but not ingested

    return {
        "filename": safe_name,
        "size": len(content),
        "status": "uploaded",
        "chunks_ingested": ingested,
    }


@router.post("/ingest")
async def ingest_documents():
    """Ingest all documents from the data directory.

    Returns:
        Ingestion statistics.
    """
    data_dir = Path("data/sample")
    if not data_dir.exists():
        raise HTTPException(status_code=404, detail="Data directory not found")

    documents = load_documents(data_dir)
    chunks = chunk_documents(documents)

    return {
        "documents_loaded": len(documents),
        "chunks_created": len(chunks),
        "status": "ingested",
    }


@router.get("/stats")
async def get_document_stats():
    """Get document statistics.

    Returns:
        Document and chunk counts with summaries.
    """
    try:
        vector_store = get_vector_store()
        count = vector_store.get_collection_count()
        docs = vector_store.list_documents_with_summaries()
    except RuntimeError:
        count = 0
        docs = []
    return {
        "total_documents": count,
        "collection_name": "pe_documents",
        "documents": docs,
    }
