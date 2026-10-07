import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from langchain_core.documents import Document
from app.rag.ingest import ingest_papers


class IngestionTests(unittest.TestCase):
    def test_repeated_ingestion_uses_stable_ids_and_page_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "Paper.pdf").touch()
            settings = SimpleNamespace(papers_dir=Path(directory), chunk_size=1000, chunk_overlap=150)
            # In-memory upsert mirrors Chroma's behavior while keeping provider calls offline.
            stored = {}
            class Store:
                def add_documents(self, documents, ids):
                    stored.update(zip(ids, documents))
            with patch("app.rag.ingest.settings", settings), patch("app.rag.ingest.get_vectorstore", return_value=Store()), patch(
                "app.rag.ingest.PyPDFLoader") as loader, patch("app.rag.ingest.time.sleep"):
                loader.return_value.load.side_effect = lambda: [Document(page_content="Research evidence", metadata={"page": 0})]
                self.assertEqual(ingest_papers(), (1, 1))
                first_ids = list(stored)
                self.assertEqual(ingest_papers(), (1, 1))
            self.assertEqual(list(stored), first_ids)
            self.assertEqual(len(stored), 1)
            self.assertEqual(next(iter(stored.values())).metadata["page"], 1)
