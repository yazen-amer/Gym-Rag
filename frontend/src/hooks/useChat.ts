import { useCallback, useRef, useState } from "react";
import { streamChat } from "../api/client";
import type { ChatTurn, Message, Source } from "../types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);

      // Build history from the messages that exist *before* this turn.
      const history: ChatTurn[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Append the user message and an empty assistant message in one
      // update — we'll stream tokens into that last slot.
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        { role: "assistant", content: "", sources: undefined },
      ]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(trimmed, history, controller.signal, {
        onSources: (sources: Source[]) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, sources };
            return next;
          });
        },
        onToken: (token: string) => {
          // Functional update + immutable edit of the last element only —
          // closing over `messages` directly here would stream into a
          // stale snapshot and drop tokens.
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + token };
            return next;
          });
        },
        onDone: () => {
          setIsStreaming(false);
          abortRef.current = null;
        },
        onError: (err: Error) => {
          setIsStreaming(false);
          abortRef.current = null;
          setError(err.message || "Something went wrong talking to the backend.");
        },
      });
    },
    [messages, isStreaming]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setError(null);
    setMessages([]);
  }, []);

  return { messages, isStreaming, error, send, stop, reset };
}
