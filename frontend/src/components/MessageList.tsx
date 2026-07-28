import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { ChatMessage } from "./ChatMessage";

interface MessageListProps {
  messages: Message[];
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  "How many sets per week are optimal for hypertrophy?",
  "What does the research say about training frequency?",
  "Is there a benefit to training to failure?",
  "How should I structure a periodized program?",
];

export function MessageList({ messages, onSuggestion }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-neutral-100">
            Ask something evidence-based
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Answers are grounded in your indexed research papers, with citations.
          </p>
        </div>
        <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-900"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
