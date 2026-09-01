"""Tests for document ingestion pipeline."""

from pathlib import Path
from src.ingestion.loader import load_documents, load_single_file
from src.ingestion.chunker import chunk_documents


def test_load_single_markdown_file():
    """Test loading a single markdown file."""
    content = load_single_file(Path("data/sample/investment_memos/sample_investment_memo.md"))
    assert len(content) > 0
    assert "investment" in content.lower() or "acme" in content.lower()


def test_load_documents_from_directory():
    """Test loading all documents from a directory."""
    documents = load_documents(Path("data/sample"))
    assert len(documents) > 0
    for doc in documents:
        assert "content" in doc
        assert "metadata" in doc
        assert "doc_type" in doc


def test_chunk_documents():
    """Test document chunking produces multiple chunks from long content."""
    long_content = "This is a test paragraph about private equity. " * 200
    documents = [{"content": long_content, "metadata": {"source": "test.md"}, "doc_type": "investment_memo"}]
    chunks = chunk_documents(documents, chunk_size=500, chunk_overlap=100)
    assert len(chunks) > 1
    for chunk in chunks:
        assert "content" in chunk
        assert "metadata" in chunk
        assert len(chunk["content"]) <= 600  # Some tolerance for sentence boundaries


def test_chunk_preserves_metadata():
    """Test that chunking preserves metadata from parent document."""
    documents = [{"content": "Short content " * 100, "metadata": {"source": "test.pdf"}, "doc_type": "term_sheet"}]
    chunks = chunk_documents(documents, chunk_size=200, chunk_overlap=50)
    for chunk in chunks:
        assert chunk["metadata"]["source"] == "test.pdf"
        assert chunk["doc_type"] == "term_sheet"
