import { useState } from "react";
import type { Source } from "../types";

interface SourcesProps {
  sources: Source[];
}

export function Sources({ sources }: SourcesProps) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mb-2 w-full max-w-2xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs font-medium text-neutral-400 hover:text-neutral-200"
      >
        {sources.length} source{sources.length === 1 ? "" : "s"}
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {sources.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs"
            >
              <div className="mb-1 font-medium text-neutral-300">
                [{s.id}] {s.title}
                {s.page !== null && <span className="text-neutral-500">, p.{s.page}</span>}
              </div>
              <p className="line-clamp-3 text-neutral-500">{s.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
