from collections.abc import Iterator
from functools import lru_cache

from google import genai
from google.genai import types

from app.config import get_settings
from app.schemas import ChatTurn, Source


SYSTEM_PROMPT = """
You are an evidence-based strength and conditioning assistant.

Answer using the provided research excerpts. Cite supporting excerpts inline
using their source numbers, such as [1] or [2][3].

If the excerpts do not contain enough information to answer the question,
say so clearly. Never invent citations, study findings, or evidence.

Keep answers practical, concise, and actionable.
""".strip()


@lru_cache
def _client() -> genai.Client:
    settings = get_settings()

    return genai.Client(
        api_key=settings.gemini_api_key,
    )


def _format_context(sources: list[Source]) -> str:
    if not sources:
        return "No relevant research excerpts were retrieved."

    formatted_sources = []

    for source in sources:
        formatted_sources.append(
            f"[{source.id}] {source.title}, p.{source.page}\n"
            f"{source.snippet}"
        )

    return "\n\n".join(formatted_sources)


def stream_answer(
        message: str,
        history: list[ChatTurn],
        sources: list[Source],
) -> Iterator[str]:
    contents = [
        types.Content(
            role="model" if turn.role == "assistant" else "user",
            parts=[
                types.Part.from_text(
                    text=turn.content,
                )
            ],
        )
        for turn in history
    ]

    context = _format_context(sources)

    contents.append(
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(
                    text=(
                        f"Research excerpts:\n\n{context}"
                        f"\n\n---\n\nQuestion: {message}"
                    )
                )
            ],
        )
    )

    settings = get_settings()

    stream = _client().models.generate_content_stream(
        model=settings.chat_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
        ),
    )

    for chunk in stream:
        if chunk.text:
            yield chunk.text