"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { RequireAdmin } from "@/components/RequireAdmin";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type SiteSettings, type Page } from "@/lib/api";

// The three reserved-slug "Convert to Builder" override pages (see
// apps/admin/src/app/pages/page.tsx's CORE_PAGES / apps/web's
// CORE_OVERRIDE_SLUGS) aren't real, admin-authored content — they're a
// virtual extra column bolted onto Home/Contact/Tours, and picking one of
// them as the site's Homepage/Posts page here would be either redundant
// (core-home already renders at `/`) or nonsensical (core-tours has
// nothing to do with a blog index). Excluded from both dropdowns below.
const RESERVED_CORE_SLUGS = new Set(["core-home", "core-contact", "core-tours"]);

export default function ReadingSettingsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <RequireAdmin>
          <ReadingSettingsContent />
        </RequireAdmin>
      </DashboardShell>
    </AuthGuard>
  );
}

function ReadingSettingsContent() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch((err) => setError(err.message));
    api.getPages().then(setPages).catch(() => {});
  }, []);

  // Draft/unpublished pages would 404 the moment a visitor lands on `/` or
  // `/blog` — only published, non-reserved pages are selectable here.
  const selectablePages = pages.filter((p) => p.published && !RESERVED_CORE_SLUGS.has(p.slug));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateSettings({
        homepageDisplay: settings.homepageDisplay,
        homepagePageSlug: settings.homepagePageSlug,
        postsPageSlug: settings.postsPageSlug,
        postsPerPage: settings.postsPerPage,
        feedItemCount: settings.feedItemCount,
        feedContentMode: settings.feedContentMode,
        searchEngineNoindex: settings.searchEngineNoindex,
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Reading Settings</h1>
      <p className="mt-1 text-sm text-zinc-300">Controls what the homepage shows and how the blog archive paginates.</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-400">Settings saved.</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div>
          <label className="mb-2 block text-xs text-zinc-400">Your homepage displays</label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                checked={settings.homepageDisplay === "posts"}
                onChange={() => setSettings({ ...settings, homepageDisplay: "posts" })}
                className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              Your latest posts
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                checked={settings.homepageDisplay === "static"}
                onChange={() => setSettings({ ...settings, homepageDisplay: "static" })}
                className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              A static page
            </label>
          </div>

          <div className="mt-3 grid gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">Homepage</label>
              <select
                value={settings.homepagePageSlug ?? ""}
                onChange={(e) => setSettings({ ...settings, homepagePageSlug: e.target.value || null })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              >
                <option value="">— Default (built-in homepage) —</option>
                {selectablePages.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.title} (/{p.slug})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">Posts page</label>
              <select
                value={settings.postsPageSlug ?? ""}
                onChange={(e) => setSettings({ ...settings, postsPageSlug: e.target.value || null })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              >
                <option value="">— Default (built-in blog archive) —</option>
                {selectablePages.map((p) => (
                  <option key={p.id} value={p.slug}>
                    {p.title} (/{p.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            Pick any published Page to render at <code>/</code> (only used while &quot;A static page&quot; above is selected) or
            in place of the blog archive at <code>/blog</code>. Leave on Default to keep this site&apos;s built-in
            homepage/archive. Only published pages appear here — a page pulled back to draft falls back to the default
            automatically rather than 404ing.
          </p>
        </div>

        <div className="grid gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Blog pages show at most</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={50}
                value={settings.postsPerPage}
                onChange={(e) => setSettings({ ...settings, postsPerPage: Math.max(1, Number(e.target.value) || 1) })}
                className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
              <span className="text-sm text-zinc-500">posts</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Syndication feeds show the most recent</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={50}
                value={settings.feedItemCount}
                onChange={(e) => setSettings({ ...settings, feedItemCount: Math.max(1, Number(e.target.value) || 1) })}
                className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
              />
              <span className="text-sm text-zinc-500">items</span>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <label className="mb-2 block text-xs text-zinc-400">For each post in a feed, include</label>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                checked={settings.feedContentMode === "full"}
                onChange={() => setSettings({ ...settings, feedContentMode: "full" })}
                className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              Full text
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                checked={settings.feedContentMode === "excerpt"}
                onChange={() => setSettings({ ...settings, feedContentMode: "excerpt" })}
                className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              Excerpt
            </label>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            Live at <code>/feed.xml</code>.
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={settings.searchEngineNoindex}
              onChange={(e) => setSettings({ ...settings, searchEngineNoindex: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
            />
            Discourage search engines from indexing this site
          </label>
          <p className="mt-1 text-[11px] text-zinc-500">
            It is up to search engines to honor this request. Adds a sitewide <code>noindex, nofollow</code> meta tag.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-fit rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
