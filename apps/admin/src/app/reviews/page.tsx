"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type Review } from "@/lib/api";

type FormState = {
  id?: string;
  customerName: string;
  quote: string;
  rating: number;
  source: string;
  published: boolean;
};

const EMPTY_FORM: FormState = { customerName: "", quote: "", rating: 5, source: "Website", published: true };

export default function ReviewsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <ReviewsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function ReviewsContent() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getReviews().then(setReviews).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  function startEdit(review?: Review) {
    setError(null);
    if (!review) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      id: review.id,
      customerName: review.customerName,
      quote: review.quote,
      rating: review.rating,
      source: review.source,
      published: review.published,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);

    const payload = {
      customerName: form.customerName,
      quote: form.quote,
      rating: form.rating,
      source: form.source,
      published: form.published,
    };

    try {
      if (form.id) await api.updateReview(form.id, payload);
      else await api.createReview(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this review?")) return;
    try {
      await api.deleteReview(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete review");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Reviews</h1>
        <button onClick={() => startEdit()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
          + Add New
        </button>
      </div>
      <p className="mt-1 text-sm text-zinc-300">Published reviews appear in the Testimonials section on the homepage.</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-3 font-semibold">{form.id ? "Edit Review" : "New Review"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput label="Customer Name" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} required />
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              >
                <option>Website</option>
                <option>Google</option>
                <option>Trustpilot</option>
                <option>Tripadvisor</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Rating</label>
              <select
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} Stars
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published
            </label>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-zinc-400">Quote</label>
              <textarea
                value={form.quote}
                onChange={(e) => setForm({ ...form, quote: e.target.value })}
                rows={3}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
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
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Quote</th>
              <th className="px-4 py-2">Rating</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Published</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id} className="border-t border-zinc-800">
                <td className="px-4 py-2">{r.customerName}</td>
                <td className="max-w-xs truncate px-4 py-2 text-zinc-400">{r.quote}</td>
                <td className="px-4 py-2">{r.rating} ★</td>
                <td className="px-4 py-2">{r.source}</td>
                <td className="px-4 py-2">{r.published ? "Yes" : "No"}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => startEdit(r)} className="mr-2 text-xs text-amber-400 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:underline">
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
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
      />
    </div>
  );
}
