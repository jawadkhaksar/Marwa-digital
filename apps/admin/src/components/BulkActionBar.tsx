"use client";

/** Floating bar that appears once 1+ rows are selected in a data table — currently just "Delete Selected", but built to take more actions later. */
export function BulkActionBar({ count, onDelete, onClear, busy = false }: { count: number; onDelete: () => void; onClear: () => void; busy?: boolean }) {
  if (count === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="flex items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-2xl shadow-black/40">
        <span className="text-sm text-zinc-300">
          <span className="font-semibold text-zinc-100">{count}</span> selected
        </span>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-400 disabled:opacity-50"
        >
          {busy ? "Deleting…" : `Delete Selected (${count})`}
        </button>
        <button type="button" onClick={onClear} disabled={busy} className="text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-50">
          Clear
        </button>
      </div>
    </div>
  );
}
