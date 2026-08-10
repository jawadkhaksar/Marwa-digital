"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { RequireAdmin } from "@/components/RequireAdmin";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type SiteSettings } from "@/lib/api";

// All structures are /blog-relative — this site's blog lives at a fixed
// /blog route (see apps/web's [...parts] catch-all), unlike WordPress where
// permalinks apply at the site root.
const STRUCTURES = [
  { value: "/p/%post_id%", label: "Plain", example: "/blog/p/123" },
  { value: "/%year%/%monthnum%/%day%/%postname%/", label: "Day and name", example: "/blog/2026/07/30/sample-post/" },
  { value: "/%year%/%monthnum%/%postname%/", label: "Month and name", example: "/blog/2026/07/sample-post/" },
  { value: "/archives/%post_id%", label: "Numeric", example: "/blog/archives/123" },
  { value: "/%postname%/", label: "Post name", example: "/blog/sample-post/" },
];

const CUSTOM_TAGS = ["%year%", "%monthnum%", "%day%", "%hour%", "%minute%", "%second%", "%post_id%", "%postname%", "%category%", "%author%"];

function buildExample(structure: string): string {
  const example = structure
    .replace(/%year%/g, "2026")
    .replace(/%monthnum%/g, "07")
    .replace(/%day%/g, "30")
    .replace(/%hour%/g, "07")
    .replace(/%minute%/g, "38")
    .replace(/%second%/g, "45")
    .replace(/%post_id%/g, "123")
    .replace(/%postname%/g, "sample-post")
    .replace(/%category%/g, "travel")
    .replace(/%author%/g, "admin");
  return `/blog${example}`;
}

export default function PermalinksSettingsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <RequireAdmin>
          <PermalinksSettingsContent />
        </RequireAdmin>
      </DashboardShell>
    </AuthGuard>
  );
}

function PermalinksSettingsContent() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [custom, setCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (settings) setCustom(!STRUCTURES.some((s) => s.value === settings.permalinkStructure));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings === null]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateSettings({
        permalinkStructure: settings.permalinkStructure,
        categoryBase: settings.categoryBase,
        tagBase: settings.tagBase,
      });
      setSettings(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function insertTag(tag: string) {
    if (!settings) return;
    setCustom(true);
    setSettings({ ...settings, permalinkStructure: (custom ? settings.permalinkStructure : "") + tag });
  }

  if (!settings) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Permalinks</h1>
      <p className="mt-1 text-sm text-zinc-300">
        Controls how blog post URLs are structured under <code>/blog</code>. Real routing — every option below actually
        changes the live URL, is parsed back by <code>apps/web/src/lib/blogPermalink.ts</code>, and every internal link
        the site generates updates to match.
      </p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-400">Settings saved.</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div>
          <label className="mb-2 block text-xs text-zinc-400">Common Settings</label>
          <div className="flex flex-col gap-2">
            {STRUCTURES.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  checked={!custom && settings.permalinkStructure === s.value}
                  onChange={() => {
                    setCustom(false);
                    setSettings({ ...settings, permalinkStructure: s.value });
                  }}
                  className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
                />
                <span className="w-32 shrink-0">
                  {s.label} {s.value === "/%postname%/" && <span className="text-[10px] text-amber-400">(Recommended)</span>}
                </span>
                <code className="text-[11px] text-zinc-500">{s.example}</code>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                checked={custom}
                onChange={() => setCustom(true)}
                className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              <span className="w-32 shrink-0">Custom Structure</span>
              <input
                type="text"
                value={custom ? settings.permalinkStructure : ""}
                onFocus={() => setCustom(true)}
                onChange={(e) => {
                  setCustom(true);
                  setSettings({ ...settings, permalinkStructure: e.target.value });
                }}
                placeholder="/%year%/%postname%/"
                className="w-56 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs font-mono focus:border-amber-400 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {CUSTOM_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTag(tag)}
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-300 hover:border-amber-400 hover:text-amber-400"
              >
                {tag}
              </button>
            ))}
          </div>

          <p className="mt-3 text-xs text-zinc-400">
            Preview: <code className="text-amber-300">{buildExample(settings.permalinkStructure)}</code>
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            A Custom Structure must include <code>%postname%</code> or <code>%post_id%</code> — that&apos;s the only part
            actually used to look the post up; date/category/author tokens only shape the URL&apos;s appearance.
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            &quot;Plain&quot; uses a <code>/p/123</code> path segment rather than WordPress&apos;s literal <code>?p=123</code>
            query string — a real query string at exactly <code>/blog/</code> would collide with the blog archive&apos;s
            own route.
          </p>
        </div>

        <div className="grid gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Category Base</label>
            <input
              type="text"
              value={settings.categoryBase ?? ""}
              onChange={(e) => setSettings({ ...settings, categoryBase: e.target.value || null })}
              placeholder="topics"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Tag Base</label>
            <input
              type="text"
              value={settings.tagBase ?? ""}
              onChange={(e) => setSettings({ ...settings, tagBase: e.target.value || null })}
              placeholder="tags"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>
        <p className="-mt-4 text-[11px] text-amber-400/80">
          Stored for reference only — this site filters by category/tag via <code>/blog?category=…</code> query params,
          not a path-based archive route, so there&apos;s nothing here for these two fields to rebase yet.
        </p>

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
