"""Retrieve relevant chunks: vector search, then optional Cohere rerank."""

from __future__ import annotations

from functools import lru_cache

import cohere
from langchain_core.documents import Document

from app.config import get_settings
from app.rag.vectorstore import get_vectorstore
from app.schemas import Source


@lru_cache
def _cohere_client() -> cohere.Client:
    return cohere.Client(api_key=get_settings().cohere_api_key)


def _rerank(query: str, docs: list[Document], top_n: int) -> list[tuple[Document, float]]:
    """Reorder ``docs`` by Cohere relevance, returning the top ``top_n``."""
    settings = get_settings()
    if not docs:
        return []
    results = _cohere_client().rerank(
        model=settings.rerank_model,
        query=query,
        documents=[d.page_content for d in docs],
        top_n=min(top_n, len(docs)),
    )
    return [(docs[r.index], r.relevance_score) for r in results.results]


def retrieve(query: str) -> list[Source]:
    """Return the most relevant chunks for ``query`` as ``Source`` objects.

    Pulls ``retrieval_k`` candidates by vector similarity, then (if enabled)
    reranks with Cohere down to ``rerank_top_n``.
    """
    settings = get_settings()
    candidates = get_vectorstore().similarity_search(query, k=settings.retrieval_k)

    if settings.use_rerank and candidates:
        ranked = _rerank(query, candidates, settings.rerank_top_n)
    else:
        ranked = [(d, None) for d in candidates[: settings.rerank_top_n]]

    sources: list[Source] = []
    for i, (doc, score) in enumerate(ranked, start=1):
        sources.append(
            Source(
                id=i,
                title=doc.metadata.get("title", doc.metadata.get("source", "unknown")),
                page=doc.metadata.get("page"),
                snippet=doc.page_content,
                score=score,
            )
        )
    return sources
