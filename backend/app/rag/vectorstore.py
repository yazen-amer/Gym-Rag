from functools import lru_cache
from langchain_cohere import CohereEmbeddings
from langchain_chroma import Chroma
from app.config import get_settings

settings = get_settings()

@lru_cache
def get_embeddings():
    embeddings = CohereEmbeddings(
        cohere_api_key=settings.cohere_api_key,
        model=settings.embed_model,
    )
    return embeddings

@lru_cache
def get_vectorstore():
    collection_name = settings.chroma_collection
    embedding_function = get_embeddings()
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    vector_store = Chroma(
        collection_name = collection_name,
        embedding_function = embedding_function,
        persist_directory = settings.chroma_dir,
    )
    return vector_store