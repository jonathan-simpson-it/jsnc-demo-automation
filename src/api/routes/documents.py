"""Document management endpoints."""

from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel

from src.core.database import get_db
from src.ingestion.loader import load_documents
from src.ingestion.chunker import chunk_documents

router = APIRouter()


class DocumentUpdate(BaseModel):
    client_id: int | None = None
    project_id: int | None = None


class TagCreate(BaseModel):
    name: str
    color: str = "#80988f"


class DocumentTagAdd(BaseModel):
    tag_id: int


# ---- Tags ----


@router.get("/tags")
async def list_tags():
    """List all tags."""
    db = get_db()
    try:
        rows = db.execute("SELECT id, name, color FROM tags ORDER BY name").fetchall()
        return {"tags": [dict(r) for r in rows]}
    finally:
        db.close()


@router.post("/tags")
async def create_tag(body: TagCreate):
    """Create a new tag."""
    db = get_db()
    try:
        db.execute(
            "INSERT INTO tags (name, color) VALUES (?, ?)",
            (body.name, body.color),
        )
        db.commit()
        row = db.execute(
            "SELECT id, name, color FROM tags WHERE name = ?", (body.name,)
        ).fetchone()
        return dict(row)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        db.close()


@router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: int):
    """Delete a tag."""
    db = get_db()
    try:
        db.execute("DELETE FROM tags WHERE id = ?", (tag_id,))
        db.commit()
        return {"deleted": True}
    finally:
        db.close()


# ---- Document assignment & tagging ----


@router.put("/{doc_id}/assign")
async def assign_document(doc_id: int, body: DocumentUpdate):
    """Assign a document to a client and/or project."""
    db = get_db()
    try:
        updates = []
        params = []
        if body.client_id is not None:
            updates.append("client_id = ?")
            params.append(body.client_id)
        if body.project_id is not None:
            updates.append("project_id = ?")
            params.append(body.project_id)
        if not updates:
            raise HTTPException(status_code=400, detail="Nothing to update")
        params.append(doc_id)
        db.execute(f"UPDATE documents SET {', '.join(updates)} WHERE id = ?", params)
        db.commit()
        return {"updated": True}
    finally:
        db.close()


@router.post("/{doc_id}/tags")
async def add_tag_to_document(doc_id: int, body: DocumentTagAdd):
    """Add a tag to a document."""
    db = get_db()
    try:
        db.execute(
            "INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)",
            (doc_id, body.tag_id),
        )
        db.commit()
        return {"added": True}
    finally:
        db.close()


@router.delete("/{doc_id}/tags/{tag_id}")
async def remove_tag_from_document(doc_id: int, tag_id: int):
    """Remove a tag from a document."""
    db = get_db()
    try:
        db.execute(
            "DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?",
            (doc_id, tag_id),
        )
        db.commit()
        return {"removed": True}
    finally:
        db.close()


# ---- Upload ----


@router.post("/upload")
async def upload_document(
    file: UploadFile,
    client_id: int | None = None,
    project_id: int | None = None,
):
    """Upload a document to the knowledge base."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    safe_name = Path(file.filename).name
    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename")

    supported = {".pdf", ".txt", ".md"}
    if Path(safe_name).suffix.lower() not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Supported: {', '.join(supported)}",
        )

    upload_dir = Path("data/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / safe_name

    content = await file.read()
    file_path.write_bytes(content)

    # Auto-ingest into vector store
    ingested = 0
    try:
        from src.ingestion.loader import _infer_doc_type, _load_text_with_lines, _load_pdf_with_pages

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
            from src.api.deps import get_vector_store
            store = get_vector_store()
            store.add_documents(chunks)
            ingested = len(chunks)
    except Exception:
        ingested = 0

    # Save to database
    db = get_db()
    try:
        cursor = db.execute(
            """INSERT INTO documents (filename, chunks, doc_type, client_id, project_id, source)
               VALUES (?, ?, '', ?, ?, 'upload')""",
            (safe_name, ingested, client_id, project_id),
        )
        db.commit()
        doc_id = cursor.lastrowid
        return {
            "id": doc_id,
            "filename": safe_name,
            "size": len(content),
            "status": "uploaded",
            "chunks_ingested": ingested,
        }
    finally:
        db.close()


# ---- List (with filters) ----


@router.get("/list")
async def list_documents(
    client_id: int | None = None,
    project_id: int | None = None,
    tag_id: int | None = None,
):
    """List documents with optional filters."""
    db = get_db()
    try:
        query = """
            SELECT d.id, d.filename, d.collection, d.chunks, d.summary,
                   d.doc_type, d.client_id, d.project_id, d.source,
                   d.onedrive_path, d.created_at,
                   c.name as client_name, p.name as project_name
            FROM documents d
            LEFT JOIN clients c ON c.id = d.client_id
            LEFT JOIN projects p ON p.id = d.project_id
        """
        conditions = []
        params = []

        if client_id is not None:
            conditions.append("d.client_id = ?")
            params.append(client_id)
        if project_id is not None:
            conditions.append("d.project_id = ?")
            params.append(project_id)
        if tag_id is not None:
            conditions.append("d.id IN (SELECT document_id FROM document_tags WHERE tag_id = ?)")
            params.append(tag_id)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY d.created_at DESC"

        rows = db.execute(query, params).fetchall()

        # Fetch tags for each document
        documents = []
        for r in rows:
            doc = dict(r)
            tag_rows = db.execute(
                """SELECT t.id, t.name, t.color
                   FROM tags t
                   JOIN document_tags dt ON dt.tag_id = t.id
                   WHERE dt.document_id = ?""",
                (doc["id"],),
            ).fetchall()
            doc["tags"] = [dict(t) for t in tag_rows]
            documents.append(doc)

        return {"documents": documents}
    finally:
        db.close()


# ---- Stats (legacy endpoint) ----


@router.get("/stats")
async def get_document_stats():
    """Get document statistics."""
    try:
        from src.api.deps import get_vector_store
        vector_store = get_vector_store()
        count = vector_store.get_collection_count()
        docs = vector_store.list_documents_with_summaries()
    except RuntimeError:
        count = 0
        docs = []

    # Enrich with database info
    db = get_db()
    try:
        db_docs = db.execute(
            """SELECT d.id, d.filename, d.client_id, d.project_id, d.source,
                      c.name as client_name, p.name as project_name
               FROM documents d
               LEFT JOIN clients c ON c.id = d.client_id
               LEFT JOIN projects p ON p.id = d.project_id"""
        ).fetchall()
        db_map = {r["filename"]: dict(r) for r in db_docs}
    finally:
        db.close()

    enriched = []
    for d in docs:
        info = db_map.get(d.get("filename", ""), {})
        d["id"] = info.get("id")
        d["client_name"] = info.get("client_name")
        d["project_name"] = info.get("project_name")
        d["source"] = info.get("source", "upload")
        enriched.append(d)

    return {
        "total_documents": count,
        "collection_name": "pe_documents",
        "documents": enriched,
    }


# ---- Ingest ----


@router.post("/ingest")
async def ingest_documents():
    """Ingest all documents from the data directory."""
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
