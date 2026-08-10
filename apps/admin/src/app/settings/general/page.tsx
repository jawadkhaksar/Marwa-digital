"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { RequireAdmin } from "@/components/RequireAdmin";
import { DashboardShell } from "@/components/DashboardShell";
import { ImagePicker } from "@/components/ImagePicker";
import { api, type SiteSettings } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

function displayUrl(url: string) {
  if (url.startsWith("http")) return url;
  return url.startsWith("/uploads/") ? `${API_URL}${url}` : `${WEB_URL}${url}`;
}

// Same PHP date()-token subset as apps/web/src/lib/wpDateFormat.ts — kept as
// its own small copy here (like resolveImageUrl/displayUrl above) since it's
// only needed for this page's live format preview, not shared app logic.
const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function previewFormat(date: Date, format: string): string {
  let out = "";
  for (let i = 0; i < format.length; i++) {
    const ch = format[i];
    if (ch === "\\" && i + 1 < format.length) {
      out += format[++i];
      continue;
    }
    switch (ch) {
      case "Y":
        out += String(date.getFullYear());
        break;
      case "y":
        out += String(date.getFullYear()).slice(-2);
        break;
      case "F":
        out += MONTHS_FULL[date.getMonth()];
        break;
      case "m":
        out += pad2(date.getMonth() + 1);
        break;
      case "n":
        out += String(date.getMonth() + 1);
        break;
      case "d":
        out += pad2(date.getDate());
        break;
      case "j":
        out += String(date.getDate());
        break;
      case "l":
        out += DAYS_FULL[date.getDay()];
        break;
      case "H":
        out += pad2(date.getHours());
        break;
      case "G":
        out += String(date.getHours());
        break;
      case "h":
        out += pad2(((date.getHours() + 11) % 12) + 1);
        break;
      case "g":
        out += String(((date.getHours() + 11) % 12) + 1);
        break;
      case "i":
        out += pad2(date.getMinutes());
        break;
      case "s":
        out += pad2(date.getSeconds());
        break;
      case "a":
        out += date.getHours() < 12 ? "am" : "pm";
        break;
      case "A":
        out += date.getHours() < 12 ? "AM" : "PM";
        break;
      default:
        out += ch;
    }
  }
  return out;
}

const DATE_FORMAT_OPTIONS = ["F j, Y", "Y-m-d", "m/d/Y", "d/m/Y", "d.m.Y"];
const TIME_FORMAT_OPTIONS = ["g:i a", "g:i A", "H:i"];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English (United States)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "fr", label: "French (Français)" },
  { value: "es", label: "Spanish (Español)" },
  { value: "it", label: "Italian (Italiano)" },
];

const TIMEZONE_OPTIONS = Array.from({ length: 27 }, (_, i) => i - 12).map((offset) => {
  const sign = offset >= 0 ? "+" : "-";
  return `UTC${sign}${Math.abs(offset)}`;
});

export default function GeneralSettingsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <RequireAdmin>
          <GeneralSettingsContent />
        </RequireAdmin>
      </DashboardShell>
    </AuthGuard>
  );
}

