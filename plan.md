# GymRAG — Implementation Plan

Welcome! This repo is scaffolding for a project you're going to build yourself:
**a RAG (Retrieval-Augmented Generation) chatbot for gym & exercise science.**

You'll drop real research papers (PDFs) into the backend, index them into a
vector database, and build a ChatGPT-style chat UI where every answer is
**grounded in those papers** — streamed token-by-token, with inline citations
like `[1]` that map to the exact paper and page the claim came from.

By the end you'll have hands-on experience with:

| Tool | What you'll learn |
| --- | --- |
| **uv** | Modern Python packaging: virtualenvs, lockfiles, `uv add`, `uv run` |
| **FastAPI** | Building a typed HTTP API, Pydantic models, streaming responses |
| **LangChain** | PDF loading, text chunking, vector-store integrations |
| **Chroma** | A local, persistent vector database |
| **Cohere** | Text embeddings + a reranker model (two different APIs) |
| **Google Gemini** | Prompt design, grounding, streaming completions |
| **Server-Sent Events** | Streaming data from a server to a browser over plain HTTP |
| **React + TypeScript** | Hooks, component design, typed API clients |
| **Tailwind CSS v4** | Utility-first styling |

The plan is broken into **phases**, each with a goal, detailed steps, hints,
gotchas, and a ✅ checkpoint so you know you're done before moving on. Don't
skip checkpoints — every phase builds on the last one.

---

## The big picture

```
                 ┌─────────────────────────────┐
   Browser  ───▶ │  Frontend (Vite + React)    │
   :5173         │  ChatGPT-style streaming UI │
                 └──────────────┬──────────────┘
                                │  POST /api/chat  (Server-Sent Events)
                                ▼
                 ┌─────────────────────────────┐
                 │  Backend (FastAPI + uv)     │
                 │                             │
   PDFs ──ingest▶│  1. Chroma vector search    │  ← Cohere embeddings
                 │  2. Cohere rerank           │  ← Cohere Rerank API
                 │  3. Gemini answer (stream)  │  ← Google Gemini API
                 └─────────────────────────────┘
```

**What is RAG, in one paragraph?** Large language models are great writers but
they hallucinate facts and don't know your documents. RAG fixes both: before
answering, you *retrieve* the most relevant snippets from your own document
collection and paste them into the prompt, then instruct the model to answer
*only* from those snippets and cite them. Your pipeline is:
**question → embed → vector search (broad) → rerank (precise) → prompt Gemini with the top snippets → stream the answer**.

**Why two retrieval steps?** Vector similarity search is fast but fuzzy — it
finds things that are *about the same topic*. A reranker is a slower, smarter
model that reads the actual question + each candidate passage and scores true
relevance. The standard pattern is: pull a wide net with vector search
(top ~20), then let the reranker pick the best few (top ~5). You get recall
from the first step and precision from the second.

---

## Phase 0 — Get oriented & run the scaffolding

**Goal:** both halves of the repo run on your machine.

1. Install prerequisites:
   - [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python is
     handled *by* uv — note `backend/.python-version` pins 3.11+)
   - Node.js 20+ and npm
2. Sanity-check the backend:
   ```bash
   cd backend
   uv run main.py        # uv creates .venv automatically; prints hello
   ```
   Notice what uv did: created `.venv/`, resolved `pyproject.toml`, wrote
   `uv.lock`. You never activate the venv manually — `uv run` and `uv add`
   handle it.
