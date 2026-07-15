"""Pydantic request/response models for the API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's latest question.")
    history: list[ChatTurn] = Field(
        default_factory=list, description="Prior turns, oldest first."
    )


class Source(BaseModel):
    """A retrieved chunk surfaced to the user as a citation."""

    id: int
    title: str
    page: int | None = None
    snippet: str
    score: float | None = None


class IngestResponse(BaseModel):
    files_processed: int
    chunks_added: int
    collection: str
