"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type Tag } from "@/lib/api";

type FormState = { id?: string; name: string; slug: string };
const EMPTY_FORM: FormState = { name: "", slug: "" };

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default function TagsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <TagsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function TagsContent() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getTags().then(setTags).catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  function startEdit(t?: Tag) {
    setError(null);
    setSlugTouched(Boolean(t));
    setForm(t ? { id: t.id, name: t.name, slug: t.slug } : EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    const payload = { name: form.name, slug: form.slug || undefined };
    try {
      if (form.id) await api.updateTag(form.id, payload);
      else await api.createTag(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tag");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tag? Posts with it will simply lose the tag, not be deleted.")) return;
    try {
      await api.deleteTag(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tags</h1>
        {!form && (
          <button onClick={() => startEdit()} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300">
            + Add Tag
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5 max-w-lg">
          <h2 className="font-semibold">{form.id ? "Edit Tag" : "New Tag"}</h2>
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
            {tags.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No tags yet.
                </td>
              </tr>
            )}
            {tags.map((t) => (
              <tr key={t.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                <td className="px-4 py-3">{t.name}</td>
                <td className="px-4 py-3 text-zinc-400">{t.slug}</td>
                <td className="px-4 py-3 text-zinc-400">{t._count?.posts ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(t)} className="text-xs text-amber-400 hover:underline">
                    Edit
                  </button>
                  <span className="mx-2 text-zinc-700">|</span>
                  <button onClick={() => handleDelete(t.id)} className="text-xs text-red-400 hover:underline">
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
