import json
from fastapi import APIRouter
from app.config import get_settings
from fastapi.responses import StreamingResponse
from app.schemas import ChatRequest
from app.schemas import IngestResponse
from app.rag.retriever import retrieve
from app.rag.ingest import ingest_papers
from app.rag.generate import stream_answer

router = APIRouter()
settings = get_settings()

def _sse(event, data): return f"event: {event}\ndata: {json.dumps(data)}\n\n"

@router.post("/chat")
async def chat(chat_request: ChatRequest):
    def gen():
        sources = retrieve(chat_request.message)
        yield _sse(
            "sources",
            {"sources": [source.model_dump() for source in sources]},
        )
        for text in stream_answer(
            message=chat_request.message,
            history=chat_request.history,
            sources=sources,
        ):
            yield _sse("token", {"text": text})
        yield _sse("done", {})
    return StreamingResponse(gen(), media_type="text/event-stream")

@router.post("/ingest")
async def ingest():
    files, chunks = ingest_papers()
    return IngestResponse(
        files_processed=files,
        chunks_added=chunks,
        collection=get_settings().chroma_collection,
    )