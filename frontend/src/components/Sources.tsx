import { useState } from "react";
import type { Source } from "../types";

export function Sources({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        {open ? "▾" : "▸"} {sources.length} source
        {sources.length === 1 ? "" : "s"}
      </button>

      {open && (
        <ol className="mt-2 space-y-2">
          {sources.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs"
            >
              <div className="flex items-center gap-2 text-neutral-300">
                <span className="font-mono text-neutral-500">[{s.id}]</span>
                <span className="font-medium">{s.title}</span>
                {s.page != null && (
                  <span className="text-neutral-500">p.{s.page}</span>
                )}
                {s.score != null && (
                  <span className="ml-auto text-neutral-600">
                    {s.score.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-neutral-500 line-clamp-3">{s.snippet}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
