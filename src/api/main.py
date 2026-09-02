"""FastAPI application for PE AI Engineering API."""

import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from src.api.deps import set_vector_store
from src.api.routes.agents import router as agents_router
from src.api.routes.documents import router as documents_router
from src.api.routes.summary import router as summary_router
from src.api.routes.clients import router as clients_router
from src.api.routes.projects import router as projects_router
from src.api.routes.onedrive import router as onedrive_router
from src.vector_store.chroma import VectorStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    vector_store = VectorStore()
    set_vector_store(vector_store)
    yield


app = FastAPI(
    title="JonathanSimpson AI Platform",
    description="AI-powered Private Equity workflow automation",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router, prefix="/api/documents", tags=["documents"])
app.include_router(agents_router, prefix="/api/agents", tags=["agents"])
app.include_router(summary_router, prefix="/api/summary", tags=["summary"])
app.include_router(clients_router, prefix="/api/clients", tags=["clients"])
app.include_router(projects_router, prefix="/api/projects", tags=["projects"])
app.include_router(onedrive_router, prefix="/api/onedrive", tags=["onedrive"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/api/eval/results")
async def eval_results():
    """Return eval results JSON."""
    result_file = Path("scripts/eval_results.json")
    if not result_file.exists():
        return {"error": "No eval results found"}
    return json.loads(result_file.read_text())
