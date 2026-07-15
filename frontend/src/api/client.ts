import type { Message, Source } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

interface StreamHandlers {
  onSources: (sources: Source[]) => void;
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (err: unknown) => void;
}

/**
 * POST /api/chat and consume the Server-Sent Event stream.
 *
 * We parse SSE manually off the fetch body reader (rather than EventSource,
 * which cannot issue POST requests). Frames are separated by a blank line and
 * carry `event:` and `data:` fields.
 */
export async function streamChat(
  message: string,
  history: Message[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: history.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split off complete frames (terminated by a blank line).
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        dispatchFrame(frame, handlers);
      }
    }
    handlers.onDone();
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    handlers.onError(err);
  }
}

function dispatchFrame(frame: string, handlers: StreamHandlers): void {
  let event = "message";
  let data = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!data) return;

  const payload = JSON.parse(data);
  switch (event) {
    case "sources":
      handlers.onSources(payload.sources);
      break;
    case "token":
      handlers.onToken(payload.text);
      break;
    case "done":
      // onDone is called when the stream closes; nothing extra needed here.
      break;
  }
}
