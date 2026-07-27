from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from functools import lru_cache

class Settings(BaseSettings):
        backend_dir: Path = Path(__file__).resolve().parent.parent

        gemini_api_key: str = Field(default="")
        chat_model: str = Field(default="gemini-3.5-flash")
        cohere_api_key: str = Field(default="")
        embed_model: str = Field(default="embed-english-v3.0")
        rerank_model: str = Field(default="rerank-english-v3.0")
        retrieval_k: int = Field(default=20)
        rerank_top_n: int = Field(default=5)
        use_rerank: bool = Field(default=True)
        papers_dir: Path = Field(default=backend_dir / "data" / "papers")
        chroma_dir: Path = Field(default=backend_dir / "data" / "chroma")
        chroma_collection: str = Field(default="gym_papers")
        chunk_size: int = Field(default=1000)
        chunk_overlap: int = Field(default=150)
        cors_origins: str = Field(default="http://localhost:5173")

        model_config = SettingsConfigDict(
                env_file=".env",
                extra="ignore",
            )

@lru_cache
def get_settings() -> Settings:
        return Settings()