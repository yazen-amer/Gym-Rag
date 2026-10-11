# Bundled research index

`index.json.gz` contains 622 chunks from the seven PDFs in `data/papers`, with their existing Cohere `embed-english-v3.0` embeddings. It was exported from the working local index on October 11, 2026. Metadata is limited to paper title, page, and chunk start position; local paths and credentials are excluded.

`python -m scripts.restore_index` restores missing chunks in batches of 100 without calling an embedding provider. Existing IDs are left alone. This lets free hosting restart without re-embedding the papers. Regenerate the snapshot when changing the corpus or embedding model.
