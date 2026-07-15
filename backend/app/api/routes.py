"""HTTP routes: streaming chat + paper ingestion."""

from __future__ import annotations

import json
from collections.abc import Iterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.rag.generate import stream_answer
from app.rag.ingest import ingest_papers
from app.rag.retriever import retrieve
from app.schemas import ChatRequest, IngestResponse

router = APIRouter()


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    """Stream a grounded answer as Server-Sent Events.

    Emits a ``sources`` event first (so the UI can render citations), then a
    series of ``token`` events, then a terminal ``done`` event.
    """

    def event_stream() -> Iterator[str]:
        sources = retrieve(req.message)
        yield _sse("sources", {"sources": [s.model_dump() for s in sources]})
        for delta in stream_answer(req.message, req.history, sources):
            yield _sse("token", {"text": delta})
        yield _sse("done", {})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/ingest", response_model=IngestResponse)
def ingest() -> IngestResponse:
    """Index every PDF currently in the papers directory."""
    from app.config import get_settings

    files, chunks = ingest_papers()
    return IngestResponse(
        files_processed=files,
        chunks_added=chunks,
        collection=get_settings().chroma_collection,
    )
