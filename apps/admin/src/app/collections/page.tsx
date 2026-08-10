"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type Collection } from "@/lib/api";

type FormState = { key: string; name: string; description: string };
const EMPTY_FORM: FormState = { key: "", name: "", description: "" };

export default function CollectionsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <CollectionsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

function CollectionsContent() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.getCollections().then(setCollections).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      await api.createCollection(form);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete collection "${name}"? This also deletes all of its fields and items.`)) return;
    try {
      await api.deleteCollection(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Collections</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Reusable, structured content (case studies, team members, anything else) — feeds the Loop Grid, Loop Carousel, Portfolio, and
            Collection List blocks in the page builder.
          </p>
        </div>
        <button
          onClick={() => setForm(form ? null : { ...EMPTY_FORM })}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300"
        >
          {form ? "Cancel" : "+ New Collection"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h2 className="mb-3 font-semibold">New Collection</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const autoKey = form.key === slugify(form.name) ? slugify(name) : form.key;
                  setForm({ ...form, name, key: autoKey });
                }}
                placeholder="e.g. Case Studies"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Key (used as collectionKey in the builder)</label>
              <input
                required
                value={form.key}
                onChange={(e) => setForm({ ...form, key: slugify(e.target.value) })}
                placeholder="e.g. case-studies"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs text-zinc-400">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collections.length === 0 && <p className="text-sm text-zinc-500">No collections yet.</p>}
        {collections.map((c) => (
          <div key={c.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="mt-0.5 font-mono text-xs text-zinc-500">{c.key}</p>
              </div>
              <button onClick={() => handleDelete(c.id, c.name)} className="text-xs text-red-400 hover:underline">
                Delete
              </button>
            </div>
            {c.description && <p className="mt-2 text-sm text-zinc-400">{c.description}</p>}
            <p className="mt-3 text-xs text-zinc-500">
              {c._count?.fields ?? 0} field{c._count?.fields === 1 ? "" : "s"} · {c._count?.items ?? 0} item{c._count?.items === 1 ? "" : "s"}
            </p>
            <Link href={`/collections/${c.id}`} className="mt-3 inline-block text-sm text-amber-400 hover:underline">
              Manage →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
