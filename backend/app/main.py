import os
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api.routes import router

app = FastAPI(title="GymRAG API")

settings = get_settings()

origins = settings.cors_origins.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/health")
async def health():
    return {"status": "ok"}
# The hosted build serves the frontend from the same origin as the API.
if os.getenv("SERVE_FRONTEND") == "true":
    app.mount("/", StaticFiles(directory=Path(__file__).resolve().parents[2] / "frontend/dist", html=True), name="frontend")
