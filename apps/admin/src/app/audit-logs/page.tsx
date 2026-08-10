"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type AuditLogsResult, type AuditLogEntry } from "@/lib/api";

const LIMIT = 50;

export default function AuditLogsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <AuditLogsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function AuditLogsContent() {
  const [result, setResult] = useState<AuditLogsResult | null>(null);
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [emailSearch, setEmailSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.getAuditLogs({
          page,
          limit: LIMIT,
          resource: resource || undefined,
          action: action || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
        if (!cancelled) setResult(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load audit logs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, resource, action, startDate, endDate]);

  // Filters changing resets to page 1, adjusted during render rather than a
  // second effect — same pattern used on the Analytics dashboard.
  const filterKey = `${resource}_${action}_${startDate}_${endDate}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const items = (result?.items ?? []).filter((log) => !emailSearch || (log.userEmail ?? "").toLowerCase().includes(emailSearch.toLowerCase()));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit Logs</h1>
      <p className="mt-1 text-sm text-zinc-300">A record of every create, update, and delete action taken across the admin dashboard.</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Resource</label>
          <select
            value={resource}
            onChange={(e) => setResource(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          >
            <option value="">All resources</option>
            {result?.resources.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">Action contains</label>
          <input
            type="text"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="e.g. DELETE"
            className="w-36 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-zinc-500">User email contains</label>
          <input
            type="text"
            value={emailSearch}
            onChange={(e) => setEmailSearch(e.target.value)}
            placeholder="name@example.com"
            className="w-44 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-zinc-500">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>
        {(resource || action || startDate || endDate || emailSearch) && (
          <button
            onClick={() => {
              setResource("");
              setAction("");
              setStartDate("");
              setEndDate("");
              setEmailSearch("");
            }}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Timestamp</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Resource</th>
              <th className="px-4 py-2">IP Address</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  No matching audit log entries.
                </td>
              </tr>
            )}
            {items.map((log) => (
              <AuditLogRow key={log.id} log={log} expanded={expandedId === log.id} onToggle={() => setExpandedId((id) => (id === log.id ? null : log.id))} />
            ))}
          </tbody>
        </table>
      </div>

      {result && result.total > result.limit && (
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
          <span>
            Page {result.page} of {Math.max(1, Math.ceil(result.total / result.limit))} — {result.total} entries
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40">
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(result.total / result.limit)}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditLogRow({ log, expanded, onToggle }: { log: AuditLogEntry; expanded: boolean; onToggle: () => void }) {
  const hasDetails = log.details !== null && log.details !== undefined && Object.keys(log.details as object).length > 0;
  return (
    <>
      <tr className="border-t border-zinc-800 align-top">
        <td className="px-4 py-2 text-xs text-zinc-400">{new Date(log.createdAt).toLocaleString()}</td>
        <td className="px-4 py-2 text-xs">{log.userEmail ?? "—"}</td>
        <td className="px-4 py-2">
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-amber-300">{log.action}</span>
        </td>
        <td className="px-4 py-2 text-xs text-zinc-400">
          {log.resource}
          {log.resourceId && <span className="ml-1 font-mono text-zinc-600">#{log.resourceId.slice(0, 8)}</span>}
        </td>
        <td className="px-4 py-2 font-mono text-xs text-zinc-500">{log.ipAddress ?? "—"}</td>
        <td className="px-4 py-2 text-right">
          {hasDetails && (
            <button onClick={onToggle} className="text-xs font-medium text-amber-400 hover:underline">
              {expanded ? "Hide" : "Details"}
            </button>
          )}
        </td>
      </tr>
      {expanded && hasDetails && (
        <tr className="border-t border-zinc-900 bg-zinc-950">
          <td colSpan={6} className="px-4 py-3">
            <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-400">{JSON.stringify(log.details, null, 2)}</pre>
          </td>
        </tr>
      )}
    </>
  );
}
