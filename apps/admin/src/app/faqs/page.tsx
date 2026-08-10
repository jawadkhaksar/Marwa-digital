"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type Faq } from "@/lib/api";

type FormState = {
  id?: string;
  question: string;
  answer: string;
  order: number;
  published: boolean;
};

const EMPTY_FORM: FormState = { question: "", answer: "", order: 0, published: true };

export default function FaqsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <FaqsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function FaqsContent() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getFaqs().then(setFaqs).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  function startEdit(faq?: Faq) {
    setError(null);
    if (!faq) {
      setForm({ ...EMPTY_FORM, order: faqs.length });
      return;
    }
    setForm({ id: faq.id, question: faq.question, answer: faq.answer, order: faq.order, published: faq.published });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);

    const payload = { question: form.question, answer: form.answer, order: form.order, published: form.published };

    try {
      if (form.id) await api.updateFaq(form.id, payload);
      else await api.createFaq(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save FAQ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await api.deleteFaq(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete FAQ");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">FAQs</h1>
        <button onClick={() => startEdit()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
          + Add FAQ
        </button>
      </div>
      <p className="mt-1 text-sm text-zinc-300">Powers the homepage &quot;Frequently Asked Questions&quot; section, in order.</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-3 font-semibold">{form.id ? "Edit FAQ" : "New FAQ"}</h2>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Question</label>
              <input
                required
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Answer</label>
              <textarea
                required
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Order</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                Published
              </label>
            </div>
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
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Question</th>
              <th className="px-4 py-2">Published</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {faqs.map((f) => (
              <tr key={f.id} className="border-t border-zinc-800">
                <td className="px-4 py-2">{f.order}</td>
                <td className="max-w-md truncate px-4 py-2">{f.question}</td>
                <td className="px-4 py-2">{f.published ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => startEdit(f)} className="mr-2 text-xs text-amber-400 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(f.id)} className="text-xs text-red-400 hover:underline">
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
