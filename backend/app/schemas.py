from typing import Annotated, Literal
from pydantic import BaseModel, Field, StringConstraints

class Source(BaseModel):
    id: int                  # 1-based rank; the number the model cites as [1]
    title: str               # paper title (from metadata)
    page: int | None = None  # page number, if known
    snippet: str             # the chunk text
    score: float | None = None  # rerank relevance (None if rerank disabled)

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    history: list[ChatTurn] = Field(default_factory=list)   # prior turns, oldest first

class IngestResponse(BaseModel):
    files_processed: int
    chunks_added: int
    collection: str