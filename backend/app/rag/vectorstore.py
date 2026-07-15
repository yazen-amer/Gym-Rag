"""Chroma vector store backed by Cohere embeddings."""

from __future__ import annotations

from functools import lru_cache

from langchain_chroma import Chroma
from langchain_cohere import CohereEmbeddings

from app.config import get_settings


@lru_cache
def get_embeddings() -> CohereEmbeddings:
    settings = get_settings()
    return CohereEmbeddings(
        model=settings.embed_model,
        cohere_api_key=settings.cohere_api_key,
    )


@lru_cache
def get_vectorstore() -> Chroma:
    """Return the persistent Chroma collection.

    Cached so the collection is opened once per process. Ingestion and
    retrieval share the same instance.
    """
    settings = get_settings()
    settings.chroma_path.mkdir(parents=True, exist_ok=True)
    return Chroma(
        collection_name=settings.chroma_collection,
        embedding_function=get_embeddings(),
        persist_directory=str(settings.chroma_path),
    )
