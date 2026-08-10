"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { BulkActionBar } from "@/components/BulkActionBar";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { api, type ContactListItem, type ContactStatus } from "@/lib/api";

const STATUSES: ContactStatus[] = ["LEAD", "OPPORTUNITY", "CUSTOMER", "ARCHIVED"];

const STATUS_BADGE: Record<ContactStatus, string> = {
  LEAD: "bg-zinc-700/40 text-zinc-300",
  OPPORTUNITY: "bg-blue-500/20 text-blue-300",
  CUSTOMER: "bg-emerald-500/20 text-emerald-300",
  ARCHIVED: "bg-zinc-800 text-zinc-500",
};

function contactName(c: ContactListItem): string {
  const name = [c.firstName, c.lastName].filter(Boolean).join(" ");
  return name || c.email;
}

export default function CrmContactsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <ContactsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function ContactsContent() {
  const [result, setResult] = useState<{ items: ContactListItem[]; total: number; page: number; limit: number } | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ContactStatus | "">("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    api
      .getContacts({ page, limit: 20, search: search || undefined, status: status || undefined })
      .then(setResult)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load contacts"));
  }, [page, search, status]);

  useEffect(load, [load]);
  // Selection is page/filter-scoped — a row selected before paging/filtering
  // away is no longer on screen, so clear it rather than leave a phantom
  // count in the bulk-action bar. A real "sync local state from an external
  // signal" effect, same as DashboardShell's nav-group auto-expand.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set());
  }, [page, search, status]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const items = result?.items ?? [];
    setSelected((prev) => (prev.size === items.length && items.length > 0 ? new Set() : new Set(items.map((c) => c.id))));
  }

  async function confirmBulkDelete() {
    setDeleting(true);
    setError(null);
    try {
      await api.bulkDeleteContacts(Array.from(selected));
      setSelected(new Set());
      setConfirmingBulkDelete(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete selected contacts");
    } finally {
      setDeleting(false);
    }
  }

  async function createContact(email: string) {
    try {
      const contact = await api.createContact({ email });
      setCreating(false);
      load();
      return contact;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contact");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="mt-1 text-sm text-zinc-300">Every lead and customer unified from inquiries, forms, and manual entries.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950">
          + Add Contact
        </button>
      </div>

      {creating && <NewContactForm onCancel={() => setCreating(false)} onSubmit={createContact} />}

      <div className="mt-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search name, email, or company…"
          className="w-full max-w-xs rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as ContactStatus | "");
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="w-10 px-4 py-2">
                <input
                  type="checkbox"
                  checked={(result?.items.length ?? 0) > 0 && selected.size === result?.items.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-950"
                />
              </th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Company</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Tags</th>
              <th className="px-4 py-2">Deals</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {result?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  No contacts yet.
                </td>
              </tr>
            )}
            {result?.items.map((c) => (
              <tr key={c.id} className={`border-t border-zinc-800 align-top hover:bg-zinc-900/40 ${selected.has(c.id) ? "bg-amber-400/5" : ""}`}>
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-950"
                  />
                </td>
                <td className="px-4 py-2">
                  <Link href={`/crm/contacts/${c.id}`} className="font-medium hover:text-amber-400">
                    {contactName(c)}
                  </Link>
                  <div className="text-xs text-zinc-500">{c.email}</div>
                </td>
                <td className="px-4 py-2 text-xs text-zinc-400">{c.company ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => (
                      <span key={t} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                        {t}
                      </span>
                    ))}
                    {c.tags.length === 0 && <span className="text-xs text-zinc-600">—</span>}
                  </div>
                </td>
                <td className="px-4 py-2 text-xs text-zinc-400">{c.deals.length}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{new Date(c.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && result.total > result.limit && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
          <span>
            Page {result.page} of {Math.ceil(result.total / result.limit)}
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

      <BulkActionBar count={selected.size} onDelete={() => setConfirmingBulkDelete(true)} onClear={() => setSelected(new Set())} />

      {confirmingBulkDelete && (
        <ConfirmDeleteModal
          title="Delete Selected Contacts?"
          message={`Are you sure you want to delete ${selected.size} selected ${selected.size === 1 ? "contact" : "contacts"}? This action cannot be undone.`}
          confirmLabel={`Delete ${selected.size}`}
          busy={deleting}
          onConfirm={confirmBulkDelete}
          onCancel={() => setConfirmingBulkDelete(false)}
        />
      )}
    </div>
  );
}

function NewContactForm({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim()) return;
        onSubmit(email.trim());
      }}
      className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
    >
      <input
        autoFocus
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="contact@email.com"
        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
      />
      <button type="submit" className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-zinc-950">
        Create
      </button>
      <button type="button" onClick={onCancel} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400">
        Cancel
      </button>
    </form>
  );
}
