"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { RichTextEditor } from "@/components/RichTextEditor";
import { api, type Page, type PageTemplate, type MediaAsset } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "page"
  );
}

const TEMPLATES: { value: PageTemplate; label: string }[] = [
  { value: "default", label: "1 — Default" },
  { value: "full-width", label: "2 — Full Width" },
  { value: "sidebar", label: "3 — Sidebar" },
  { value: "landing", label: "4 — Landing" },
  { value: "contact", label: "5 — Contact" },
];

type FormState = {
  id?: string;
  slug: string;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  metaRobotsIndex: boolean;
  metaRobotsFollow: boolean;
  headTags: string;
  customCss: string;
  customJs: string;
  template: PageTemplate;
  published: boolean;
};

const EMPTY_FORM: FormState = {
  slug: "",
  title: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogImage: "",
  metaRobotsIndex: true,
  metaRobotsFollow: true,
  headTags: "",
  customCss: "",
  customJs: "",
  template: "default",
  published: true,
};

type QuickEditState = {
  id: string;
  title: string;
  slug: string;
  template: PageTemplate;
  published: boolean;
};

export default function PagesPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <PagesContent />
      </DashboardShell>
    </AuthGuard>
  );
}

const PAGE_SIZE = 20;

function PagesContent() {
  const [pages, setPages] = useState<Page[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);

  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [quickEdit, setQuickEdit] = useState<QuickEditState | null>(null);
  const [quickEditSaving, setQuickEditSaving] = useState(false);
  const [aiSeoLoading, setAiSeoLoading] = useState(false);
  const [aiSeoError, setAiSeoError] = useState<string | null>(null);

  async function handleAiGenerateSeo() {
    if (!form) return;
    setAiSeoLoading(true);
    setAiSeoError(null);
    try {
      const result = await api.aiGenerateSeo({ title: form.title, content: form.content });
      setForm((f) =>
        f
          ? { ...f, metaTitle: result.metaTitle, metaDescription: result.metaDescription, metaKeywords: result.focusKeywords.join(", ") }
          : f
      );
    } catch (err) {
      setAiSeoError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setAiSeoLoading(false);
    }
  }

  const load = useCallback(() => {
    api.getPages().then(setPages).catch((err) => setError(err.message));
  }, []);

  useEffect(load, [load]);

  const publishedCount = pages.filter((p) => p.published).length;
  const draftCount = pages.length - publishedCount;
  const totalCount = pages.length;

  const searchQuery = search.trim().toLowerCase();

  const filteredPages = pages
    .filter((p) => (statusFilter === "all" ? true : statusFilter === "published" ? p.published : !p.published))
    .filter((p) => {
      if (!searchQuery) return true;
      return p.title.toLowerCase().includes(searchQuery) || p.slug.toLowerCase().includes(searchQuery);
    });

  const totalPages = Math.max(1, Math.ceil(filteredPages.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visiblePages = filteredPages.slice(pageStart, pageStart + PAGE_SIZE);

  function changeStatusFilter(next: typeof statusFilter) {
    setStatusFilter(next);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }

  function changeSearch(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const allSelected = visiblePages.every((p) => prev.has(p.id));
      if (allSelected) {
        const next = new Set(prev);
        visiblePages.forEach((p) => next.delete(p.id));
        return next;
      }
      const next = new Set(prev);
      visiblePages.forEach((p) => next.add(p.id));
      return next;
    });
  }

  async function applyBulkAction() {
    if (bulkAction !== "delete" || selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} page(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.deletePage(id)));
      setSelectedIds(new Set());
      setBulkAction("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk delete failed");
    }
  }

  function startEdit(page?: Page) {
    setError(null);
    setShowBannerPicker(false);
    setQuickEdit(null);
    if (!page) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      id: page.id,
      slug: page.slug,
      title: page.title,
      content: page.content,
      metaTitle: page.metaTitle ?? "",
      metaDescription: page.metaDescription ?? "",
      metaKeywords: page.metaKeywords ?? "",
      ogImage: page.ogImage ?? "",
      metaRobotsIndex: page.metaRobotsIndex,
      metaRobotsFollow: page.metaRobotsFollow,
      headTags: page.headTags ?? "",
      customCss: page.customCss ?? "",
      customJs: page.customJs ?? "",
      template: page.template,
      published: page.published,
    });
  }

  function openQuickEdit(page: Page) {
    setForm(null);
    setError(null);
    setQuickEdit({ id: page.id, title: page.title, slug: page.slug, template: page.template, published: page.published });
  }

  async function submitQuickEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickEdit) return;
    setQuickEditSaving(true);
    setError(null);
    try {
      await api.updatePage(quickEdit.id, {
        title: quickEdit.title,
        slug: quickEdit.slug.trim() || slugify(quickEdit.title),
        template: quickEdit.template,
        published: quickEdit.published,
      });
      setQuickEdit(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setQuickEditSaving(false);
    }
  }

  function openBannerPicker() {
    setShowBannerPicker((v) => !v);
    if (media.length === 0) api.getMedia().then(setMedia).catch(() => {});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);

    const payload = {
      slug: form.slug.trim() || slugify(form.title),
      title: form.title,
      content: form.content,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      metaKeywords: form.metaKeywords || null,
      ogImage: form.ogImage || null,
      metaRobotsIndex: form.metaRobotsIndex,
      metaRobotsFollow: form.metaRobotsFollow,
      headTags: form.headTags || null,
      customCss: form.customCss || null,
      customJs: form.customJs || null,
      template: form.template,
      published: form.published,
    };

    try {
      if (form.id) await api.updatePage(form.id, payload);
      else await api.createPage(payload);
      setForm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save page");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this page?")) return;
    try {
      await api.deletePage(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete page");
    }
  }

  async function handleDuplicate(page: Page) {
    try {
      const baseSlug = `${page.slug}-copy`;
      let slug = baseSlug;
      let n = 2;
      while (pages.some((existing) => existing.slug === slug)) {
        slug = `${baseSlug}-${n}`;
        n++;
      }
      await api.createPage({
        title: `${page.title} (Copy)`,
        slug,
        editorMode: page.editorMode,
        content: page.content,
        layout: page.layout,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        metaKeywords: page.metaKeywords,
        ogImage: page.ogImage,
        metaRobotsIndex: page.metaRobotsIndex,
        metaRobotsFollow: page.metaRobotsFollow,
        headTags: page.headTags,
        customCss: page.customCss,
        customJs: page.customJs,
        template: page.template,
        // Duplicates start as drafts — never want a copy silently going
        // live at a "-copy" slug just from cloning a published page.
        published: false,
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate page");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <div className="flex gap-2">
          <button onClick={() => startEdit()} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">
            + Create New Page (Classic)
          </button>
          <Link
            href="/builder/new"
            className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300"
          >
            + Create Visual Page
          </Link>
        </div>
      </div>
      <p className="mt-1 text-sm text-zinc-300">
        Every page — Classic or Visual — lives in this one list, served at {WEB_URL}/&lt;slug&gt;.
      </p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-sm text-zinc-400">
          <FilterTab label="All" count={totalCount} active={statusFilter === "all"} onClick={() => changeStatusFilter("all")} />
          <span className="text-zinc-700">|</span>
          <FilterTab label="Published" count={publishedCount} active={statusFilter === "published"} onClick={() => changeStatusFilter("published")} />
          <span className="text-zinc-700">|</span>
          <FilterTab label="Draft" count={draftCount} active={statusFilter === "draft"} onClick={() => changeStatusFilter("draft")} />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder="Search pages…"
          className="w-56 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
        />
      </div>

      {form && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{form.id ? `Page edit — ${form.slug}` : "Create New Page"}</h2>
            {form.id && (
              <a
                href={`${WEB_URL}/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Preview
              </a>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <LabeledInput
              label="Page Name / Title"
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v, slug: !form.id && !form.slug.trim() ? slugify(v) : form.slug })}
              required
            />
            <LabeledInput
              label="Page URL (slug)"
              value={form.slug}
              onChange={(v) => setForm({ ...form, slug: v })}
              disabled={Boolean(form.id)}
              placeholder={form.title ? slugify(form.title) : undefined}
            />
          </div>
          {(form.slug || form.title) && (
            <p className="text-xs text-zinc-500">Page url: {WEB_URL}/{form.slug || slugify(form.title)}</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Template</label>
              <select
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value as PageTemplate })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              >
                {TEMPLATES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Content</label>
            <RichTextEditor value={form.content} onChange={(html) => setForm({ ...form, content: html })} />
          </div>

          <details className="rounded-lg border border-zinc-800">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-300">SEO &amp; Social Sharing</summary>
            <div className="grid gap-3 p-3 pt-0 sm:grid-cols-2">
              <div className="flex items-center justify-between sm:col-span-2">
                <p className="text-[11px] text-zinc-500">Populate the fields below from this page&apos;s title and content.</p>
                <button
                  type="button"
                  onClick={handleAiGenerateSeo}
                  disabled={aiSeoLoading || !form.content}
                  className="flex items-center gap-1 rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
                >
                  {aiSeoLoading ? "Generating…" : "✨ Auto-Generate with AI"}
                </button>
              </div>
              {aiSeoError && <p className="text-xs text-red-400 sm:col-span-2">{aiSeoError}</p>}
              <LabeledInput label="Meta Title" value={form.metaTitle} onChange={(v) => setForm({ ...form, metaTitle: v })} />
              <LabeledInput label="Meta Keywords" value={form.metaKeywords} onChange={(v) => setForm({ ...form, metaKeywords: v })} />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-zinc-400">Meta Description</label>
                <textarea
                  value={form.metaDescription}
                  onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-zinc-400">OG Banner (social share image)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.ogImage}
                    onChange={(e) => setForm({ ...form, ogImage: e.target.value })}
                    placeholder="/uploads/… or paste a URL"
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                  />
                  <button type="button" onClick={openBannerPicker} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
                    Select Banner
                  </button>
                </div>
                {showBannerPicker && (
                  <div className="mt-2 grid grid-cols-4 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-2 sm:grid-cols-6">
                    {media.length === 0 && <p className="col-span-full text-xs text-zinc-500">No images in Gallery yet.</p>}
                    {media.map((m) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.id}
                        src={`${API_URL}${m.url}`}
                        alt={m.filename}
                        onClick={() => {
                          setForm({ ...form, ogImage: m.url });
                          setShowBannerPicker(false);
                        }}
                        className="h-16 w-full cursor-pointer rounded object-cover ring-2 ring-transparent hover:ring-amber-400"
                      />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Search Engine Indexing</label>
                <select
                  value={form.metaRobotsIndex ? "index" : "noindex"}
                  onChange={(e) => setForm({ ...form, metaRobotsIndex: e.target.value === "index" })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  <option value="index">Index</option>
                  <option value="noindex">No Index</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Link Following</label>
                <select
                  value={form.metaRobotsFollow ? "follow" : "nofollow"}
                  onChange={(e) => setForm({ ...form, metaRobotsFollow: e.target.value === "follow" })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                >
                  <option value="follow">Follow</option>
                  <option value="nofollow">No Follow</option>
                </select>
              </div>
              {(!form.metaRobotsIndex || !form.metaRobotsFollow) && (
                <p className="sm:col-span-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-300">
                  {!form.metaRobotsIndex && !form.metaRobotsFollow
                    ? "This page will be hidden from search results and its links won't be crawled."
                    : !form.metaRobotsIndex
                      ? "This page will be hidden from search results (won't appear in Google, etc.)."
                      : "Search engines will index this page but won't follow its outbound links."}
                </p>
              )}
            </div>
          </details>

          <details className="rounded-lg border border-zinc-800">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-zinc-300">Head Tags &amp; Custom Code</summary>
            <div className="flex flex-col gap-3 p-3 pt-0">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Head Tags (embed / tracking snippets)</label>
                <textarea
                  value={form.headTags}
                  onChange={(e) => setForm({ ...form, headTags: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Custom CSS</label>
                <textarea
                  value={form.customCss}
                  onChange={(e) => setForm({ ...form, customCss: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Custom JS</label>
                <textarea
                  value={form.customJs}
                  onChange={(e) => setForm({ ...form, customJs: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </details>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50">
              {saving ? "Saving…" : "Update"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-3 flex items-center gap-2">
        <select
          value={bulkAction}
          onChange={(e) => setBulkAction(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm"
        >
          <option value="">Bulk actions</option>
          <option value="delete">Delete</option>
        </select>
        <button
          onClick={applyBulkAction}
          disabled={!bulkAction || selectedIds.size === 0}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-40"
        >
          Apply
        </button>
        {selectedIds.size > 0 && <span className="text-xs text-zinc-500">{selectedIds.size} selected</span>}
      </div>

      <div className="mt-2 overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="w-10 px-4 py-2">
                <input
                  type="checkbox"
                  checked={visiblePages.length > 0 && visiblePages.every((p) => selectedIds.has(p.id))}
                  onChange={toggleSelectAllVisible}
                />
              </th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {visiblePages.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-500">
                  No pages found.
                </td>
              </tr>
            )}
            {visiblePages.map((p) => (
              <Fragment key={p.id}>
              <tr className="group border-t border-zinc-800 hover:bg-zinc-900/60">
                <td className="px-4 py-3 align-top">
                  <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelected(p.id)} />
                </td>
                <td className="px-4 py-3">
                  <div>
                    <Link href={`/builder/${p.id}`} className="font-semibold text-amber-400 hover:underline">
                      {p.title}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-500">— {p.editorMode === "BUILDER" ? "Visual Builder" : "Classic"}</span>
                  </div>
                  <div className="mt-1 flex gap-2 text-xs text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => startEdit(p)} className="hover:text-amber-400 hover:underline">
                      Edit
                    </button>
                    <span>|</span>
                    <button onClick={() => openQuickEdit(p)} className="hover:text-amber-400 hover:underline">
                      Quick Edit
                    </button>
                    <span>|</span>
                    <Link href={`/builder/${p.id}`} className="hover:text-amber-400 hover:underline">
                      {p.editorMode === "BUILDER" ? "Open Builder" : "Convert to Builder"}
                    </Link>
                    <span>|</span>
                    <a href={`${WEB_URL}/${p.slug}`} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 hover:underline">
                      View
                    </a>
                    <span>|</span>
                    <button onClick={() => handleDuplicate(p)} className="hover:text-amber-400 hover:underline">
                      Duplicate
                    </button>
                    <span>|</span>
                    <button onClick={() => handleDelete(p.id)} className="hover:text-red-400 hover:underline">
                      Delete
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className={p.published ? "text-emerald-400" : "text-zinc-500"}>{p.published ? "Published" : "Draft"}</span>
                </td>
                <td className="px-4 py-3 align-top text-zinc-400">
                  {new Date(p.updatedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </td>
              </tr>
              {quickEdit?.id === p.id && (
                <tr className="border-t border-amber-400/30 bg-zinc-900">
                  <td colSpan={4} className="px-4 py-4">
                    <form onSubmit={submitQuickEdit} className="flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Quick Edit</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <LabeledInput
                          label="Title"
                          value={quickEdit.title}
                          onChange={(v) => setQuickEdit({ ...quickEdit, title: v, slug: !quickEdit.slug.trim() ? slugify(v) : quickEdit.slug })}
                          required
                        />
                        <LabeledInput
                          label="Slug"
                          value={quickEdit.slug}
                          onChange={(v) => setQuickEdit({ ...quickEdit, slug: v })}
                          placeholder={quickEdit.title ? slugify(quickEdit.title) : undefined}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">Template</label>
                          <select
                            value={quickEdit.template}
                            onChange={(e) => setQuickEdit({ ...quickEdit, template: e.target.value as PageTemplate })}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                          >
                            {TEMPLATES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-zinc-400">Status</label>
                          <select
                            value={quickEdit.published ? "published" : "draft"}
                            onChange={(e) => setQuickEdit({ ...quickEdit, published: e.target.value === "published" })}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                          >
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={quickEditSaving}
                          className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
                        >
                          {quickEditSaving ? "Saving…" : "Update"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickEdit(null)}
                          className="rounded-lg border border-zinc-700 px-4 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm text-zinc-400">
          <span>
            {filteredPages.length} item{filteredPages.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-zinc-700 px-3 py-1 hover:bg-zinc-800 disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-zinc-700 px-3 py-1 hover:bg-zinc-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={active ? "font-semibold text-amber-400" : "hover:text-amber-400"}
    >
      {label} <span className="text-zinc-600">({count})</span>
    </button>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  required,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <input
        type="text"
        required={required}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none disabled:opacity-50"
      />
    </div>
  );
}
