"""Load research-paper PDFs, chunk them, and index into Chroma."""

from __future__ import annotations

from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings
from app.rag.vectorstore import get_vectorstore


def _load_pdf(path: Path) -> list[Document]:
    """Load a single PDF into per-page Documents, tagging useful metadata."""
    docs = PyPDFLoader(str(path)).load()
    for d in docs:
        d.metadata["title"] = path.stem
        d.metadata["source"] = path.name
        # PyPDFLoader pages are 0-indexed; make it human-friendly.
        if "page" in d.metadata:
            d.metadata["page"] = int(d.metadata["page"]) + 1
    return docs


def ingest_papers(papers_dir: Path | None = None) -> tuple[int, int]:
    """Index every PDF under ``papers_dir`` into the vector store.

    Returns ``(files_processed, chunks_added)``.
    """
    settings = get_settings()
    papers_dir = papers_dir or settings.papers_path
    papers_dir.mkdir(parents=True, exist_ok=True)

    pdf_paths = sorted(papers_dir.glob("*.pdf"))
    if not pdf_paths:
        return 0, 0

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        add_start_index=True,
    )

    all_chunks: list[Document] = []
    for path in pdf_paths:
        pages = _load_pdf(path)
        all_chunks.extend(splitter.split_documents(pages))

    if all_chunks:
        get_vectorstore().add_documents(all_chunks)

    return len(pdf_paths), len(all_chunks)
