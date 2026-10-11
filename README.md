# GymRAG

A chat app for asking strength-training questions against a small collection of research PDFs. Answers stream into the React interface with numbered references, paper titles, page numbers, and the retrieved excerpts.

The backend is Python/FastAPI with Chroma for storage, Cohere for embeddings and optional reranking, and Gemini for answer generation. The frontend uses React, TypeScript, and Vite.

## Screenshots

Captured locally on October 11, 2026, with real Cohere retrieval/reranking and Gemini `gemini-3.1-flash-lite` responses. The existing index contains 622 chunks from the repository's seven PDFs. These are actual responses, not mock answers; the expired Railway deployment remains offline.

**Protein intake, with numbered research citations:**

![Protein question and generated answer](docs/screenshots/gymrag-protein-answer.jpg)

**Rest intervals, with a second generated answer:**

![Rest interval question and generated answer](docs/screenshots/gymrag-rest-answer.jpg)

**Retrieved paper titles, pages, and excerpts:**

![Research sources for the rest interval answer](docs/screenshots/gymrag-sources.jpg)

## From PDFs to an answer

The ingestion script loads PDFs page by page and splits the text into 1,000-character chunks with 150 characters of overlap. Each chunk keeps its paper title and a one-based page number, so the interface can show where an excerpt came from. Content-based chunk IDs prevent unchanged papers from being inserted twice.

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

This checks paper-level retrieval on a small hand-written set. It does not measure citation correctness or answer quality. There are no saved before/after results in the repository.

## Tests and hosting

```bash
cd backend
uv run python -m unittest discover -s tests -v
cd ../frontend
npm test
npm run build
```

API tests replace the provider calls and do not need paid keys. Frontend tests cover stream parsing, errors, cancellation, late callbacks, and backend URL routing. All 8 backend and 23 frontend tests pass; the production build passes.

For a hosted frontend, set `VITE_API_URL` to the backend origin, for example `https://your-backend.example.com`, before building. The client adds `/api/chat`; an existing `/api` suffix is accepted without duplication. Use `/api` only when your host reverse-proxies that path to FastAPI. Set backend `CORS_ORIGINS` to the frontend's exact origin and keep `CHROMA_DIR` on persistent storage. `/health` checks process liveness; it does not check provider credentials or index readiness.

## What caused the hosted 404

The deployed frontend had `VITE_API_URL=gym-rag-production.up.railway.app`, without `https://` or `/api`. The browser treated it as a path on Vercel and posted to `/gym-rag-production.up.railway.app/chat`, which returned 404. The client now normalizes backend origins and bare hostnames to the correct `/api/chat` route. Twelve routing regressions cover origins, existing API paths, localhost, relative proxies, and invalid configurations; eight failed before the correction.

There is also a hosting problem: the old Railway backend returns "Application not found" because the trial expired. Fixing the frontend URL cannot restart that service. Restore a backend, set `VITE_API_URL` to its current URL, set `CORS_ORIGINS` to the frontend origin, and rebuild/redeploy the frontend. The screenshots above use the local backend and real provider calls, not the expired deployment.

The old `.envexample` selected `gemini-2.5-flash`, which returned a provider 404 for this account. The example and default now select `gemini-3.1-flash-lite`, verified with real answers. Set `CHAT_MODEL` to an available model for your account if necessary; model availability and capacity can change.

## Limits

The corpus contains seven PDFs, so many questions will fall outside its coverage. The generation prompt asks for supported answers, but citations alone do not guarantee that an answer accurately represents a paper.

Reingesting an edited or removed paper does not delete its previous chunks. Rebuild the collection when replacing the corpus. Embedding, reranking, and generation also depend on external APIs.
