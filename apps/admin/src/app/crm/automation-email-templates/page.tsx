"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { RichTextEditor } from "@/components/RichTextEditor";
import { api, type AutomationEmailTemplate } from "@/lib/api";

type FormState = { id?: string; name: string; subject: string; htmlBody: string };
const EMPTY_FORM: FormState = { name: "", subject: "", htmlBody: "<p>Hi {{firstName}},</p>" };

export default function AutomationEmailTemplatesPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <TemplatesContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function TemplatesContent() {
  const [templates, setTemplates] = useState<AutomationEmailTemplate[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getAutomationEmailTemplates().then(setTemplates).catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);
  useEffect(load, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      if (form.id) await api.updateAutomationEmailTemplate(form.id, { name: form.name, subject: form.subject, htmlBody: form.htmlBody });
      else await api.createAutomationEmailTemplate({ name: form.name, subject: form.subject, htmlBody: form.htmlBody });
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete the email template "${name}"?`)) return;
    try {
      await api.deleteAutomationEmailTemplate(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete template");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Marketing Email Templates</h1>
          <p className="mt-1 text-sm text-zinc-300">Reusable email bodies for a workflow&apos;s &quot;Send Email Template&quot; action.</p>
        </div>
        <button onClick={() => setForm(EMPTY_FORM)} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
          New Template
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {form ? (
        <form onSubmit={handleSave} className="mt-4 flex max-w-2xl flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Subject</label>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Use {{firstName}}, {{lastName}}, {{email}}, {{company}}"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Body</label>
            <RichTextEditor value={form.htmlBody} onChange={(html) => setForm({ ...form, htmlBody: html })} />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                    No templates yet.
                  </td>
                </tr>
              )}
              {templates.map((t) => (
                <tr key={t.id} className="border-t border-zinc-800">
                  <td className="px-4 py-2">{t.name}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{t.subject}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => setForm({ id: t.id, name: t.name, subject: t.subject, htmlBody: t.htmlBody })}
                      className="mr-3 text-xs text-amber-400 hover:underline"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t.id, t.name)} className="text-xs text-red-400 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
