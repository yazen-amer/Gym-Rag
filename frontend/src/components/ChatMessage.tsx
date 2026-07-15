import type { Message } from "../types";
import { Sources } from "./Sources";

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className="py-5">
      <div className="mx-auto flex max-w-3xl gap-4 px-4">
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            isUser
              ? "bg-neutral-700 text-neutral-100"
              : "bg-emerald-600 text-white"
          }`}
        >
          {isUser ? "You" : "GR"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="whitespace-pre-wrap break-words leading-relaxed text-neutral-100">
            {message.content || (
              <span className="inline-block h-4 w-2 animate-pulse bg-neutral-500 align-middle" />
            )}
          </div>
          {!isUser && message.sources && <Sources sources={message.sources} />}
        </div>
      </div>
    </div>
  );
}
