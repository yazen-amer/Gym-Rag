# GymRAG — Frontend

A ChatGPT-style chat UI for the GymRAG backend. Vite + React + TypeScript +
Tailwind CSS v4.

## Features

- Streaming answers rendered token-by-token (Server-Sent Events)
- Collapsible inline **sources** panel per answer (citation chunks)
- Suggested prompts on the empty state, auto-growing input, stop button
- Dev proxy to the FastAPI backend so there's a single origin

## Setup

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api/*` to `http://localhost:8000` (the backend). To
point at a different backend, set `VITE_API_BASE` in `.env`.

## Build

```bash
npm run build
npm run preview
```

## Layout

```
src/
  main.tsx              React entry
  App.tsx               Sidebar + message list + input shell
  index.css             Tailwind v4 entry
  types.ts              Message / Source types
  api/client.ts         POST /api/chat + SSE stream parsing
  hooks/useChat.ts      Chat state + streaming orchestration
  components/
    Sidebar.tsx
    MessageList.tsx     Empty-state suggestions + auto-scroll
    ChatMessage.tsx
    Sources.tsx         Collapsible citations
    ChatInput.tsx       Auto-grow textarea, Enter-to-send
```
