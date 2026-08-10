"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { RequireAdmin } from "@/components/RequireAdmin";
import { DashboardShell } from "@/components/DashboardShell";
import { api, type SiteSettings, type Category } from "@/lib/api";

const POST_FORMATS = [
  { value: "STANDARD", label: "Standard" },
  { value: "GALLERY", label: "Gallery" },
  { value: "VIDEO", label: "Video" },
  { value: "QUOTE", label: "Quote" },
];

export default function WritingSettingsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <RequireAdmin>
          <WritingSettingsContent />
        </RequireAdmin>
      </DashboardShell>
    </AuthGuard>
  );
}

function WritingSettingsContent() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch((err) => setError(err.message));
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.updateSettings({
        defaultPostCategoryId: settings.defaultPostCategoryId,
        defaultPostFormat: settings.defaultPostFormat,
        updateServiceUrls: settings.updateServiceUrls,
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
      <h1 className="text-2xl font-semibold">Writing Settings</h1>
      <p className="mt-1 text-sm text-zinc-300">Defaults applied when a new blog post is created.</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-400">Settings saved.</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Default Post Category</label>
            <select
              value={settings.defaultPostCategoryId ?? ""}
              onChange={(e) => setSettings({ ...settings, defaultPostCategoryId: e.target.value || null })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            >
              <option value="">None (Uncategorized)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Default Post Format</label>
            <select
              value={settings.defaultPostFormat}
              onChange={(e) => setSettings({ ...settings, defaultPostFormat: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            >
              {POST_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-zinc-500">Stored per-post and settable here as a default — no blog template currently changes its layout based on format.</p>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-semibold text-zinc-200">Update Services</h3>
          <p className="mt-1 text-xs text-zinc-500">Ping service URLs, one per line.</p>
          <textarea
            value={settings.updateServiceUrls ?? ""}
            onChange={(e) => setSettings({ ...settings, updateServiceUrls: e.target.value })}
            rows={4}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs focus:border-amber-400 focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-amber-400/80">
            Stored for reference only — nothing currently fires these pings on publish. Most ping-service directories from
            the WordPress era (pingomatic and similar) are effectively defunct, so building and firing that legacy
            XML-RPC protocol against them wouldn&apos;t meaningfully help this site&apos;s SEO today.
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-semibold text-zinc-200">Post via Email</h3>
          <p className="mt-1 text-[11px] text-zinc-500">
            Not available — this requires a mailbox-polling (POP3) worker, which doesn&apos;t exist anywhere in this
            stack. Nothing was built here rather than shipping a setting with no working feature behind it.
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
