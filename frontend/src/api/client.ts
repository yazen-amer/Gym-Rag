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
    if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
      throw new Error("Set VITE_API_URL to the deployed backend URL (including /api), then rebuild the frontend.");
    }
    const apiBase = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
    const res = await fetch(`${apiBase}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
      signal,
    });

    if (!res.ok || !res.body) {
      let detail = "";
      try {
        const body = await res.json();
        detail = typeof body.detail === "string" ? body.detail : "";
      } catch { /* Proxies can return HTML or an empty body. */ }
      throw new Error(detail || `Chat request failed (${res.status}). Check the backend URL and availability.`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed = false;

    try {
      while (!completed) {
        const { done, value } = await reader.read();
        if (done) break;

        // { stream: true } matters: without it, a multi-byte UTF-8 character
        // split across two network chunks gets decoded into garbage.
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");

        // Frames are separated by a blank line ("\n\n"). A single network
        // chunk can contain a partial frame, one frame, or several frames,
        // so we repeatedly peel complete frames off the front of the buffer.
        let frameEnd: number;
        while ((frameEnd = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, frameEnd);
          buffer = buffer.slice(frameEnd + 2);
          completed = dispatchFrame(frame, callbacks) || completed;
        }
      }

      if (!completed) throw new Error("The response ended before completion. Please try again.");
      callbacks.onDone();
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Deliberate cancellation (Stop button), not a failure.
      return;
    }
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

function dispatchFrame(frame: string, callbacks: ChatCallbacks): boolean {
  let event = "";
  let data = "";

  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      data = line.slice("data:".length).trim();
    }
  }

  if (!event) return false;

  let payload: unknown;
  try {
    payload = data ? JSON.parse(data) : {};
  } catch {
    // Invalid JSON cannot be treated as a successful response.
    throw new Error("The server returned an invalid response.");
  }

  switch (event) {
    case "sources":
      callbacks.onSources((payload as { sources: Source[] }).sources);
      break;
    case "token":
      callbacks.onToken((payload as { text: string }).text);
      break;
    case "done":
      return true;
    case "error":
      throw new Error((payload as { message?: string }).message || "The backend could not complete the response.");
    default:
      break;
  }
  return false;
}
