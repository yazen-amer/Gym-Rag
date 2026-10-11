import os
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.config import get_settings
from app.schemas import ChatRequest, IngestResponse
from app.rag.retriever import retrieve
from app.rag.ingest import ingest_papers
from app.rag.generate import stream_answer

router = APIRouter()
logger = logging.getLogger(__name__)


def _sse(event, data):
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/chat")
def chat(chat_request: ChatRequest):
    settings = get_settings()
    if not settings.gemini_api_key or not settings.cohere_api_key:
        raise HTTPException(503, "Chat is not configured. Set GEMINI_API_KEY and COHERE_API_KEY on the backend.")

    def gen():
        try:
            sources = retrieve(chat_request.message)
            if not sources:
                yield _sse("error", {"message": "No research has been indexed. Ingest the papers before chatting."})
                return
            yield _sse("sources", {"sources": [source.model_dump() for source in sources]})
            for text in stream_answer(
                message=chat_request.message,
                history=chat_request.history,
                sources=sources,
            ):
                yield _sse("token", {"text": text})
            yield _sse("done", {})
        except Exception:
            logger.exception("Chat retrieval or generation failed")
            yield _sse("error", {"message": "The research or AI service is unavailable. Please try again shortly."})

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@router.post("/ingest")
def ingest():
    if os.getenv("DISABLE_INGEST") == "true":
        raise HTTPException(403, "Public ingestion is disabled on this deployment.")
    if not get_settings().cohere_api_key:
        raise HTTPException(503, "Ingestion requires COHERE_API_KEY on the backend.")
    files, chunks = ingest_papers()
    return IngestResponse(
        files_processed=files,
        chunks_added=chunks,
        collection=get_settings().chroma_collection,
    )
