"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Laptop, Play, Smartphone, Tablet, Trash2 } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { SessionReplayerModal } from "@/components/SessionReplayerModal";
import { api, type SessionRecordingListItem, type SessionRecordingsResult } from "@/lib/api";

type RageClickFilter = "" | "true" | "false";

/** ISO 3166-1 alpha-2 → flag emoji via the regional-indicator code-point trick; anything else (missing/garbled geo data) just falls back to a globe. */
function countryFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🌐";
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "🌐";
  const codePoints = [...upper].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function DeviceIcon({ deviceType }: { deviceType: string | null }) {
  const className = "h-4 w-4 text-zinc-400";
  if (deviceType === "mobile") return <Smartphone className={className} />;
  if (deviceType === "tablet") return <Tablet className={className} />;
  return <Laptop className={className} />;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function contactLabel(contact: SessionRecordingListItem["session"]["contact"]): string | null {
  if (!contact) return null;
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ");
  return name || contact.email;
}

export default function SessionRecordingsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <RecordingsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function RecordingsContent() {
  const [result, setResult] = useState<SessionRecordingsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);

  // Keyed by sessionId, not row index — the list re-fetches after a delete, so
  // indices shift under the selection while sessionIds stay stable.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ sessionIds: string[]; label: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [recordingEnabled, setRecordingEnabled] = useState<boolean | null>(null);
  const [savingToggle, setSavingToggle] = useState(false);

  const [search, setSearch] = useState("");
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [rageClicks, setRageClicks] = useState<RageClickFilter>("");
  const [pagePath, setPagePath] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(() => {
    api
      .getSessionRecordings({
        page,
        limit: 20,
        search: search || undefined,
        minDuration: minDuration ? Number(minDuration) : undefined,
        maxDuration: maxDuration ? Number(maxDuration) : undefined,
        hasRageClicks: rageClicks ? rageClicks === "true" : undefined,
        pagePath: pagePath || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      .then(setResult)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load recordings"));
     
  }, [page, search, minDuration, maxDuration, rageClicks, pagePath, startDate, endDate]);

  useEffect(load, [load]);

  // The recording on/off switch reads and writes the same SiteSettings flag
  // the Analytics Overview page exposes; it's surfaced here too because this
  // is the page you're on when you decide you want recording to stop.
  useEffect(() => {
    api
      .getSettings()
      .then((s) => setRecordingEnabled(s.sessionRecordingEnabled))
      .catch(() => setRecordingEnabled(null));
  }, []);

  async function toggleRecording(next: boolean) {
    setSavingToggle(true);
    setRecordingEnabled(next); // optimistic — reverted below if the save fails
    try {
      const updated = await api.updateSettings({ sessionRecordingEnabled: next });
      setRecordingEnabled(updated.sessionRecordingEnabled);
      setNotice(next ? "Session recording turned on." : "Session recording turned off. Existing recordings are kept.");
    } catch (err) {
      setRecordingEnabled(!next);
      setError(err instanceof Error ? err.message : "Could not change the recording setting");
    } finally {
      setSavingToggle(false);
    }
  }

  function toggleRow(sessionId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  const pageSessionIds = result?.items.map((r) => r.sessionId) ?? [];
  const allOnPageSelected = pageSessionIds.length > 0 && pageSessionIds.every((id) => selected.has(id));

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageSessionIds.forEach((id) => next.delete(id));
      else pageSessionIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function runDelete(sessionIds: string[]) {
    setBusy(true);
    setError(null);
    try {
      if (sessionIds.length === 1) await api.deleteSessionRecording(sessionIds[0]);
      else await api.bulkDeleteSessionRecordings(sessionIds);
      setSelected((prev) => {
        const next = new Set(prev);
        sessionIds.forEach((id) => next.delete(id));
        return next;
      });
      setNotice(`Deleted ${sessionIds.length} recording${sessionIds.length === 1 ? "" : "s"}.`);
      setConfirmDelete(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportRecording(sessionId: string) {
    setError(null);
    try {
      const blob = await api.exportSessionRecording(sessionId);
      // Object URL rather than a data: URI — a recording can be megabytes,
      // and a data: URI of that size is both slow to build and capped by the
      // browser. Revoked immediately after the click to release the blob.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-${sessionId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  function resetFilters() {
    setSearch("");
    setMinDuration("");
    setMaxDuration("");
    setRageClicks("");
    setPagePath("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Session Recordings</h1>
          <p className="mt-1 text-sm text-zinc-300">Every self-hosted rrweb session recording — search, filter, and play back a visitor&apos;s exact journey.</p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <input
            type="checkbox"
            checked={recordingEnabled ?? false}
            disabled={recordingEnabled === null || savingToggle}
            onChange={(e) => toggleRecording(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400 disabled:opacity-40"
          />
          <span className="text-sm">
            <span className="font-medium text-zinc-200">Record new sessions</span>
            <span className="block text-xs text-zinc-500">
              {recordingEnabled === null
                ? "Loading…"
                : recordingEnabled
                  ? "New visits are being recorded"
                  : "Recording is off — existing recordings are kept"}
            </span>
          </span>
        </label>
      </div>

      {notice && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-400/70 hover:text-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Search</label>
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="IP, location, or lead email…"
            className="w-56 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Duration (seconds)</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              value={minDuration}
              onChange={(e) => {
                setPage(1);
                setMinDuration(e.target.value);
              }}
              placeholder="Min"
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
            <span className="text-zinc-600">–</span>
            <input
              type="number"
              min={0}
              value={maxDuration}
              onChange={(e) => {
                setPage(1);
                setMaxDuration(e.target.value);
              }}
              placeholder="Max"
              className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Date Range</label>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPage(1);
                setStartDate(e.target.value);
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
            <span className="text-zinc-600">–</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPage(1);
                setEndDate(e.target.value);
              }}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Rage Clicks</label>
          <select
            value={rageClicks}
            onChange={(e) => {
              setPage(1);
              setRageClicks(e.target.value as RageClickFilter);
            }}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          >
            <option value="">All sessions</option>
            <option value="true">Rage clicks detected</option>
            <option value="false">No rage clicks</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Page Route</label>
          <input
            value={pagePath}
            onChange={(e) => {
              setPage(1);
              setPagePath(e.target.value);
            }}
            placeholder="/pricing"
            className="w-40 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
          />
        </div>

        <button type="button" onClick={resetFilters} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-amber-400">
          Reset
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="w-10 px-4 py-2">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleAllOnPage}
                  aria-label="Select all recordings on this page"
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
                />
              </th>
              <th className="px-4 py-2">Visitor / Location</th>
              <th className="px-4 py-2">Device</th>
              <th className="px-4 py-2">Entry Page</th>
              <th className="px-4 py-2">Duration</th>
              <th className="px-4 py-2">Events</th>
              <th className="px-4 py-2">Pages</th>
              <th className="px-4 py-2">Rage Clicks</th>
              <th className="px-4 py-2">Recorded</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {(result?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-zinc-500">
                  No recordings match these filters.
                </td>
              </tr>
            )}
            {result?.items.map((rec) => {
              const contact = contactLabel(rec.session.contact);
              return (
                <tr key={rec.id} className="border-t border-zinc-800 align-top hover:bg-zinc-900/40">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(rec.sessionId)}
                      onChange={() => toggleRow(rec.sessionId)}
                      aria-label={`Select recording from ${new Date(rec.createdAt).toLocaleString()}`}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <span>{countryFlag(rec.session.country)}</span>
                      <span>{[rec.session.city, rec.session.country].filter(Boolean).join(", ") || "Unknown"}</span>
                    </div>
                    <div className="text-xs text-zinc-500">{contact ?? rec.session.ipAddress ?? "—"}</div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <DeviceIcon deviceType={rec.session.deviceType} />
                      {rec.session.browser ?? "Unknown"}
                    </div>
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-2 font-mono text-xs">{rec.session.landingPage ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{formatDuration(rec.duration)}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{rec.eventCount}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{rec.session._count.pageViews}</td>
                  <td className="px-4 py-2">
                    {rec.hasRageClicks ? (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] font-medium text-red-300">Rage Clicks</span>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{new Date(rec.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setReplaySessionId(rec.sessionId)}
                        className="flex items-center gap-1 text-xs font-medium text-amber-400 hover:underline"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Play
                      </button>
                      <button
                        type="button"
                        onClick={() => exportRecording(rec.sessionId)}
                        title="Download this recording as JSON"
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDelete({
                            sessionIds: [rec.sessionId],
                            label: `the recording from ${new Date(rec.createdAt).toLocaleString()}`,
                          })
                        }
                        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {result && result.total > result.limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
          <span>
            Page {result.page} of {Math.ceil(result.total / result.limit)} · {result.total} recordings
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40">
              Previous
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(result.total / result.limit)} className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      )}

      {/* Floating bar rather than inline controls: selection survives paging,
          so the actions have to stay reachable no matter where you scroll. */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 shadow-xl">
          <span className="text-sm text-zinc-300">
            {selected.size} recording{selected.size === 1 ? "" : "s"} selected
          </span>
          <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-zinc-400 hover:text-zinc-200">
            Clear
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete({ sessionIds: [...selected], label: `${selected.size} recording${selected.size === 1 ? "" : "s"}` })}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected
          </button>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-5">
            <h2 className="text-lg font-semibold">Delete {confirmDelete.sessionIds.length === 1 ? "recording" : "recordings"}?</h2>
            <p className="mt-2 text-sm text-zinc-400">
              This permanently deletes {confirmDelete.label}. The visitor session, its page views and any linked lead are kept — only the
              replay data is removed. This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={busy}
                className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => runDelete(confirmDelete.sessionIds)}
                disabled={busy}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {replaySessionId && <SessionReplayerModal sessionId={replaySessionId} onClose={() => setReplaySessionId(null)} />}
    </div>
  );
}
