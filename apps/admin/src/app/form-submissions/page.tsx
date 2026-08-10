"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type FormSubmission } from "@/lib/api";

function mainValue(submission: FormSubmission): string {
  const entries = Object.entries(submission.data);
  const emailEntry = entries.find(([key]) => /email/i.test(key));
  if (emailEntry) return emailEntry[1];
  return entries[0]?.[1] ?? "—";
}

function toCsv(rows: FormSubmission[]): string {
  const fieldKeys = Array.from(new Set(rows.flatMap((r) => Object.keys(r.data))));
  const header = ["Submission Date", "Form", "Page", ...fieldKeys];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [new Date(r.createdAt).toLocaleString(), r.formId, r.pageSlug, ...fieldKeys.map((k) => r.data[k] ?? "")].map((v) => escape(String(v))).join(",")
  );
  return [header.map(escape).join(","), ...lines].join("\n");
}

export default function FormSubmissionsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <FormSubmissionsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function FormSubmissionsContent() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formFilter, setFormFilter] = useState("");
  const [pageFilter, setPageFilter] = useState("");
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<"all" | "unread">("all");

  const load = useCallback(() => {
    api.getFormSubmissions().then(setSubmissions).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const forms = useMemo(() => Array.from(new Set(submissions.map((s) => s.formId))).sort(), [submissions]);
  const pages = useMemo(() => Array.from(new Set(submissions.map((s) => s.pageSlug))).sort(), [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      if (formFilter && s.formId !== formFilter) return false;
      if (pageFilter && s.pageSlug !== pageFilter) return false;
      if (readFilter === "unread" && s.read) return false;
      if (search) {
        const haystack = `${mainValue(s)} ${Object.values(s.data).join(" ")}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [submissions, formFilter, pageFilter, readFilter, search]);

  const unreadCount = submissions.filter((s) => !s.read).length;

  async function markRead(id: string, read: boolean) {
    try {
      await api.markFormSubmissionRead(id, read);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this submission? This can't be undone.")) return;
    try {
      await api.deleteFormSubmission(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  function exportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Form Submissions</h1>
          <p className="mt-1 text-sm text-zinc-300">
            All ({submissions.length}) · Unread ({unreadCount})
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-amber-400 hover:text-amber-400 disabled:opacity-40"
        >
          Export to CSV
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
        />
        <select
          value={pageFilter}
          onChange={(e) => setPageFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
        >
          <option value="">All Pages</option>
          {pages.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={formFilter}
          onChange={(e) => setFormFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
        >
          <option value="">All Forms</option>
          {forms.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          value={readFilter}
          onChange={(e) => setReadFilter(e.target.value as "all" | "unread")}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
        >
          <option value="all">All Time</option>
          <option value="unread">Unread Only</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Main</th>
              <th className="px-4 py-2">Form</th>
              <th className="px-4 py-2">Page</th>
              <th className="px-4 py-2">Submission Date</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No submissions yet.
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className={`border-t border-zinc-800 align-top ${s.read ? "" : "bg-amber-400/[0.03]"}`}>
                <td className="px-4 py-2">
                  <Link href={`/form-submissions/${s.id}`} className="font-medium text-zinc-100 hover:text-amber-400">
                    {!s.read && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />}
                    {mainValue(s)}
                  </Link>
                </td>
                <td className="px-4 py-2 text-xs text-zinc-400">{s.formId}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{s.pageSlug}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-xs">
                  <Link href={`/form-submissions/${s.id}`} className="text-zinc-400 hover:text-amber-400">
                    View
                  </Link>
                  <button type="button" onClick={() => markRead(s.id, !s.read)} className="ml-3 text-zinc-400 hover:text-amber-400">
                    {s.read ? "Mark Unread" : "Mark Read"}
                  </button>
                  <button type="button" onClick={() => remove(s.id)} className="ml-3 text-zinc-400 hover:text-red-400">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
