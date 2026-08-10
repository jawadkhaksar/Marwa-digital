"use client";

/**
 * Shared styled confirmation dialog for destructive delete actions — used
 * across Workflows, Deals, and the Contacts/Inquiries bulk-delete bar so
 * every "this cannot be undone" prompt in the admin looks and behaves the
 * same, instead of the browser's own unstyled confirm().
 */
export function ConfirmDeleteModal({
  title,
  message,
  confirmLabel = "Delete",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="modal-panel-enter w-full max-w-md rounded-xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl shadow-black/40" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-red-400">{title}</h2>
        <p className="mt-2 text-sm text-zinc-300">{message}</p>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-zinc-300 transition-colors duration-200 hover:bg-white/[0.04] disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-40"
          >
            {busy ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
