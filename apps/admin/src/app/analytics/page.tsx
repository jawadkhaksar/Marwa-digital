"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { SessionReplayerModal } from "@/components/SessionReplayerModal";
import {
  api,
  type AnalyticsDateParams,
  type AnalyticsOverview,
  type AnalyticsSources,
  type AnalyticsTopPages,
  type AnalyticsLeadsResult,
  type AnalyticsJourney,
  type SiteSettings,
} from "@/lib/api";

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <DashboardShell>
        <AnalyticsContent />
      </DashboardShell>
    </AuthGuard>
  );
}

// ── Date range helpers ──────────────────────────────────────────────────
// Mirrors packages/api's own resolveDateRange (admin/analytics.ts) closely
// enough that "today"/"7d"/"30d"/"90d" here land on the same calendar days
// the server resolves — computed client-side so the previous-period
// comparison window (for %-change KPIs) can be derived from the exact same
// range without a second round trip to ask the server what it picked.
type Preset = "today" | "7d" | "30d" | "90d" | "all" | "custom";
const DAY_MS = 86400000;

function presetRange(preset: Preset, customStart: string, customEnd: string): { start: Date; end: Date } {
  if (preset === "custom" && customStart && customEnd) {
    const start = new Date(customStart);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  const end = new Date();
  let start: Date;
  switch (preset) {
    case "today":
      start = new Date();
      start.setHours(0, 0, 0, 0);
      break;
    case "7d":
      start = new Date(end.getTime() - 7 * DAY_MS);
      break;
    case "90d":
      start = new Date(end.getTime() - 90 * DAY_MS);
      break;
    case "all":
      start = new Date(0);
      break;
    case "30d":
    default:
      start = new Date(end.getTime() - 30 * DAY_MS);
  }
  return { start, end };
}

function previousRange(range: { start: Date; end: Date }): { start: Date; end: Date } {
  const duration = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - duration), end: new Date(range.start.getTime() - 1) };
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function toParams(range: { start: Date; end: Date }): AnalyticsDateParams {
  return { startDate: toISODate(range.start), endDate: toISODate(range.end) };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function formatDuration(seconds: number): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

/** Long referring domains (or anything else plotted on a category axis) would otherwise overflow their tick and get clipped by the chart's own bounds. */
function truncateLabel(value: string, max = 14): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
];

const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search": "#34d399",
  Direct: "#fbbf24",
  Paid: "#f472b6",
  Social: "#60a5fa",
  Referral: "#a78bfa",
  Email: "#fb923c",
};
const FALLBACK_COLORS = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#fb923c"];

