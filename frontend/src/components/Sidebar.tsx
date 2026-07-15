interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-neutral-950 border-r border-neutral-800 p-3">
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-100 hover:bg-neutral-800 transition-colors"
      >
        <span className="text-lg leading-none">+</span> New chat
      </button>

      <div className="mt-6 px-1 text-xs uppercase tracking-wide text-neutral-500">
        GymRAG
      </div>
      <p className="mt-2 px-1 text-sm text-neutral-400 leading-relaxed">
        Ask about training, hypertrophy, nutrition, and recovery. Answers are
        grounded in indexed research papers and cited inline.
      </p>

      <div className="mt-auto px-1 text-xs text-neutral-600">
        Retrieval-augmented · Cohere rerank · Claude
      </div>
    </aside>
  );
}
