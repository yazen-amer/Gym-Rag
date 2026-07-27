from app.rag.vectorstore import get_vectorstore
from app.config import get_settings
from app.schemas import Source
from functools import lru_cache
import cohere

settings = get_settings()

@lru_cache
def get_cohere_client():
    return cohere.Client(
        api_key=settings.cohere_api_key
    )

def retrieve(query: str) -> list[Source]:
    sources = []

    docs = get_vectorstore().similarity_search(
        query,
        k=settings.retrieval_k,
    )

    if not docs:
        return sources

    if settings.use_rerank:

        client = get_cohere_client()

        rerank_response = client.rerank(
            model=settings.rerank_model,
            query=query,
            documents=[document.page_content for document in docs],
            top_n=min(settings.rerank_top_n, len(docs)),
        )

        for i, result in enumerate(rerank_response.results):
            document = docs[result.index]

            sources.append(
                Source(
                    id=i + 1,
                    title=document.metadata["title"],
                    page=document.metadata["page"],
                    snippet=document.page_content,
                    score=result.relevance_score,
                )
            )

    else:
        docs = docs[:settings.rerank_top_n]

        for i, document in enumerate(docs):
            sources.append(
                Source(
                    id=i + 1,
                    title=document.metadata["title"],
                    page=document.metadata["page"],
                    snippet=document.page_content,
                    score=None,
                )
            )

    return sources