"""FastAPI application for PE AI Engineering API."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from src.api.deps import set_vector_store
from src.api.routes.agents import router as agents_router
from src.api.routes.documents import router as documents_router
from src.vector_store.chroma import VectorStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    vector_store = VectorStore()
    set_vector_store(vector_store)
    yield
    # Cleanup


app = FastAPI(
    title="PE AI Engineering API",
    description="AI-powered Private Equity workflow automation with RAG and multi-agent systems",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware — allow_credentials=False because allow_origins=["*"]
# violates the CORS spec when credentials=True (browsers reject it).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(documents_router, prefix="/api/documents", tags=["documents"])
app.include_router(agents_router, prefix="/api/agents", tags=["agents"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "PE AI Engineering API",
        "version": "0.1.0",
        "description": "AI-powered Private Equity workflow automation",
        "docs": "/docs",
    }
