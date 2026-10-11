"""Restore the bundled public-paper index on ephemeral hosting; no provider calls."""
import gzip
import json
from pathlib import Path
import chromadb
from app.config import get_settings


def restore(collection, snapshot):
    existing = set(collection.get(include=[])['ids'])
    pending = [i for i, key in enumerate(snapshot['ids']) if key not in existing]
    for start in range(0, len(pending), 100):
        batch = pending[start:start + 100]
        collection.upsert(**{key: [snapshot[key][i] for i in batch]
            for key in ('ids', 'embeddings', 'documents', 'metadatas')})
    return len(pending)


def main():
    settings = get_settings()
    path = Path(__file__).resolve().parent.parent / 'deployment/index.json.gz'
    with gzip.open(path, 'rt', encoding='utf-8') as handle:
        snapshot = json.load(handle)
    if snapshot['embedding_model'] != settings.embed_model:
        raise ValueError('Bundled index requires ' + snapshot['embedding_model'])
    collection = chromadb.PersistentClient(path=str(settings.chroma_dir)).get_or_create_collection(settings.chroma_collection)
    print(f'Restored {restore(collection, snapshot)} research chunks; total {collection.count()}')


if __name__ == '__main__':
    main()
