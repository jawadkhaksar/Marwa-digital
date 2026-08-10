"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { BulkActionBar } from "@/components/BulkActionBar";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { api, type ContactInquiry } from "@/lib/api";

const STATUSES = ["NEW", "CONTACTED", "CLOSED"];

export default function InquiriesPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <InquiriesContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function InquiriesContent() {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    api.getInquiries().then(setInquiries).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  async function updateStatus(id: string, status: string) {
    try {
      await api.updateInquiryStatus(id, status);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === inquiries.length ? new Set() : new Set(inquiries.map((i) => i.id))));
  }

  async function confirmBulkDelete() {
    setDeleting(true);
    setError(null);
    try {
      await api.bulkDeleteInquiries(Array.from(selected));
      setSelected(new Set());
      setConfirmingBulkDelete(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected inquiries");
    } finally {
      setDeleting(false);
    }
  }

  const allSelected = inquiries.length > 0 && selected.size === inquiries.length;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Contact Inquiries</h1>
      <p className="mt-1 text-sm text-zinc-300">Submissions from the public /contact page booking &amp; quote request form.</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="w-10 px-4 py-2">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-zinc-600 bg-zinc-950" />
              </th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Message</th>
              <th className="px-4 py-2">Received</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  No inquiries yet.
                </td>
              </tr>
            )}
            {inquiries.map((inq) => (
              <tr key={inq.id} className={`border-t border-zinc-800 align-top ${selected.has(inq.id) ? "bg-amber-400/5" : ""}`}>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(inq.id)}
                    onChange={() => toggleOne(inq.id)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-950"
                  />
                </td>
                <td className="px-4 py-2">{inq.name}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">
                  <div>{inq.email}</div>
                  {inq.phone && <div>{inq.phone}</div>}
                </td>
                <td className="px-4 py-2 text-xs">{inq.subject ?? "—"}</td>
                <td className="px-4 py-2 max-w-xs text-xs text-zinc-400">{inq.message ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{new Date(inq.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <select
                    value={inq.status}
                    onChange={(e) => updateStatus(inq.id, e.target.value)}
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs focus:border-amber-400 focus:outline-none"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BulkActionBar count={selected.size} onDelete={() => setConfirmingBulkDelete(true)} onClear={() => setSelected(new Set())} />

      {confirmingBulkDelete && (
        <ConfirmDeleteModal
          title="Delete Selected Inquiries?"
          message={`Are you sure you want to delete ${selected.size} selected ${selected.size === 1 ? "inquiry" : "inquiries"}? This action cannot be undone.`}
          confirmLabel={`Delete ${selected.size}`}
          busy={deleting}
          onConfirm={confirmBulkDelete}
          onCancel={() => setConfirmingBulkDelete(false)}
        />
      )}
    </div>
  );
}