3. Sanity-check the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev           # open http://localhost:5173
   ```
4. Get your two API keys (both are free for this project's scale):
   - **Google Gemini** — https://aistudio.google.com/apikey (Google AI Studio;
     free tier, no credit card needed)
   - **Cohere** — https://dashboard.cohere.com → API Keys (free *trial* key;
     rate-limited but plenty for a handful of papers and dev chatting)
5. Collect 3–10 exercise-science PDFs to use as your corpus. Good sources:
   PubMed Central open-access papers, Stronger by Science references, any
   hypertrophy/periodization meta-analyses. Name the files something readable —
   the filename becomes the citation title.

✅ **Checkpoint:** backend prints hello, frontend renders the placeholder page,
you have two API keys and a folder of PDFs.

---

## Phase 1 — Backend skeleton: FastAPI + settings

**Goal:** a running API server with a health endpoint and typed, `.env`-driven
configuration.

### 1.1 Add dependencies

```bash
cd backend
uv add "fastapi>=0.115" "uvicorn[standard]" "pydantic>=2.9" "pydantic-settings" python-dotenv
```

Look at `pyproject.toml` after — `uv add` wrote the dependencies for you and
updated `uv.lock`. That lockfile is what makes installs reproducible; commit it.

### 1.2 Create the package layout

Build toward this structure (create files as each phase needs them):

```
backend/
  app/
    __init__.py
    main.py            FastAPI app + CORS          (this phase)
    config.py          Settings via pydantic-settings (this phase)
    schemas.py         Pydantic request/response models (phase 4)
    api/
      __init__.py
      routes.py        /chat and /ingest endpoints (phase 5)
    rag/
      __init__.py
      vectorstore.py   Chroma + embeddings         (phase 2)
      ingest.py        PDF → chunks → Chroma       (phase 2)
      retriever.py     search + rerank             (phase 3)
      generate.py      prompt + Gemini streaming   (phase 4)
  scripts/
    ingest_papers.py   CLI entry for ingestion     (phase 2)
  data/
    papers/            you drop PDFs here          (gitignored contents)
    chroma/            Chroma persists here        (gitignored contents)
