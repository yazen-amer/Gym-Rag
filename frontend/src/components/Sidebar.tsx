interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500 text-sm font-bold text-neutral-950">
          G
        </div>
        <span className="text-sm font-semibold tracking-wide text-neutral-100">
          GymRAG
        </span>
      </div>

      <button
        onClick={onNewChat}
        className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-2 text-sm text-neutral-200 transition-colors hover:bg-neutral-900"
      >
        <span className="text-lg leading-none">+</span>
        New chat
      </button>

      <div className="mt-auto px-2 text-xs text-neutral-600">
        Answers are grounded in your indexed papers.
      </div>
    </aside>
  );
}
