import type { ChatTurn, Source } from "../types";

interface ChatCallbacks {
  onSources: (sources: Source[]) => void;
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

/**
 * POSTs to /api/chat and parses the Server-Sent Events response by hand.
 *
 * We can't use the browser's built-in EventSource here because it only
 * supports GET requests, and this endpoint needs a JSON body. So we read
 * the fetch response as a stream and parse SSE frames ourselves.
 */
export async function streamChat(
  message: string,
  history: ChatTurn[],
  signal: AbortSignal,
  callbacks: ChatCallbacks
): Promise<void> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Chat request failed: ${res.status} ${res.statusText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // { stream: true } matters: without it, a multi-byte UTF-8 character
      // split across two network chunks gets decoded into garbage.
      buffer += decoder.decode(value, { stream: true });

      // Frames are separated by a blank line ("\n\n"). A single network
      // chunk can contain a partial frame, one frame, or several frames,
      // so we repeatedly peel complete frames off the front of the buffer.
      let frameEnd: number;
      while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, frameEnd);
        buffer = buffer.slice(frameEnd + 2);
        dispatchFrame(frame, callbacks);
      }
    }

    callbacks.onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Deliberate cancellation (Stop button), not a failure.
      return;
    }
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

function dispatchFrame(frame: string, callbacks: ChatCallbacks): void {
  let event = "";
  let data = "";

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      data = line.slice("data:".length).trim();
    }
  }

  if (!event) return;

  let payload: unknown;
  try {
    payload = data ? JSON.parse(data) : {};
  } catch {
    // Malformed frame — skip rather than crash the whole stream.
    return;
  }

  switch (event) {
    case "sources":
      callbacks.onSources((payload as { sources: Source[] }).sources);
      break;
    case "token":
      callbacks.onToken((payload as { text: string }).text);
      break;
    case "done":
      // The loop's final onDone() call handles this; the explicit "done"
      // frame just tells us the server is finished sending.
      break;
    default:
      break;
  }
}