```

The root `.gitignore` already ignores `backend/data/*` contents but keeps the
directories if you add an empty `.gitkeep` file inside each.

> The top-level `main.py` that `uv init` created is now redundant — delete it
> once `app/main.py` exists.

### 1.3 Settings (`app/config.py`)

Use `pydantic-settings` to define a `Settings` class that loads from a `.env`
file. Define these fields (with sensible defaults so the app boots without a
`.env`):

| Setting | Default | Used for |
| --- | --- | --- |
| `gemini_api_key` | `""` | Gemini |
| `chat_model` | `gemini-2.5-flash` | which Gemini model answers |
| `cohere_api_key` | `""` | embeddings + rerank |
| `embed_model` | `embed-english-v3.0` | Cohere embedding model |
| `rerank_model` | `rerank-english-v3.0` | Cohere rerank model |
| `retrieval_k` | `20` | candidates pulled from Chroma |
| `rerank_top_n` | `5` | candidates kept after rerank |
| `use_rerank` | `True` | toggle to A/B test reranking |
| `papers_dir` | `data/papers` | where PDFs live |
| `chroma_dir` | `data/chroma` | where Chroma persists |
| `chroma_collection` | `gym_papers` | Chroma collection name |
| `chunk_size` | `1000` | characters per chunk |
| `chunk_overlap` | `150` | overlap between chunks |
| `cors_origins` | `http://localhost:5173` | who may call the API |

Hints:

- `model_config = SettingsConfigDict(env_file=".env", extra="ignore")` makes it
  read `.env` automatically; env var names match field names case-insensitively
  (`GEMINI_API_KEY` → `gemini_api_key`).
- Expose a cached accessor:
  ```python
  @lru_cache
  def get_settings() -> Settings: ...
  ```
  `lru_cache` makes it a cheap singleton — you'll use this pattern again for
  API clients and the vector store.
- **Gotcha:** resolve `papers_dir`/`chroma_dir` relative to the `backend/`
  directory, not the process working directory — otherwise running from the
  repo root vs `backend/` puts data in different places. Anchor with
  `Path(__file__).resolve().parent.parent`.
- Also create a `backend/.env.example` documenting every variable (no real
  keys!), and a real `.env` with your keys (`.env` is gitignored).

### 1.4 The app (`app/main.py`)

- Create the `FastAPI(title="GymRAG API")` instance.
- Add `CORSMiddleware` allowing your `cors_origins` (parse the comma-separated
  string into a list). Without this the browser will block cross-origin calls
  in any setup that doesn't use the dev proxy.
- Add `GET /health` returning `{"status": "ok"}`.
- Run it:
  ```bash
  uv run uvicorn app.main:app --reload --port 8000
  ```

✅ **Checkpoint:** `curl http://localhost:8000/health` returns
`{"status":"ok"}`, and http://localhost:8000/docs shows FastAPI's auto-generated
Swagger UI (explore this page — it's one of FastAPI's best features).

---

## Phase 2 — Ingestion: PDFs → chunks → Chroma

**Goal:** a script that reads every PDF in `data/papers/` and indexes it into a
persistent Chroma collection using Cohere embeddings.

### 2.1 Add dependencies

```bash
uv add "langchain>=0.3" langchain-community langchain-chroma langchain-cohere "chromadb>=0.5" "cohere>=5.11" pypdf
```

### 2.2 The vector store (`app/rag/vectorstore.py`)

Two small `@lru_cache` factory functions:

- `get_embeddings()` → `CohereEmbeddings(model=..., cohere_api_key=...)` from
  `langchain_cohere`.
- `get_vectorstore()` → `Chroma(collection_name=..., embedding_function=...,
  persist_directory=...)` from `langchain_chroma`. Create the persist directory
  with `mkdir(parents=True, exist_ok=True)` first.

Why cache them? Opening a Chroma collection isn't free, and ingestion +
retrieval should share one instance per process.

### 2.3 Ingestion (`app/rag/ingest.py`)

Write `ingest_papers() -> tuple[int, int]` returning
`(files_processed, chunks_added)`:

1. Glob `*.pdf` in the papers directory (sorted, so runs are deterministic).
2. Load each PDF with `PyPDFLoader` (from `langchain_community.document_loaders`).
   It returns one `Document` per page with `page_content` + `metadata`.
3. **Enrich metadata per page** — this is what makes citations possible later:
   - `metadata["title"] = path.stem` (the filename without `.pdf`)
   - `metadata["source"] = path.name`
   - **Gotcha:** `PyPDFLoader` page numbers are 0-indexed. Add 1 so citations
     say "p.1" for the first page like a human would.
4. Split pages into chunks with `RecursiveCharacterTextSplitter` using your
   `chunk_size` / `chunk_overlap` settings and `add_start_index=True`.

   *Why these numbers?* ~1000 characters is big enough to contain a complete
   thought (a paragraph or two) but small enough that a retrieved chunk is
   mostly on-topic. The 150-char overlap prevents a sentence that straddles a
   chunk boundary from being lost to both chunks. These are tuning knobs —
   that's why they're settings, not constants.
5. `get_vectorstore().add_documents(all_chunks)` — this one call embeds every
   chunk via Cohere and writes vectors + text + metadata into Chroma.

### 2.4 The CLI script (`scripts/ingest_papers.py`)

A thin wrapper that calls `ingest_papers()` and prints the counts. Make
`scripts/` a package (empty `__init__.py`) so you can run:

```bash
uv run python -m scripts.ingest_papers
```

**Gotcha:** running as a module (`-m`) from the `backend/` directory is what
makes `from app.rag.ingest import ...` imports resolve.

### 2.5 Note on re-ingestion

The simple version re-adds all chunks each run, so ingesting twice duplicates
documents. That's acceptable for now (nuke `data/chroma/` and re-ingest when in
doubt). A dedupe strategy (stable chunk IDs from file hash + chunk index) is a
stretch goal.

✅ **Checkpoint:** the script prints something like `5 files, 342 chunks`, and
`data/chroma/` now contains files. Quick verification in a REPL:

```bash
uv run python -c "
from app.rag.vectorstore import get_vectorstore
docs = get_vectorstore().similarity_search('hypertrophy training volume', k=3)
for d in docs: print(d.metadata.get('title'), d.metadata.get('page'), d.page_content[:80])
"
```

You should see on-topic snippets. If you get an auth error, your Cohere key
isn't loading — check `.env` and that you're running from `backend/`.

---

## Phase 3 — Retrieval: vector search + Cohere rerank

**Goal:** a `retrieve(query)` function that returns the best ~5 chunks as
citation-ready objects.

### 3.1 The `Source` model (`app/schemas.py`)

Define a Pydantic model representing one retrieved chunk *as the frontend will
see it*:

```python
class Source(BaseModel):
    id: int                  # 1-based rank; the number the model cites as [1]
    title: str               # paper title (from metadata)
    page: int | None = None  # page number, if known
    snippet: str             # the chunk text
    score: float | None = None  # rerank relevance (None if rerank disabled)
```

### 3.2 The retriever (`app/rag/retriever.py`)

`retrieve(query: str) -> list[Source]`:

1. `get_vectorstore().similarity_search(query, k=settings.retrieval_k)` —
   the broad net (~20 candidates).
2. If `use_rerank` and there are candidates, call Cohere's rerank API directly
   (the `cohere` SDK, not LangChain):
   ```python
   cohere.Client(api_key=...).rerank(
       model=settings.rerank_model,
       query=query,
       documents=[d.page_content for d in docs],
       top_n=min(settings.rerank_top_n, len(docs)),
   )
   ```
   Each result has an `.index` (into the list you passed) and a
   `.relevance_score`. Map back to the original `Document`s — **don't** assume
   the results come back in input order; use `.index`.
3. If rerank is disabled, just take the first `rerank_top_n` candidates with
   `score=None`.
4. Build `Source` objects with `id` starting at **1** (the model will cite
   `[1]`, `[2]`… and humans expect 1-based).
5. Cache the Cohere client with `@lru_cache` like your other singletons.

✅ **Checkpoint:** in a REPL, `retrieve("how many sets per week for muscle growth")`
returns ~5 `Source`s with descending scores and sensible snippets. Try toggling
`USE_RERANK=false` in `.env` and compare the ordering — this is the whole point
of the reranker, see it with your own eyes.

---

## Phase 4 — Generation: grounded, streaming Gemini answers

**Goal:** a `stream_answer(...)` generator that yields the answer text
incrementally, grounded in the retrieved sources.

### 4.1 Add the SDK

```bash
uv add google-genai
```

(That's the current SDK — `from google import genai`. If you find tutorials
using `google-generativeai` / `import google.generativeai`, that's the older,
deprecated package; don't mix them.)

### 4.2 More schemas (`app/schemas.py`)

```python
class ChatTurn(BaseModel):
    role: str        # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = []   # prior turns, oldest first

class IngestResponse(BaseModel):
    files_processed: int
    chunks_added: int
    collection: str
```

The API is **stateless**: the browser holds the conversation and sends the full
history each time. This keeps the backend trivially simple (no sessions, no DB).

### 4.3 The generator (`app/rag/generate.py`)

Three pieces:

**System prompt.** Write it yourself — this is the fun part. It must cover:
- The persona (evidence-based strength & conditioning assistant).
- **Grounding rule:** answer from the provided research excerpts; cite them
  inline with their number in square brackets — `[1]`, `[2][3]`.
- **Honesty rule:** if the excerpts don't contain the answer, say so — never
  invent citations or study findings. (This single sentence is your main
  defense against hallucinated references.)
- Style: practical, concise, actionable.

**Context formatting.** Turn the `Source` list into a text block the model can
cite from:

```
[1] schoenfeld_2017_volume_meta, p.6
<snippet text>

[2] helms_2018_periodization, p.3
<snippet text>
```

Handle the empty case ("no relevant excerpts were retrieved") so the model
knows to fall back gracefully instead of citing thin air.

**Message assembly + streaming.** Build the `contents` list: prior history
turns first, then a final user message containing
`Research excerpts:\n\n{context}\n\n---\n\nQuestion: {message}`.

> Why inject context into the *user* message instead of the system prompt?
> The excerpts change every turn; the system prompt shouldn't. (This also
> plays nicely with prompt caching if you ever optimize.)

**Gotcha:** Gemini's role names differ from your API schema — the two roles
are `"user"` and `"model"` (not `"assistant"`). Map when converting history:

```python
from google import genai
from google.genai import types

@lru_cache
def _client() -> genai.Client:
    return genai.Client(api_key=get_settings().gemini_api_key)

def stream_answer(message, history, sources):
    contents = [
        types.Content(
            role="model" if t.role == "assistant" else "user",
            parts=[types.Part.from_text(text=t.content)],
        )
        for t in history
    ]
    contents.append(types.Content(
        role="user",
        parts=[types.Part.from_text(
            text=f"Research excerpts:\n\n{_format_context(sources)}\n\n---\n\nQuestion: {message}"
        )],
    ))

    for chunk in _client().models.generate_content_stream(
        model=get_settings().chat_model,   # gemini-2.5-flash
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=SYSTEM_PROMPT),
    ):
        if chunk.text:          # gotcha: chunk.text can be None on some chunks
            yield chunk.text
```

`generate_content_stream` yields chunks whose `.text` is the next slice of the
answer — exactly what you want to forward to the browser. Note the system
prompt goes in `config=` (as `system_instruction`), not in `contents`.

Model choice: `gemini-2.5-flash` is fast and comfortably inside the free tier —
the right default here. If answers feel shallow, try `gemini-2.5-pro` (smarter,
slower, tighter free-tier limits) by just changing `CHAT_MODEL` in `.env` —
that's why it's a setting.

✅ **Checkpoint:** REPL test — retrieve sources for a question, pass them to
`stream_answer`, and watch tokens print live:

```bash
uv run python -c "
from app.rag.retriever import retrieve
from app.rag.generate import stream_answer
q = 'how many sets per week should I do for hypertrophy?'
s = retrieve(q)
for t in stream_answer(q, [], s): print(t, end='', flush=True)
"
```

The answer should stream, reference your actual papers, and include `[n]`
citations.

---

## Phase 5 — The API: streaming chat over Server-Sent Events

**Goal:** `POST /api/chat` streams the whole exchange to the browser; `POST
/api/ingest` triggers indexing over HTTP.

### 5.1 Understand SSE (5 minutes, worth it)

Server-Sent Events is just a long-lived HTTP response with content type
`text/event-stream`, where each event is a text frame:

```
event: token
data: {"text": "Hello"}
\n            ← a blank line terminates each frame
```

That's the entire protocol. No WebSockets needed for one-way streaming.

### 5.2 Design your event protocol

Three event types, in this order per request:

| event | payload | when |
| --- | --- | --- |
| `sources` | `{"sources": [Source, ...]}` | once, immediately — so the UI can render citations while the answer streams |
| `token` | `{"text": "..."}` | many times, one per text delta |
| `done` | `{}` | once, at the end |

### 5.3 The routes (`app/api/routes.py`)

- Write a tiny helper: `def _sse(event, data): return f"event: {event}\ndata: {json.dumps(data)}\n\n"`.
- `POST /api/chat` takes a `ChatRequest`, returns
  `StreamingResponse(gen(), media_type="text/event-stream")` where `gen()` is a
  generator that: retrieves → yields the `sources` frame → yields a `token`
  frame per delta from `stream_answer` → yields `done`.
- `POST /api/ingest` calls `ingest_papers()` and returns an `IngestResponse`.
- Register the router in `app/main.py` with `app.include_router(router, prefix="/api")`.

**Gotcha:** because the route returns a *generator*, retrieval doesn't run
until the client starts reading the response. Any exception inside the
generator kills the stream mid-flight — for now that's fine, but it explains
what you'll see when something breaks.

✅ **Checkpoint:**

```bash
curl -N -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "optimal training frequency per muscle group?", "history": []}'
```

You should watch a `sources` frame, then a stream of `token` frames, then
`done` scroll past. (`-N` disables curl's buffering.)

---

## Phase 6 — Frontend: the chat UI

**Goal:** a ChatGPT-style interface — sidebar, message list, auto-growing
input, streaming assistant messages, collapsible sources per answer.

### 6.1 Dev proxy first

Add a proxy to `vite.config.ts` so the browser talks to a single origin (this
also sidesteps CORS entirely in dev):

```ts
server: {
  port: 5173,
  proxy: { "/api": { target: "http://localhost:8000", changeOrigin: true } },
},
```

Now `fetch("/api/chat")` from the React app hits FastAPI.

### 6.2 Types (`src/types.ts`)

Mirror the backend schemas — this is your API contract:

```ts
export interface Source {
  id: number;
  title: string;
  page: number | null;
  snippet: string;
  score: number | null;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];   // only on assistant messages
}
```

### 6.3 SSE client (`src/api/client.ts`)

Here's the interesting constraint: the browser's built-in `EventSource` API
**cannot send POST requests**, and your chat endpoint needs a JSON body. So you
parse SSE by hand off a `fetch` response stream:

1. `fetch("/api/chat", { method: "POST", body: JSON.stringify({message, history}), signal })`
   — the `AbortSignal` is what will power your Stop button.
2. Get `res.body.getReader()` and a `TextDecoder`.
3. Loop: read chunks, decode with `{ stream: true }` (**gotcha:** without this
   flag, a multi-byte UTF-8 character split across two network chunks becomes
   garbage), and append to a string buffer.
4. Frames are separated by `\n\n` — repeatedly split complete frames off the
   front of the buffer. **Gotcha:** a network chunk can contain half a frame or
   three frames; the buffer-and-split approach handles both.
5. For each frame, parse the `event:` and `data:` lines, `JSON.parse` the data,
   and dispatch to handler callbacks: `onSources`, `onToken`, `onDone`,
   `onError`.
6. Catch errors; if `err.name === "AbortError"` it was a deliberate cancel, not
   a failure — return silently.

### 6.4 Chat state hook (`src/hooks/useChat.ts`)

One custom hook owning all chat state, so components stay dumb:

- State: `messages: Message[]`, `isStreaming: boolean`, plus a
  `useRef<AbortController | null>` for cancellation.
- `send(text)`:
  1. Ignore empty text or if already streaming.
  2. Append the user message **and an empty assistant message** in one
     `setMessages` call — you'll stream into that last slot.
  3. Wire the client callbacks: `onSources` attaches sources to the last
     message; `onToken` appends text to the last message's content.
  4. **Gotcha (the classic one):** inside callbacks, always use the functional
     form `setMessages(prev => ...)` and update the *last* element
     immutably. If you close over `messages` directly you'll stream into a
     stale snapshot and messages will vanish.
- `stop()`: abort the controller, flip `isStreaming` off. The partial answer
  stays — just like ChatGPT.
- `reset()`: abort + clear messages (this is "New chat").

### 6.5 Components

Keep them small; suggested breakdown:

- **`Sidebar.tsx`** — app name, "New chat" button (calls `reset`).
- **`MessageList.tsx`** — scrollable list; renders an empty state with 3–4
  suggested prompts (clicking one calls `send`). Auto-scroll to bottom on new
  content: a `useEffect` on `messages` + `scrollIntoView` on a sentinel div.
- **`ChatMessage.tsx`** — bubble styling by role; renders `<Sources />` above
  assistant content when present; show a subtle "thinking" indicator when the
  assistant message is still empty mid-stream.
- **`Sources.tsx`** — collapsible ("N sources ▾"); each source shows
  `[id] title, p.X` and the snippet (clamped to a few lines).
- **`ChatInput.tsx`** — auto-growing `<textarea>` (reset height to `auto`, then
  set to `scrollHeight` on input), Enter to send / Shift+Enter for newline,
  button becomes a **Stop** button while `isStreaming`.

Wire it all together in `App.tsx`: `Sidebar` + main column with `MessageList` +
`ChatInput`, all driven by `useChat`.

Styling: dark theme reads best for chat (`bg-neutral-900 text-neutral-100`).
Tailwind v4 is already set up — just use utility classes; no config file needed.

✅ **Checkpoint:** with both servers running, ask a question in the browser and
see: your message appear → sources panel pop in → the answer stream in
token-by-token with `[n]` citations → Stop button works mid-stream → New chat
clears everything.

---

## Phase 7 — Polish & verify end-to-end

Run through this list deliberately:

- [ ] **Error state:** kill the backend, send a message — the UI should show a
  friendly "is the backend running?" message, not hang forever.
- [ ] **Empty corpus:** temporarily point `CHROMA_COLLECTION` at a fresh name
  and ask a question — the model should say it has no relevant excerpts rather
  than fabricating citations.
- [ ] **Grounding test:** ask something your papers definitely don't cover
  ("best marathon taper?") — verify it declines to cite rather than inventing
  `[1]`.
- [ ] **Rerank A/B:** flip `USE_RERANK` and compare answer quality on a few
  questions.
- [ ] **Multi-turn:** ask a follow-up like "and for beginners?" — history should
  make it resolve the referent correctly.
- [ ] **README:** rewrite the root `README.md` in your own words — architecture
  diagram, setup steps, and what you learned. Explaining it is how you find
  out whether you understood it.

---

## Stretch goals (pick what interests you)

Roughly ordered by effort:

1. **Citation linking** — parse `[n]` markers in the rendered answer and make
   them scroll/highlight the matching source card.
2. **Ingestion dedupe** — stable chunk IDs (hash of file + chunk index) passed
   to `add_documents(ids=...)` so re-ingesting is idempotent.
3. **Upload from the UI** — `POST /api/upload` accepting a PDF
   (`UploadFile` in FastAPI), save to `data/papers/`, trigger ingest.
4. **Conversation persistence** — save chats to `localStorage` first; then try
  SQLite on the backend.
5. **Markdown rendering** — render assistant messages with `react-markdown`
   (Gemini loves bullet lists and bold text).
6. **Eval harness** — write 10 question/expected-source pairs and a script that
   measures retrieval hit-rate; then actually tune `chunk_size`, `retrieval_k`,
   `rerank_top_n` against it. This is how RAG work happens in industry.
7. **Auth + rate limiting** — required before you could ever deploy this
   publicly (API keys cost money).

---

## Reference

### Environment variables (`backend/.env`)

```
GEMINI_API_KEY=AIza...
CHAT_MODEL=gemini-2.5-flash

COHERE_API_KEY=...
EMBED_MODEL=embed-english-v3.0
RERANK_MODEL=rerank-english-v3.0

RETRIEVAL_K=20
RERANK_TOP_N=5
USE_RERANK=true

PAPERS_DIR=data/papers
CHROMA_DIR=data/chroma
CHROMA_COLLECTION=gym_papers

CHUNK_SIZE=1000
CHUNK_OVERLAP=150

CORS_ORIGINS=http://localhost:5173
```

### API contract

| Endpoint | Body | Returns |
| --- | --- | --- |
| `GET /health` | — | `{"status": "ok"}` |
| `POST /api/chat` | `{"message": str, "history": [{"role", "content"}]}` | SSE stream: `sources` → `token`* → `done` |
| `POST /api/ingest` | — | `{"files_processed", "chunks_added", "collection"}` |

### Daily dev loop

```bash
# terminal 1
cd backend && uv run uvicorn app.main:app --reload --port 8000

# terminal 2
cd frontend && npm run dev
```

### Debugging tips

- **Backend:** http://localhost:8000/docs lets you fire every endpoint from the
  browser (except streaming renders poorly there — use `curl -N`).
- **SSE looks buffered/laggy:** check you're yielding `\n\n`-terminated frames
  and that nothing between uvicorn and the browser buffers (plain localhost
  setup won't).
- **`ModuleNotFoundError: app`:** you're not running from `backend/`, or forgot
  `-m` for scripts.
- **Chroma returns junk / stale results:** delete `data/chroma/` and re-ingest.
  Cheap and cures most weirdness.
- **React StrictMode double-invokes effects in dev** — if you ever see doubled
  requests from an effect, that's why (your send-on-click flow won't hit this).
- **Windows note:** all commands above work in PowerShell; use two terminals
  rather than backgrounding.

### Docs you'll actually use

- uv: https://docs.astral.sh/uv/
- FastAPI: https://fastapi.tiangolo.com/ (see "Custom Response - StreamingResponse")
- LangChain PDF loading & splitting: https://python.langchain.com/docs/how_to/document_loader_pdf/
- Chroma via LangChain: https://python.langchain.com/docs/integrations/vectorstores/chroma/
- Cohere embed & rerank: https://docs.cohere.com/
- Gemini API (text generation & streaming): https://ai.google.dev/gemini-api/docs/text-generation
- Gemini free-tier rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- SSE format: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events

Have fun — and remember the checkpoints. If a phase's checkpoint doesn't pass,
the next phase will only make the confusion worse. Build → verify → move on. 💪