function AnalyticsContent() {
  const [preset, setPreset] = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const range = useMemo(() => presetRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const dateParams = useMemo(() => toParams(range), [range]);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [prevOverview, setPrevOverview] = useState<AnalyticsOverview | null>(null);
  const [sources, setSources] = useState<AnalyticsSources | null>(null);
  const [topPages, setTopPages] = useState<AnalyticsTopPages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [leads, setLeads] = useState<AnalyticsLeadsResult | null>(null);
  const [leadsPage, setLeadsPage] = useState(1);

  const [journeyLead, setJourneyLead] = useState<{ id: string; name: string } | null>(null);
  const [journey, setJourney] = useState<AnalyticsJourney | null>(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null);

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const calls: Promise<unknown>[] = [
        api.getAnalyticsOverview(dateParams),
        api.getAnalyticsSources(dateParams),
        api.getAnalyticsTopPages(dateParams),
      ];
      // "All Time" has no meaningful "previous period" to diff against.
      if (preset !== "all") calls.push(api.getAnalyticsOverview(toParams(previousRange(range))));

      try {
        const results = await Promise.all(calls);
        if (cancelled) return;
        setOverview(results[0] as AnalyticsOverview);
        setSources(results[1] as AnalyticsSources);
        setTopPages(results[2] as AnalyticsTopPages);
        setPrevOverview(preset !== "all" ? (results[3] as AnalyticsOverview) : null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [dateParams, preset, range]);

  useEffect(() => {
    api
      .getAnalyticsLeads({ ...dateParams, page: leadsPage, limit: 20 })
      .then(setLeads)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load leads"));
  }, [dateParams, leadsPage]);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  // Reset to page 1 when the date range changes — adjusted during render
  // (React's documented alternative to an effect for "reset state when a
  // prop changes") rather than a second effect that would just fire an
  // extra render every time.
  const dateKey = `${dateParams.startDate}_${dateParams.endDate}`;
  const [prevDateKey, setPrevDateKey] = useState(dateKey);
  if (dateKey !== prevDateKey) {
    setPrevDateKey(dateKey);
    setLeadsPage(1);
  }

  async function openJourney(id: string, name: string) {
    setJourneyLead({ id, name });
    setJourney(null);
    setJourneyLoading(true);
    try {
      setJourney(await api.getLeadJourney(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load journey");
    } finally {
      setJourneyLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await api.exportAnalyticsLeads(dateParams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function saveAnalyticsSettings(partial: Partial<SiteSettings>) {
    if (!settings) return;
    const next = { ...settings, ...partial };
    setSettings(next);
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      const updated = await api.updateSettings(partial);
      setSettings(updated);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  const visitsChange = overview && prevOverview ? pctChange(overview.totalVisits, prevOverview.totalVisits) : null;
  const leadsChange = overview && prevOverview ? pctChange(overview.totalLeads, prevOverview.totalLeads) : null;
  const conversionChange = overview && prevOverview ? pctChange(overview.conversionRate, prevOverview.conversionRate) : null;

  const untrackedPreviewUrl = settings?.siteUrl ? `${settings.siteUrl.replace(/\/$/, "")}/?marwa_no_track=1` : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Analytics &amp; Leads</h1>
          <p className="mt-1 text-sm text-zinc-300">Traffic, acquisition sources, and lead attribution across the public site.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                preset === p.value ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2 py-1">
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setPreset("custom");
              }}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none [color-scheme:dark]"
            />
            <span className="text-xs text-zinc-600">–</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setPreset("custom");
              }}
              className="bg-transparent text-xs text-zinc-300 focus:outline-none [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Total Visits" value={overview ? String(overview.totalVisits) : "—"} change={visitsChange} loading={loading} />
        <KpiCard label="Unique Visitors" value={overview ? String(overview.uniqueVisitors) : "—"} loading={loading} />
        <KpiCard label="Total Leads Generated" value={overview ? String(overview.totalLeads) : "—"} change={leadsChange} loading={loading} />
        <KpiCard label="Conversion Rate" value={overview ? `${overview.conversionRate}%` : "—"} change={conversionChange} loading={loading} />
        <KpiCard label="Avg. Pages / Session" value={overview ? overview.avgPagesPerSession.toFixed(2) : "—"} loading={loading} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <KpiCard label="Avg. Session Duration" value={overview ? formatDuration(overview.avgSessionDuration) : "—"} loading={loading} small />
        <KpiCard label="Bounce Rate" value={overview ? `${overview.bounceRate}%` : "—"} loading={loading} small />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-200">Traffic &amp; Lead Trend</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overview?.dailyTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717a" }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="visits" name="Visits" stroke="#fbbf24" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="#34d399" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Acquisition Channels</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sources?.channels ?? []}
                  dataKey="visits"
                  nameKey="channel"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {(sources?.channels ?? []).map((c, i) => (
                    <Cell key={c.channel} fill={CHANNEL_COLORS[c.channel] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Top Referral Sources</h2>
        {(sources?.referringDomains ?? []).filter((d) => d.domain !== "direct").length === 0 ? (
          <EmptyState message="Referral sources will appear here once visitors start arriving from other sites." />
        ) : (
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(sources?.referringDomains ?? []).filter((d) => d.domain !== "direct").slice(0, 8)}
                margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="domain"
                  tick={{ fontSize: 12, fill: "#a1a1aa" }}
                  tickFormatter={(value: string) => truncateLabel(value)}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={64}
                  tickMargin={10}
                />
                <YAxis tick={{ fontSize: 11, fill: "#71717a" }} allowDecimals={false} width={32} />
                <Tooltip
                  cursor={{ fill: "rgba(251, 191, 36, 0.06)" }}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#e4e4e7", marginBottom: 4 }}
                />
                <Bar dataKey="visits" name="Visits" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Top Converting Pages</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">Path</th>
                  <th className="px-4 py-2">Views</th>
                  <th className="px-4 py-2">Leads</th>
                  <th className="px-4 py-2">Conv. Rate</th>
                </tr>
              </thead>
              <tbody>
                {(topPages?.pages.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState message="Once visitors browse the site, its most-viewed and best-converting pages will show up here." />
                    </td>
                  </tr>
                )}
                {topPages?.pages.slice(0, 10).map((p) => (
                  <tr key={p.path} className="border-t border-zinc-800">
                    <td className="max-w-[220px] truncate px-4 py-2 font-mono text-xs">{p.path}</td>
                    <td className="px-4 py-2">{p.views}</td>
                    <td className="px-4 py-2">{p.conversions}</td>
                    <td className="px-4 py-2">{p.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">UTM Campaign Breakdown</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="px-4 py-2">Campaign</th>
                  <th className="px-4 py-2">Source / Medium</th>
                  <th className="px-4 py-2">Visits</th>
                  <th className="px-4 py-2">Leads</th>
                </tr>
              </thead>
              <tbody>
                {(sources?.campaigns.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState message="Once visitors arrive via a tagged UTM link (?utm_campaign=…), that campaign's traffic and leads will appear here." />
                    </td>
                  </tr>
                )}
                {sources?.campaigns.slice(0, 10).map((c, i) => (
                  <tr key={`${c.source}-${c.medium}-${c.campaign}-${i}`} className="border-t border-zinc-800">
                    <td className="px-4 py-2">{c.campaign}</td>
                    <td className="px-4 py-2 text-xs text-zinc-400">
                      {c.source} / {c.medium}
                    </td>
                    <td className="px-4 py-2">{c.visits}</td>
                    <td className="px-4 py-2">{c.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lead Attribution Feed</h2>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Form</th>
                <th className="px-4 py-2">Source / Medium</th>
                <th className="px-4 py-2">Campaign</th>
                <th className="px-4 py-2">Landing Page</th>
                <th className="px-4 py-2">Conversion Page</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {(leads?.items.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="Once visitors submit a form or contact inquiry, their UTM sources and journey data will appear here." />
                  </td>
                </tr>
              )}
              {leads?.items.map((lead) => (
                <tr key={lead.id} className="border-t border-zinc-800 align-top">
                  <td className="px-4 py-2">
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-xs text-zinc-400">{lead.email}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{lead.formName}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">
                    {lead.utmSource ?? "—"} / {lead.utmMedium ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{lead.utmCampaign ?? "—"}</td>
                  <td className="max-w-[160px] truncate px-4 py-2 font-mono text-xs">{lead.landingPage ?? "—"}</td>
                  <td className="max-w-[160px] truncate px-4 py-2 font-mono text-xs">{lead.conversionPage ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{formatDateTime(lead.createdAt)}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => openJourney(lead.id, lead.name)}
                        disabled={!lead.sessionId}
                        className="text-xs font-medium text-amber-400 hover:underline disabled:cursor-not-allowed disabled:text-zinc-600 disabled:no-underline"
                      >
                        View Journey
                      </button>
                      <button
                        onClick={() => lead.sessionId && setReplaySessionId(lead.sessionId)}
                        disabled={!lead.sessionId}
                        className="text-xs font-medium text-amber-400 hover:underline disabled:cursor-not-allowed disabled:text-zinc-600 disabled:no-underline"
                      >
                        Watch Session
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leads && leads.total > leads.limit && (
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
            <span>
              Page {leads.page} of {Math.max(1, Math.ceil(leads.total / leads.limit))} — {leads.total} leads
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}
                disabled={leadsPage <= 1}
                className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setLeadsPage((p) => p + 1)}
                disabled={leadsPage >= Math.ceil(leads.total / leads.limit)}
                className="rounded-lg border border-zinc-800 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold">Analytics Settings</h2>
        <p className="mt-1 text-sm text-zinc-400">Controls what visitor tracking records and stores site-wide.</p>
        {settingsSaved && <p className="mt-2 text-xs text-emerald-400">Settings saved.</p>}

        {settings && (
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={settings.analyticsAnonymizeIp}
                onChange={(e) => saveAnalyticsSettings({ analyticsAnonymizeIp: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              Anonymize IP addresses
              <span className="text-xs text-zinc-500">(truncates to /24 subnet before storing)</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={settings.analyticsExcludeAdminTraffic}
                onChange={(e) => saveAnalyticsSettings({ analyticsExcludeAdminTraffic: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              Exclude admin/staff traffic from tracking
            </label>
            {settings.analyticsExcludeAdminTraffic && untrackedPreviewUrl && (
              <p className="-mt-2 ml-6 text-xs text-zinc-500">
                Visit the site once via an untracked preview link to opt this browser out —{" "}
                <button
                  onClick={() => navigator.clipboard.writeText(untrackedPreviewUrl)}
                  className="font-medium text-amber-400 hover:underline"
                >
                  copy untracked preview link
                </button>
                . The admin app and the public site run on different origins, so a login here can&apos;t be detected there directly.
              </p>
            )}

            <div>
              <label className="mb-1 block text-xs text-zinc-400">Attribution cookie expiration</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.analyticsCookieDays}
                  onChange={(e) => setSettings({ ...settings, analyticsCookieDays: Math.max(1, Number(e.target.value) || 1) })}
                  onBlur={(e) => saveAnalyticsSettings({ analyticsCookieDays: Math.max(1, Number(e.target.value) || 1) })}
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
                />
                <span className="text-sm text-zinc-500">days</span>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={settings.sessionRecordingEnabled}
                onChange={(e) => saveAnalyticsSettings({ sessionRecordingEnabled: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-amber-400 focus:ring-amber-400"
              />
              Record visitor sessions (self-hosted, rrweb)
              <span className="text-xs text-zinc-500">(DOM playback recording — see Session Recordings below)</span>
            </label>

            {savingSettings && <p className="text-xs text-zinc-500">Saving…</p>}
          </div>
        )}
      </section>

      {journeyLead && (
        <JourneyModal
          leadName={journeyLead.name}
          journey={journey}
          loading={journeyLoading}
          onClose={() => setJourneyLead(null)}
        />
      )}

      {replaySessionId && <SessionReplayerModal sessionId={replaySessionId} onClose={() => setReplaySessionId(null)} />}
    </div>
  );
}

/** A quiet, centered placeholder for a table/chart with no rows in the current date range yet — used instead of a plain "No X yet." text row, which read as an error at a glance rather than an expected, temporary state. */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-zinc-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.5" fill="currentColor" />
        </svg>
      </div>
      <p className="max-w-xs text-sm text-zinc-500">{message}</p>
    </div>
  );
}

function KpiCard({
  label,
  value,
  change,
  loading,
  small,
}: {
  label: string;
  value: string;
  change?: number | null;
  loading?: boolean;
  small?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 ${small ? "" : ""}`}>
      <p className="text-sm text-zinc-400">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className={small ? "text-lg font-semibold" : "text-2xl font-semibold"}>{loading ? "…" : value}</p>
        {change !== undefined && change !== null && !loading && (
          <span className={`text-xs font-medium ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(Math.round(change * 10) / 10)}%
          </span>
        )}
      </div>
    </div>
  );
}

function JourneyModal({
  leadName,
  journey,
  loading,
  onClose,
}: {
  leadName: string;
  journey: AnalyticsJourney | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">Customer Journey</h3>
            <p className="text-sm text-zinc-400">{leadName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            ✕
          </button>
        </div>

        {loading && <p className="mt-6 text-sm text-zinc-500">Loading…</p>}

        {!loading && journey && (
          <div className="mt-5 flex flex-col gap-5">
            {journey.session && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-400 sm:grid-cols-3">
                <div>
                  <span className="block text-zinc-500">Source</span>
                  {journey.session.referringDomain}
                </div>
                <div>
                  <span className="block text-zinc-500">Device</span>
                  {journey.session.deviceType ?? "—"}
                </div>
                <div>
                  <span className="block text-zinc-500">Browser / OS</span>
                  {journey.session.browser ?? "—"} / {journey.session.os ?? "—"}
                </div>
                <div>
                  <span className="block text-zinc-500">Location</span>
                  {[journey.session.city, journey.session.country].filter(Boolean).join(", ") || "—"}
                </div>
                <div>
                  <span className="block text-zinc-500">Campaign</span>
                  {journey.lead.utmSource ?? "—"} / {journey.lead.utmMedium ?? "—"}
                </div>
                <div>
                  <span className="block text-zinc-500">Session started</span>
                  {formatDateTime(journey.session.createdAt)}
                </div>
              </div>
            )}

            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Timeline</h4>
              {journey.timeline.length === 0 ? (
                <p className="text-sm text-zinc-500">No page view history recorded for this session.</p>
              ) : (
                <ol className="flex flex-col gap-4 border-l border-zinc-800 pl-4">
                  {journey.timeline.map((step, i) => {
                    const isFirst = i === 0;
                    const isLast = i === journey.timeline.length - 1;
                    return (
                      <li key={`${step.path}-${step.createdAt}`} className="relative">
                        <span
                          className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 ${
                            isFirst ? "bg-amber-400" : isLast ? "bg-emerald-400" : "bg-zinc-600"
                          }`}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm">{step.path}</span>
                          <span className="text-xs text-zinc-500">{formatDateTime(step.createdAt)}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {isFirst && <span className="mr-2 rounded bg-amber-400/10 px-1.5 py-0.5 text-amber-300">Landing page</span>}
                          {isLast && <span className="mr-2 rounded bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300">Conversion</span>}
                          {step.duration !== null ? `${formatDuration(step.duration)} on page` : "duration not recorded"}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
