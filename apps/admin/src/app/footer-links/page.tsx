"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type FooterLink } from "@/lib/api";

type FormState = { id?: string; group: string; label: string; href: string; order: number; active: boolean };
const EMPTY_FORM: FormState = { group: "Quick Links", label: "", href: "", order: 0, active: true };

export default function FooterLinksPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <FooterLinksContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function FooterLinksContent() {
  const [links, setLinks] = useState<FooterLink[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getFooterLinks().then(setLinks).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  function startEdit(link?: FooterLink) {
    setError(null);
    if (!link) return setForm(EMPTY_FORM);
    setForm({ id: link.id, group: link.group, label: link.label, href: link.href, order: link.order, active: link.active });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    const payload = { group: form.group, label: form.label, href: form.href, order: form.order, active: form.active };
    try {
      if (form.id) await api.updateFooterLink(form.id, payload);
      else await api.createFooterLink(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this footer link?")) return;
    try {
      await api.deleteFooterLink(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete link");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Footer Links</h1>
        <button onClick={() => startEdit()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
          + Add New
        </button>
      </div>
      <p className="mt-1 text-sm text-zinc-300">Controls the &quot;Quick Links&quot; and &quot;Legal&quot; columns in the site footer.</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-3 font-semibold">{form.id ? "Edit Link" : "New Link"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Group</label>
              <select
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              >
                <option>Quick Links</option>
                <option>Legal</option>
              </select>
            </div>
            <LabeledInput label="Order" type="number" value={String(form.order)} onChange={(v) => setForm({ ...form, order: Number(v) })} />
            <LabeledInput label="Label" value={form.label} onChange={(v) => setForm({ ...form, label: v })} required />
            <LabeledInput label="URL" value={form.href} onChange={(v) => setForm({ ...form, href: v })} required />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-2">Group</th>
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">URL</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id} className="border-t border-zinc-800">
                <td className="px-4 py-2">{l.group}</td>
                <td className="px-4 py-2">{l.order}</td>
                <td className="px-4 py-2">{l.label}</td>
                <td className="px-4 py-2 text-xs text-zinc-400">{l.href}</td>
                <td className="px-4 py-2">{l.active ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => startEdit(l)} className="mr-2 text-xs text-amber-400 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(l.id)} className="text-xs text-red-400 hover:underline">
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

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
      />
    </div>
  );
}
