import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { ChatMessage } from "./ChatMessage";

const SUGGESTIONS = [
  "How many sets per muscle group per week for hypertrophy?",
  "Is training to failure necessary for muscle growth?",
  "How much protein do I need to build muscle?",
  "Does rest-day cardio hurt strength gains?",
];

export function MessageList({
  messages,
  onSuggestion,
}: {
  messages: Message[];
  onSuggestion: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-semibold text-neutral-100">GymRAG</h1>
        <p className="mt-2 text-neutral-400">
          Evidence-based answers from strength & conditioning research.
        </p>
        <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-left text-sm text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((m, i) => (
        <ChatMessage key={i} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
