"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type Category } from "@/lib/api";

type FormState = { id?: string; name: string; slug: string; description: string; color: string };
const EMPTY_FORM: FormState = { name: "", slug: "", description: "", color: "#2563ff" };

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function CategoriesPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <CategoriesContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function CategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getCategories().then(setCategories).catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  function startEdit(c?: Category) {
    setError(null);
    setSlugTouched(Boolean(c));
    setForm(c ? { id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", color: c.color ?? "#2563ff" } : EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    const payload = { name: form.name, slug: form.slug || undefined, description: form.description || undefined, color: form.color || undefined };
    try {
      if (form.id) await api.updateCategory(form.id, payload);
      else await api.createCategory(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Posts in it will simply lose the category, not be deleted.")) return;
    try {
      await api.deleteCategory(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        {!form && (
          <button onClick={() => startEdit()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
            + Add Category
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 max-w-lg">
          <h2 className="font-semibold">{form.id ? "Edit Category" : "New Category"}</h2>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Slug</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm({ ...form, slug: e.target.value });
              }}
              placeholder={slugify(form.name)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Badge Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-16 rounded border border-zinc-700 bg-zinc-950" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Posts</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No categories yet.
                </td>
              </tr>
            )}
            {categories.map((c) => (
              <tr key={c.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color ?? "#2563ff" }} />
                    {c.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{c.slug}</td>
                <td className="px-4 py-3 text-zinc-400">{c._count?.posts ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(c)} className="text-xs text-amber-400 hover:underline">
                    Edit
                  </button>
                  <span className="mx-2 text-zinc-700">|</span>
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-red-400 hover:underline">
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
