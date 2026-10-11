# GymRAG

[Live app](https://gymrag.onrender.com/) Â· Free Render hosting; the first request after inactivity can take about a minute.

Ask strength-training questions using seven research PDFs. Answers stream into the chat with citations. You can expand each answerÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢s sources to see paper titles, page numbers, and excerpts.

Built with React, TypeScript, and Vite, with a Python/FastAPI backend. Chroma stores the research index, Cohere handles embeddings and optional reranking, and Gemini generates answers.

## Screenshots

**Answer from the public Render deployment, October 11, 2026:**

![Live GymRAG answer](docs/screenshots/gymrag-live-answer.jpg)

Local screenshots from October 11, 2026, using Cohere retrieval/reranking and Gemini `gemini-3.1-flash-lite`. The index contains 622 chunks from the seven PDFs. The Railway deployment is offline after its trial expired.

**Protein intake, with numbered research citations:**

![Protein question and generated answer](docs/screenshots/gymrag-protein-answer.jpg)

**Rest intervals, with a second generated answer:**

![Rest interval question and generated answer](docs/screenshots/gymrag-rest-answer.jpg)

**Retrieved paper titles, pages, and excerpts:**

![Research sources for the rest interval answer](docs/screenshots/gymrag-sources.jpg)

## How it works

The ingestion script loads PDFs page by page and splits the text into 1,000-character chunks with 150 characters of overlap. Each chunk keeps the paper title and page number, starting at page 1. Content-based chunk IDs prevent unchanged papers from being inserted twice.

For each question, the retriever gets 20 candidate chunks from Chroma. It either keeps the first five or asks Cohere to rerank the candidates and return five. Gemini receives those excerpts along with the conversation history and instructions to cite them. The API sends separate server-sent events for sources, answer tokens, completion, and errors.

The code defaults to reranking off; `backend/.envexample` enables it. An empty collection returns an error before answer generation.

## Run locally

Use the pinned Python 3.11 runtime, Node 24, and [uv](https://docs.astral.sh/uv/). From the repository root:

```bash
cd backend
uv sync --locked
cp .envexample .env
# Add GEMINI_API_KEY and COHERE_API_KEY to .env.
uv run python -m scripts.ingest_papers
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

On PowerShell, use `Copy-Item .envexample .env` for the copy step. Open the URL printed by Vite; its dev server proxies `/api` to `127.0.0.1:8000`. Ingestion makes provider calls and includes pauses between PDFs.

## Retrieval evaluation

`backend/eval/cases.json` contains 25 questions with expected paper titles. The evaluation counts a question as a hit when at least one expected paper appears among the returned sources:

```bash
cd backend
uv run python -m eval.run_eval
```

To compare reranking, run once with `USE_RERANK=false` and once with `USE_RERANK=true`, keeping the corpus, embedding model, `RETRIEVAL_K=20`, and `RERANK_TOP_N=5` fixed. Start a new process after changing settings.

This measures whether retrieval finds an expected paper, not whether the answer or citations are correct. No before/after evaluation results are saved in the repo.

## Tests and hosting

```bash
cd backend
uv run python -m unittest discover -s tests -v
cd ../frontend
npm test
npm run build
```

API tests replace the provider calls and do not need paid keys. Frontend tests cover stream parsing, errors, cancellation, late callbacks, and backend URL routing. All 10 backend and 23 frontend tests pass; the production build passes.

For a hosted frontend, set `VITE_API_URL` to the backend origin, for example `https://your-backend.example.com`, before building. The client adds `/api/chat`; an existing `/api` suffix is accepted without duplication. Use `/api` only when your host reverse-proxies that path to FastAPI. Set backend `CORS_ORIGINS` to the frontend's exact origin and keep `CHROMA_DIR` on persistent storage. `/health` checks process liveness; it does not check provider credentials or index readiness.

## What caused the hosted 404

The deployed frontend had `VITE_API_URL=gym-rag-production.up.railway.app`, without `https://` or `/api`. The browser treated it as a path on Vercel and posted to `/gym-rag-production.up.railway.app/chat`, which returned 404. The client now normalizes backend origins and bare hostnames to the correct `/api/chat` route. The fix has 12 routing tests covering backend origins, API paths, localhost, relative proxies, and invalid URLs. Eight failed before the fix.

The old Railway backend also returns "Application not found" after the trial expired. The app now runs on Render, with the frontend and API on the same origin. The other screenshots were captured locally before deployment. For a separate frontend, configure the backend URL and CORS before rebuilding.

The old `.envexample` selected `gemini-2.5-flash`, which returned a provider 404 for this account. The example and default now select `gemini-3.1-flash-lite`, verified with real answers. Set `CHAT_MODEL` to an available model for your account if necessary; model availability and capacity can change.

## Limits

The seven PDFs only cover a limited set of questions. Answers can still misread the research, even when they include citations.

Reingesting an edited or removed paper does not delete its previous chunks. Rebuild the collection when replacing the corpus. Embedding, reranking, and generation also depend on external APIs.

## Free Render deployment

`render.yaml` defines a free Python service that builds and serves the frontend alongside the API. Set `GEMINI_API_KEY` and `COHERE_API_KEY` as Render secrets. The frontend uses `/api` on the same origin.

Startup restores the bundled 622-chunk index without embedding calls. See [the snapshot notes](backend/deployment/README.md). Public ingestion is disabled with `DISABLE_INGEST=true`; `SERVE_FRONTEND=true` enables frontend serving. Chat still uses provider quotas. Live checks confirmed the page, API health, retrieval, and a completed cited answer; the first question received a temporary Gemini 503 before a second question succeeded. Render's free service sleeps when idle, so the first request can take longer.
