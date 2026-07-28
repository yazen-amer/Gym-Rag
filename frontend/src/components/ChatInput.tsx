import { useRef, useState, type KeyboardEvent } from "react";

interface ChatInputProps {
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatInput({ isStreaming, onSend, onStop }: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  const handleSend = () => {
    if (!text.trim() || isStreaming) return;
    onSend(text);
    setText("");
    requestAnimationFrame(resize);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-neutral-800 bg-neutral-950 p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask about training, hypertrophy, periodization..."
          rows={1}
          className="max-h-[200px] flex-1 resize-none bg-transparent py-1.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-700 text-neutral-100 transition-colors hover:bg-neutral-600"
            aria-label="Stop generating"
            title="Stop"
          >
            <span className="h-2.5 w-2.5 rounded-sm bg-neutral-100" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-600"
            aria-label="Send message"
            title="Send"
          >
            ↑
          </button>
        )}
      </div>
    </div>
  );
}
