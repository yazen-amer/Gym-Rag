import { useCallback, useRef, useState } from "react";
import { streamChat } from "../api/client";
import type { Message, Source } from "../types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      const history = messages;
      const userMsg: Message = { role: "user", content: trimmed };
      // Seed an empty assistant message we stream into.
      setMessages([...history, userMsg, { role: "assistant", content: "" }]);
      setIsStreaming(true);

      const updateAssistant = (fn: (m: Message) => Message) =>
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = fn(next[next.length - 1]);
          return next;
        });

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(
        trimmed,
        history,
        {
          onSources: (sources: Source[]) =>
            updateAssistant((m) => ({ ...m, sources })),
          onToken: (t: string) =>
            updateAssistant((m) => ({ ...m, content: m.content + t })),
          onDone: () => setIsStreaming(false),
          onError: () =>
            updateAssistant((m) => ({
              ...m,
              content:
                m.content ||
                "Something went wrong reaching the server. Is the backend running?",
            })),
        },
        controller.signal,
      );
      setIsStreaming(false);
    },
    [messages, isStreaming],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, send, stop, reset };
}
