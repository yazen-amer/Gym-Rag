# GymRAG — Backend

FastAPI service that answers gym / exercise-science questions using RAG over
research papers. Retrieval is powered by Chroma + Cohere embeddings, results are
reranked with Cohere Rerank, and answers are generated (with streaming inline
citations) by Claude.

## Stack

- **[uv](https://docs.astral.sh/uv/)** — Python packaging & runner
- **FastAPI** — HTTP + Server-Sent Events streaming
- **LangChain** — document loading, chunking, Chroma integration
- **Chroma** — local persistent vector store
- **Cohere** — embeddings (`embed-english-v3.0`) + reranking (`rerank-english-v3.0`)
- **Anthropic** — answer generation (`claude-opus-4-8` by default)

## Setup

```bash
cd backend
uv sync                      # create venv + install deps from pyproject
cp .env.example .env         # then fill in ANTHROPIC_API_KEY and COHERE_API_KEY
```

## Ingest papers

Drop PDF research papers into `data/papers/`, then build the index:

```bash
uv run python -m scripts.ingest_papers
```

You can also trigger ingestion over HTTP: `POST /api/ingest`.

## Run the API

```bash
uv run uvicorn app.main:app --reload --port 8000
```

- `GET  /health` — liveness check
- `POST /api/chat` — streaming chat (SSE). Body: `{ "message": str, "history": [{role, content}] }`
- `POST /api/ingest` — (re)index the papers directory

### Chat SSE protocol

The `/api/chat` response is a text/event-stream with three event types:

| event     | payload                                   |
| --------- | ----------------------------------------- |
| `sources` | `{ "sources": [{id, title, page, snippet, score}] }` |
| `token`   | `{ "text": "..." }` — one answer delta    |
| `done`    | `{}`                                       |

## Layout

```
app/
  main.py            FastAPI app + CORS
  config.py          Settings (pydantic-settings, .env)
  schemas.py         Request/response models
  api/routes.py      /chat (SSE) + /ingest
  rag/
    vectorstore.py   Chroma + Cohere embeddings
    ingest.py        PDF -> chunks -> Chroma
    retriever.py     vector search + Cohere rerank
    generate.py      prompt build + Claude streaming
scripts/
  ingest_papers.py   CLI wrapper around ingest
data/
  papers/            drop PDFs here
  chroma/            persisted vector store
```
