"use client";

import { useState } from "react";
import type { LayoutDocument } from "@marwa/builder";
import { api, type Page } from "@/lib/api";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

const STATUS_STYLES: Record<Page["status"], string> = {
  DRAFT: "bg-zinc-700 text-zinc-300",
  STAGED: "border border-amber-500/40 bg-amber-500/15 text-amber-300",
  SCHEDULED: "border border-blue-500/40 bg-blue-500/15 text-blue-300",
  PUBLISHED: "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
};

const STATUS_LABELS: Record<Page["status"], string> = {
  DRAFT: "Draft",
  STAGED: "Staged / Preview Ready",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Live",
};

/**
 * Staging & Scheduled Publishing controls for the Page Builder's top navbar.
 * Deliberately separate from the pre-existing "Publish / Save" button (which
 * still writes straight to the live layout, unchanged) — "Save as Staged
 * Draft" instead snapshots the current in-progress `doc` into
 * stagedContent/stagedLayout without touching what's live, and "Publish
 * Staged" / "Schedule" promote that snapshot on demand or at a future time
 * (see publishWorker.ts). Both flows can be used interchangeably per-save.
 */
export function PublishStatusControls({ page, doc, onPageUpdated }: { page: Page; doc: LayoutDocument; onPageUpdated: (page: Page) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleValue, setScheduleValue] = useState("");

  async function withBusy(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleStage() {
    withBusy(async () => {
      const updated = await api.stagePage(page.id, { layout: doc, content: page.content });
      onPageUpdated(updated);
    });
  }

  function handlePublishStaged() {
    withBusy(async () => {
      const updated = await api.publishPage(page.id);
      onPageUpdated(updated);
    });
  }

  async function handlePreview() {
    try {
      const { token, slug } = await api.getPagePreviewToken(page.id);
      window.open(`${WEB_URL}/${slug}?previewToken=${token}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create a preview link");
    }
  }

  function handleSchedule() {
    if (!scheduleValue) return;
    withBusy(async () => {
      const updated = await api.schedulePage(page.id, new Date(scheduleValue).toISOString());
      onPageUpdated(updated);
      setScheduling(false);
    });
  }

  const hasStagedDraft = Boolean(page.stagedLayout || page.stagedContent);

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[page.status]}`} title={STATUS_LABELS[page.status]}>
        {page.status === "SCHEDULED" && page.scheduledAt ? `Scheduled · ${new Date(page.scheduledAt).toLocaleString()}` : STATUS_LABELS[page.status]}
      </span>

      <button
        type="button"
        onClick={handleStage}
        disabled={busy}
        title="Save the current builder content as an unpublished staged draft — production stays exactly as it is"
        className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
      >
        Save as Staged Draft
      </button>

      {hasStagedDraft && (
        <button
          type="button"
          onClick={handlePreview}
          title="Open a signed preview link showing the staged draft, without publishing it"
          className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
        >
          Staging Preview Link
        </button>
      )}

      {hasStagedDraft && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setScheduling((v) => !v)}
            className="rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Schedule…
          </button>
          {scheduling && (
            <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-64 rounded-lg border border-zinc-700 bg-zinc-950 p-3 shadow-2xl">
              <label className="mb-1 block text-[11px] text-zinc-500">Publish staged draft at</label>
              <input
                type="datetime-local"
                value={scheduleValue}
                onChange={(e) => setScheduleValue(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none [color-scheme:dark]"
              />
              <button
                type="button"
                onClick={handleSchedule}
                disabled={busy || !scheduleValue}
                className="mt-2 w-full rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
              >
                Schedule
              </button>
            </div>
          )}
        </div>
      )}

      {hasStagedDraft && (
        <button
          type="button"
          onClick={handlePublishStaged}
          disabled={busy}
          title="Promote the staged draft to the live page right now"
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          Publish Staged
        </button>
      )}

      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
