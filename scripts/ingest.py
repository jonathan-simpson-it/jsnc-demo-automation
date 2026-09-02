#!/usr/bin/env python3
"""CLI script for ingesting documents into the vector store."""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import settings
from src.ingestion.loader import load_documents
from src.ingestion.chunker import chunk_documents
from src.vector_store.chroma import VectorStore


def main():
    """Main ingestion workflow."""
    print("PE AI Engineering - Document Ingestion")
    print("=" * 50)

    # Load documents
    data_dir = Path("data/sample")
    print(f"\nLoading documents from {data_dir}...")

    try:
        documents = load_documents(data_dir)
    except FileNotFoundError:
        print(f"Error: Data directory not found at {data_dir}")
        sys.exit(1)

    print(f"Loaded {len(documents)} documents")

    # Chunk documents
    print("\nChunking documents...")
    chunks = chunk_documents(documents)
    print(f"Created {len(chunks)} chunks")

    # Add to vector store
    print(f"\nAdding to vector store at {settings.chroma_persist_directory}...")
    store = VectorStore()
    store.add_documents(chunks)
    print(f"Added {len(chunks)} chunks to vector store")

    # Verify
    count = store.get_collection_count()
    print(f"\nVector store now contains {count} documents")

    print("\nIngestion complete!")


if __name__ == "__main__":
    main()