function GeneralSettingsContent() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dateCustom, setDateCustom] = useState(false);
  const [timeCustom, setTimeCustom] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    // Sets the first tick immediately rather than waiting a full second for
    // the interval's first callback — same pattern as CountdownTimerBlock.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDateCustom(!DATE_FORMAT_OPTIONS.includes(settings.dateFormat));
      setTimeCustom(!TIME_FORMAT_OPTIONS.includes(settings.timeFormat));
    }
    // Runs once when the fetched settings first arrive (to seed the
    // Custom-radio state from the saved value) — not on every keystroke
    // while editing, which would fight the radio/text-input the admin is
    // actively using.
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
        siteName: settings.siteName,
        tagline: settings.tagline,
        siteIcon: settings.siteIcon,
        siteUrl: settings.siteUrl,
        adminEmail: settings.adminEmail,
        siteLanguage: settings.siteLanguage,
        timezone: settings.timezone,
        dateFormat: settings.dateFormat,
        timeFormat: settings.timeFormat,
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
      <h1 className="text-2xl font-semibold">General Settings</h1>
      <p className="mt-1 text-sm text-zinc-300">Global site identity, URL, and localization — used across the public website and its metadata.</p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {saved && <p className="mt-3 text-sm text-emerald-400">Settings saved.</p>}

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="flex flex-col gap-4">
          <Field label="Site Title" value={settings.siteName} onChange={(v) => setSettings({ ...settings, siteName: v })} />
          <div>
            <Field label="Tagline" value={settings.tagline} onChange={(v) => setSettings({ ...settings, tagline: v })} />
            <p className="mt-1 text-[11px] text-zinc-500">In a few words, explain what this site is about.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Site Icon (Favicon)</label>
            {settings.siteIcon && (
              <div className="mb-3 flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
                <div className="flex h-6 w-40 items-center gap-1.5 rounded-t-md bg-zinc-800 px-2 text-[10px] text-zinc-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={displayUrl(settings.siteIcon)} alt="" className="h-3.5 w-3.5 shrink-0 rounded-sm object-cover" />
                  <span className="truncate">{settings.siteName}</span>
                </div>
                <span className="text-[11px] text-zinc-500">Browser tab preview</span>
              </div>
            )}
            <ImagePicker
              label=""
              images={settings.siteIcon ? [settings.siteIcon] : []}
              onChange={(images) => setSettings({ ...settings, siteIcon: images[images.length - 1] ?? null })}
              category="branding"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Shown in browser tabs and bookmark bars. Should be square (e.g. 512×512px).</p>
          </div>
        </div>

        <div className="grid gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-2">
          <Field label="Site Address (URL)" value={settings.siteUrl} onChange={(v) => setSettings({ ...settings, siteUrl: v })} placeholder="https://www.example.com" />
          <Field
            label="Administration Email Address"
            type="email"
            value={settings.adminEmail}
            onChange={(v) => setSettings({ ...settings, adminEmail: v })}
          />
        </div>

        <div className="grid gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Site Language</label>
            <select
              value={settings.siteLanguage}
              onChange={(e) => setSettings({ ...settings, siteLanguage: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <label className="mb-2 block text-xs text-zinc-400">Date Format</label>
          <div className="flex flex-col gap-1.5">
            {DATE_FORMAT_OPTIONS.map((fmt) => (
              <label key={fmt} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  checked={!dateCustom && settings.dateFormat === fmt}
                  onChange={() => {
                    setDateCustom(false);
                    setSettings({ ...settings, dateFormat: fmt });
                  }}
                  className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
                />
                {now ? previewFormat(now, fmt) : fmt}
                <span className="text-zinc-600">({fmt})</span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                checked={dateCustom}
                onChange={() => setDateCustom(true)}
                className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              Custom:
              <input
                type="text"
                value={dateCustom ? settings.dateFormat : ""}
                onFocus={() => setDateCustom(true)}
                onChange={(e) => {
                  setDateCustom(true);
                  setSettings({ ...settings, dateFormat: e.target.value });
                }}
                className="w-32 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs focus:border-amber-400 focus:outline-none"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Preview: {now && settings.dateFormat ? previewFormat(now, settings.dateFormat) : ""}</p>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <label className="mb-2 block text-xs text-zinc-400">Time Format</label>
          <div className="flex flex-col gap-1.5">
            {TIME_FORMAT_OPTIONS.map((fmt) => (
              <label key={fmt} className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="radio"
                  checked={!timeCustom && settings.timeFormat === fmt}
                  onChange={() => {
                    setTimeCustom(false);
                    setSettings({ ...settings, timeFormat: fmt });
                  }}
                  className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
                />
                {now ? previewFormat(now, fmt) : fmt}
                <span className="text-zinc-600">({fmt})</span>
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="radio"
                checked={timeCustom}
                onChange={() => setTimeCustom(true)}
                className="h-3.5 w-3.5 border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              Custom:
              <input
                type="text"
                value={timeCustom ? settings.timeFormat : ""}
                onFocus={() => setTimeCustom(true)}
                onChange={(e) => {
                  setTimeCustom(true);
                  setSettings({ ...settings, timeFormat: e.target.value });
                }}
                className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs focus:border-amber-400 focus:outline-none"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Preview: {now && settings.timeFormat ? previewFormat(now, settings.timeFormat) : ""}</p>
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
      />
    </div>
  );
}
