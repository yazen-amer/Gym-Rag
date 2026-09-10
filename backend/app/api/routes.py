import json
import shutil
from pathlib import Path
from fastapi import UploadFile, File, HTTPException
from app.rag.ingest import ingest_single_pdf  # add alongside existing ingest_papers import
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

@router.post("/upload", response_model=IngestResponse)
async def upload_pdf(file: UploadFile = File(...)):
    if Path(file.filename).suffix.lower() not in ALLOWED_EXT:
        raise HTTPException(400, "Only PDF files are supported")

    settings.papers_dir.mkdir(parents=True, exist_ok=True)
    dest = settings.papers_dir / file.filename

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    chunks = ingest_single_pdf(dest)
    return IngestResponse(
        files_processed=1,
        chunks_added=chunks,
        collection=settings.chroma_collection,
    )