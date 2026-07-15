# GymRAG

A RAG-based gym & exercise-science chatbot. Drop strength-and-conditioning
research papers into the backend, and the app answers training / nutrition /
recovery questions grounded in those papers — with a ChatGPT-style streaming UI
and inline citations.

## Architecture

```
                 ┌─────────────────────────────┐
   Browser  ───▶ │  Frontend (Vite + React)    │
   :5173         │  ChatGPT-style streaming UI │
                 └──────────────┬──────────────┘
                                │  POST /api/chat (SSE)
                                ▼
                 ┌─────────────────────────────┐
                 │  Backend (FastAPI + uv)     │
                 │                             │
   PDFs ──ingest▶│  1. Chroma vector search    │  Cohere embeddings
                 │  2. Cohere rerank           │  Cohere Rerank
                 │  3. Claude answer (stream)  │  Anthropic
                 └─────────────────────────────┘
```

**Retrieval flow:** a question is embedded and matched against chunked papers in
Chroma (top `RETRIEVAL_K`), the candidates are reranked by Cohere Rerank down to
`RERANK_TOP_N`, and those excerpts are passed to Claude, which streams a grounded
answer with inline `[n]` citations.

## Tech

| Layer     | Choices                                                             |
| --------- | ------------------------------------------------------------------- |
| Backend   | uv, Python 3.11, FastAPI, LangChain, Chroma, Cohere, Anthropic       |
| Frontend  | Vite, React, TypeScript, Tailwind CSS v4                             |
| Streaming | Server-Sent Events (`sources` → `token`… → `done`)                   |

## Quick start

**1. Backend**

```bash
cd backend
uv sync
cp .env.example .env          # add ANTHROPIC_API_KEY and COHERE_API_KEY
# add some PDFs to data/papers/, then:
uv run python -m scripts.ingest_papers
uv run uvicorn app.main:app --reload --port 8000
```

**2. Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

See [`backend/README.md`](backend/README.md) and
[`frontend/README.md`](frontend/README.md) for details.

## What's scaffolded vs. next steps

This is working scaffolding — the full retrieve → rerank → generate loop and a
streaming chat UI are wired end to end. Natural next steps:

- **Persistence:** conversations are in-memory (per browser session) only.
- **Auth / rate limiting** before any public deployment.
- **Citation linking:** map `[n]` markers in the answer to the sources panel.
- **Ingestion UX:** upload PDFs from the UI instead of the CLI.
- **Eval harness:** measure retrieval quality as the paper corpus grows.
