"""Application settings, loaded from environment / .env."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/ directory — resolves data paths relative to it regardless of CWD.
BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Anthropic
    anthropic_api_key: str = ""
    chat_model: str = "claude-opus-4-8"

    # Cohere
    cohere_api_key: str = ""
    embed_model: str = "embed-english-v3.0"
    rerank_model: str = "rerank-english-v3.0"

    # Retrieval
    retrieval_k: int = 20
    rerank_top_n: int = 5
    use_rerank: bool = True

    # Storage
    papers_dir: str = "data/papers"
    chroma_dir: str = "data/chroma"
    chroma_collection: str = "gym_papers"

    # Chunking
    chunk_size: int = 1000
    chunk_overlap: int = 150

    # CORS
    cors_origins: str = "http://localhost:5173"

    @property
    def papers_path(self) -> Path:
        return (BACKEND_ROOT / self.papers_dir).resolve()

    @property
    def chroma_path(self) -> Path:
        return (BACKEND_ROOT / self.chroma_dir).resolve()

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
