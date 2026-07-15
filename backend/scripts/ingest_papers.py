"""CLI: index the PDFs in the papers directory.

Usage:
    uv run python -m scripts.ingest_papers
"""

from __future__ import annotations

from app.config import get_settings
from app.rag.ingest import ingest_papers


def main() -> None:
    settings = get_settings()
    print(f"Ingesting PDFs from {settings.papers_path} ...")
    files, chunks = ingest_papers()
    if files == 0:
        print("No PDFs found. Drop research papers into the papers directory first.")
        return
    print(f"Processed {files} file(s), added {chunks} chunk(s) "
          f"to collection '{settings.chroma_collection}'.")


if __name__ == "__main__":
    main()
