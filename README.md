# GymRAG

An evidence-based strength and conditioning assistant that retrieves research-paper excerpts and streams answers with citations. The backend uses FastAPI, Chroma, Cohere embeddings/optional reranking, and Gemini; the frontend uses React and Vite.

## Local setup

Python 3.11+ and Node 24 are recommended. Install [uv](https://docs.astral.sh/uv/).

```bash
cd backend
uv sync --locked
cp .envexample .env
# Set GEMINI_API_KEY and COHERE_API_KEY in .env.
uv run python -m scripts.ingest_papers
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the URL Vite prints. The dev server proxies `/api` to port 8000. Check backend liveness at `/health`; chat uses `POST /api/chat` with `{"message":"How much protein?","history":[]}` and returns SSE `sources`, `token`, and `done` events, or an `error` event if retrieval/generation fails.

Ingest the papers before chatting. An empty index returns a clear error instead of generating unsupported answers. Reingesting unchanged papers uses stable chunk IDs rather than creating duplicate records. This does not remove old records from earlier ingestions or delete superseded chunks after editing a paper; rebuild the collection deliberately when replacing the corpus.

## Deployment

Set **VITE_API_URL** in the frontend hosting environment to the reachable backend URL **including `/api`**, then rebuild. Example: `https://your-backend.example.com/api`. The old hardcoded Railway proxy pointed to an unavailable application and has been removed. Production builds report a missing API URL before sending a chat request.

On the backend, configure `GEMINI_API_KEY`, `COHERE_API_KEY`, and `CORS_ORIGINS` (the frontend's exact origin). Keep `CHROMA_DIR` on a persistent volume and ingest the corpus there. A successful `/health` response confirms the process is alive; it does not prove provider keys or the research index are ready.

## Tests

```bash
cd backend
uv run python -m unittest discover -s tests -v
cd ../frontend
npm test
npm run build
```

API tests use the real FastAPI app with provider boundaries replaced, so they need no paid API keys. Frontend tests cover successful/error/truncated streams, cancellation, API URL configuration, and late callbacks.
