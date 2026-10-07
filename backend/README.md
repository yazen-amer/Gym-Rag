# GymRAG backend

See [the project README](../README.md) for setup, ingestion, deployment and tests.

Run from this directory with `uv run uvicorn app.main:app --port 8000`. The backend loads `.env` from this directory regardless of the launch working directory. Environment variables override `.env` values. Relative data paths in `.env` still resolve against the process working directory, so use absolute paths on hosted persistent volumes.
