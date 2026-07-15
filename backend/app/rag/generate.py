"""Answer generation: build a grounded prompt and stream Claude's reply."""

from __future__ import annotations

from collections.abc import Iterator
from functools import lru_cache

import anthropic

from app.config import get_settings
from app.schemas import ChatTurn, Source

SYSTEM_PROMPT = """You are GymRAG, a knowledgeable strength-and-conditioning \
assistant. You answer questions about training, hypertrophy, nutrition, \
recovery, and exercise science.

Ground your answers in the provided research excerpts. When you use an excerpt, \
cite it inline with its number in square brackets, e.g. [1] or [2][3]. If the \
excerpts do not contain the answer, say so plainly and answer from general \
knowledge only if it is well established — never invent citations or study \
findings. Be practical and concise; prefer actionable guidance over hedging."""


@lru_cache
def _client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=get_settings().anthropic_api_key)


def _format_context(sources: list[Source]) -> str:
    if not sources:
        return "(No relevant research excerpts were retrieved.)"
    blocks = []
    for s in sources:
        loc = f", p.{s.page}" if s.page else ""
        blocks.append(f"[{s.id}] {s.title}{loc}\n{s.snippet}")
    return "\n\n".join(blocks)


def _build_messages(
    message: str, history: list[ChatTurn], sources: list[Source]
) -> list[dict]:
    messages: list[dict] = [
        {"role": t.role, "content": t.content}
        for t in history
        if t.role in ("user", "assistant")
    ]
    context = _format_context(sources)
    messages.append(
        {
            "role": "user",
            "content": (
                f"Research excerpts:\n\n{context}\n\n"
                f"---\n\nQuestion: {message}"
            ),
        }
    )
    return messages


def stream_answer(
    message: str, history: list[ChatTurn], sources: list[Source]
) -> Iterator[str]:
    """Yield answer text deltas from Claude, grounded in ``sources``."""
    settings = get_settings()
    with _client().messages.stream(
        model=settings.chat_model,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=_build_messages(message, history, sources),
    ) as stream:
        yield from stream.text_stream
