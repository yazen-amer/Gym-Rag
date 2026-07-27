from pydantic import BaseModel

class Source(BaseModel):
    id: int                  # 1-based rank; the number the model cites as [1]
    title: str               # paper title (from metadata)
    page: int | None = None  # page number, if known
    snippet: str             # the chunk text
    score: float | None = None  # rerank relevance (None if rerank disabled)

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