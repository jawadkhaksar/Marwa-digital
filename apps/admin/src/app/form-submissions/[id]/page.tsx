"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type FormSubmission } from "@/lib/api";

const STATUS_DOT: Record<string, string> = {
  ok: "bg-emerald-400",
  skipped: "bg-zinc-500",
  failed: "bg-red-400",
};

export default function FormSubmissionDetailPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <FormSubmissionDetailContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function FormSubmissionDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.getFormSubmission(params.id).then(setSubmission).catch((err) => setError(err.message));
  }, [params.id]);

  useEffect(load, [load]);

  useEffect(() => {
    // Opening the detail page is the "read" action — matches the reference's own behavior.
    if (submission && !submission.read) {
      api.markFormSubmissionRead(submission.id, true).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?.id]);

  async function remove() {
    if (!submission) return;
    if (!confirm("Delete this submission? This can't be undone.")) return;
    await api.deleteFormSubmission(submission.id);
    router.push("/form-submissions");
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!submission) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div>
      <Link href="/form-submissions" className="text-sm text-zinc-500 hover:text-amber-400">
        ← Back to Submissions
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-3">
              <h1 className="text-sm font-semibold">Submission</h1>
            </div>
            <table className="w-full text-left text-sm">
              <tbody>
                {Object.entries(submission.data).map(([key, value]) => (
                  <tr key={key} className="border-t border-zinc-800 first:border-t-0">
                    <td className="w-40 shrink-0 px-4 py-2.5 text-xs font-medium text-zinc-400">{key}</td>
                    <td className="px-4 py-2.5">{value || <span className="text-zinc-600">—</span>}</td>
                  </tr>
                ))}
                {Object.keys(submission.data).length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-zinc-500">No field data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {submission.actionsLog && submission.actionsLog.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-3">
                <h2 className="text-sm font-semibold">Actions Log</h2>
              </div>
              <div className="flex flex-col divide-y divide-zinc-800">
                {submission.actionsLog.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[entry.status]}`} />
                    <span className="capitalize">{entry.action}</span>
                    <span className="text-xs text-zinc-500">
                      {entry.status === "ok" ? "Completed successfully." : entry.status === "skipped" ? `Skipped — ${entry.detail}` : `Failed — ${entry.detail}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Additional Info</h2>
          <InfoRow label="Form" value={submission.formId} />
          <InfoRow label="Page" value={submission.pageSlug} href={`/${submission.pageSlug}`} />
          <InfoRow label="Submitted" value={new Date(submission.createdAt).toLocaleString()} />
          <InfoRow label="User IP" value={submission.userIp ?? "—"} />
          <InfoRow label="User Agent" value={submission.userAgent ?? "—"} wrap />

          <button
            type="button"
            onClick={remove}
            className="mt-2 w-fit text-xs text-red-400 hover:text-red-300"
          >
            Delete Submission
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, href, wrap }: { label: string; value: string; href?: string; wrap?: boolean }) {
  return (
    <div>
      <div className="text-[11px] text-zinc-500">{label}</div>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-sm text-amber-400 hover:underline">
          {value}
        </a>
      ) : (
        <div className={`text-sm ${wrap ? "break-all text-xs text-zinc-400" : ""}`}>{value}</div>
      )}
    </div>
  );
}
