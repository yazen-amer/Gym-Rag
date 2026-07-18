# GymRAG

Scaffolding for a RAG-based gym & exercise-science chatbot: drop
strength-and-conditioning research papers into the backend and chat with an
assistant that answers training / nutrition / recovery questions grounded in
those papers, with streaming responses and inline citations.

**This repo is intentionally just scaffolding.** The project itself is a
learning exercise — the full build guide lives in [`plan.md`](plan.md).

## Layout

```
backend/    Python (uv) — will become a FastAPI RAG service
frontend/   Vite + React + TypeScript + Tailwind v4 — will become the chat UI
plan.md     The step-by-step implementation guide. Start here.
```

## Quick sanity check

```bash
# Backend
cd backend
uv run main.py

# Frontend (second terminal)
cd frontend
npm install
npm run dev        # http://localhost:5173
```
