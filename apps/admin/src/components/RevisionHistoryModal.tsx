"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type ContentRevisionRecord } from "@/lib/api";

interface RevisionHistoryModalProps {
  entityType: "PAGE" | "POST";
  entityId: string;
  onClose: () => void;
  // Called after a successful restore — the caller re-fetches the
  // page/post it's editing so its form reflects the restored content.
  onRestored: () => void;
}

function initials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function AuthorAvatar({ name }: { name: string | undefined }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-300">
      {initials(name)}
    </span>
  );
}

export function RevisionHistoryModal({ entityType, entityId, onClose, onRestored }: RevisionHistoryModalProps) {
  const [revisions, setRevisions] = useState<ContentRevisionRecord[] | null>(null);
  const [selected, setSelected] = useState<ContentRevisionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    api
      .getRevisions(entityType, entityId)
      .then((revs) => {
        setRevisions(revs);
        setSelected(revs[0] ?? null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load revision history"));
  }, [entityType, entityId]);

  async function handleRestore(revisionId: string) {
    if (!confirm("Restore this version? The current content will be replaced — though it's saved as a new revision first, so this can always be undone.")) return;
    setRestoring(true);
    setError(null);
    try {
      await api.restoreRevision(revisionId);
      onRestored();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to restore this revision");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="modal-panel-enter flex h-[80vh] w-full max-w-4xl overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950 shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-white/[0.08] p-3">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold">Revision History</h3>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
              ✕
            </button>
          </div>

          {!revisions && !error && <p className="px-1 text-xs text-zinc-500">Loading…</p>}
          {revisions?.length === 0 && <p className="px-1 text-xs text-zinc-500">No saved revisions yet — history starts recording the next time this is saved.</p>}

          <div className="flex flex-col gap-1">
            {revisions?.map((rev, i) => (
              <button
                key={rev.id}
                data-testid="revision-row"
                onClick={() => setSelected(rev)}
                className={`flex items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors duration-200 ${
                  selected?.id === rev.id ? "bg-amber-400/10" : "hover:bg-white/[0.04]"
                }`}
              >
                <AuthorAvatar name={rev.author?.name} />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-xs font-medium ${selected?.id === rev.id ? "text-amber-300" : "text-zinc-200"}`}>{rev.author?.name ?? "Unknown"}</div>
                  <div className="text-[11px] text-zinc-500">{new Date(rev.createdAt).toLocaleString()}</div>
                </div>
                {i === 0 && <span className="shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">Latest</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

          {!selected ? (
            <p className="text-sm text-zinc-500">Select a revision on the left to preview it.</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-lg font-semibold">{selected.title}</h4>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Saved {new Date(selected.createdAt).toLocaleString()} by {selected.author?.name ?? "Unknown"}
                  </p>
                </div>
                <button
                  onClick={() => handleRestore(selected.id)}
                  disabled={restoring}
                  className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
                >
                  {restoring ? "Restoring…" : "Restore This Version"}
                </button>
              </div>

              {(selected.seoTitle || selected.seoDesc) && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400">
                  {selected.seoTitle && (
                    <p>
                      <span className="text-zinc-500">SEO Title:</span> {selected.seoTitle}
                    </p>
                  )}
                  {selected.seoDesc && (
                    <p className="mt-1">
                      <span className="text-zinc-500">SEO Description:</span> {selected.seoDesc}
                    </p>
                  )}
                </div>
              )}

              {selected.content ? (
                <div
                  className="max-w-none overflow-y-auto rounded-lg border border-zinc-800 bg-white p-5 text-sm leading-relaxed text-black"
                  dangerouslySetInnerHTML={{ __html: selected.content }}
                />
              ) : selected.layout ? (
                <p className="rounded-lg border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
                  This version&apos;s body was built with the Visual Builder — its block layout was captured in this snapshot but isn&apos;t rendered in
                  this preview. Restoring it will bring the full block layout back exactly as it was.
                </p>
              ) : (
                <p className="text-sm text-zinc-500">This version has no body content.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
