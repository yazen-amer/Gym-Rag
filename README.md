# GymRAG

A RAG backend that answers questions about research papers with cited sources instead of hallucinated answers. Built to actually understand retrieval quality, not just wire up an LLM call.

## What it does
- Ingests research paper PDFs, chunks them, and embeds them into a vector store
- Answers queries by retrieving relevant chunks and generating a grounded response with citations back to the source
- Supports optional reranking (Cohere) on top of vector search to improve which chunks actually get used

## Retrieval quality
I built a 25-query evaluation harness to actually measure whether retrieval was working, not just assume it was. Adding reranking on top of vector search took Hit@5 from 88% to 96%.

| Setup | Hit@5 |
|---|---|
| Vector search only | 88% |
| Vector search + reranking | 96% |

## Stack
Python, FastAPI, ChromaDB (vector store), Cohere (reranking), Gemini (generation), LangChain

## Running it locally

You'll need Python 3.10+, and API keys for Cohere and Gemini.

Set env vars: `COHERE_API_KEY`, `GEMINI_API_KEY`

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Then hit the `/query` endpoint with a question and it'll return a grounded answer with sources.

## Notes
Chunking and embedding happen once at ingest time — queries just hit the existing vector store, so response time stays fast even as the paper corpus grows. Reranking is optional and configurable per-query since it adds latency in exchange for better precision.

Live: [link]
