"""Application configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # LLM Configuration
    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-chat"
    deepseek_temperature: float = 0.0

    # Vector Store Configuration
    chroma_persist_directory: str = "./data/chroma"
    chroma_collection_name: str = "pe_documents"
    embedding_model: str = "text-embedding-3-small"

    # Application Configuration
    log_level: str = "INFO"
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 4


settings = Settings()
