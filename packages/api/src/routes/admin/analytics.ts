import { Router } from "express";
import { prisma, Prisma } from "@marwa/db";
import { classifyChannel } from "../../lib/analyticsUtils";
import { guessNameEmail } from "../../lib/crm";

export const adminAnalyticsRouter = Router();

// ── Shared helpers ─────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

/** startDate/endDate (ISO date strings) win when both are present; otherwise a preset — defaults to the last 30 days, matching the dashboard's own default range. */
function resolveDateRange(query: Record<string, unknown>): { start: Date; end: Date } {
  const startDate = typeof query.startDate === "string" ? query.startDate : undefined;
  const endDate = typeof query.endDate === "string" ? query.endDate : undefined;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const preset = typeof query.preset === "string" ? query.preset : "30d";
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

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface UnifiedLead {
  id: string; // "inquiry:<id>" | "submission:<id>" — see the journey endpoint below, which needs to tell the two apart
  type: "inquiry" | "submission";
  name: string;
  email: string;
  formName: string;
  status?: string;
  sessionId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  landingPage: string | null;
  conversionPage: string | null;
  createdAt: Date;
}

async function fetchUnifiedLeads(range?: { start: Date; end: Date }): Promise<UnifiedLead[]> {
  const dateFilter = range ? { createdAt: { gte: range.start, lte: range.end } } : {};

  const [inquiries, submissions] = await Promise.all([
    prisma.contactInquiry.findMany({ where: dateFilter, orderBy: { createdAt: "desc" } }),
    prisma.formSubmission.findMany({ where: dateFilter, orderBy: { createdAt: "desc" } }),
  ]);

  const leads: UnifiedLead[] = [
    ...inquiries.map((i): UnifiedLead => ({
      id: `inquiry:${i.id}`,
      type: "inquiry",
      name: i.name,
      email: i.email,
      formName: "Contact Page",
      status: i.status,
      sessionId: i.sessionId,
      utmSource: i.utmSource,
      utmMedium: i.utmMedium,
      utmCampaign: i.utmCampaign,
      landingPage: i.landingPage,
      conversionPage: i.conversionPage,
      createdAt: i.createdAt,
    })),
    ...submissions.map((s): UnifiedLead => {
      const { name, email } = guessNameEmail(s.data);
      return {
        id: `submission:${s.id}`,
        type: "submission",
        name,
        email,
        formName: s.formId,
        sessionId: s.sessionId,
        utmSource: s.utmSource,
        utmMedium: s.utmMedium,
        utmCampaign: s.utmCampaign,
        landingPage: s.landingPage,
        conversionPage: s.conversionPage,
        createdAt: s.createdAt,
      };
    }),
  ];

  leads.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return leads;
}

// ── GET /overview ──────────────────────────────────────────────────────
// Total Page Views & Unique Visitors, Total Leads, Conversion Rate, Avg
// Session Duration & Bounce Rate — plus a daily visits-vs-leads series for
// the Traffic & Lead Trend chart, folded into this same response rather
// than a dedicated endpoint (it's derived from the exact same page-view/
// lead rows this one already has to fetch).
adminAnalyticsRouter.get("/overview", async (req, res) => {
  const { start, end } = resolveDateRange(req.query as Record<string, unknown>);
  const dateFilter = { gte: start, lte: end };

  const [pageViews, inquiries, submissions] = await Promise.all([
    prisma.pageView.findMany({ where: { createdAt: dateFilter }, select: { sessionId: true, duration: true, createdAt: true } }),
    prisma.contactInquiry.findMany({ where: { createdAt: dateFilter }, select: { createdAt: true } }),
    prisma.formSubmission.findMany({ where: { createdAt: dateFilter }, select: { createdAt: true } }),
  ]);

  const bySession = new Map<string, { count: number; durationSum: number }>();
  for (const pv of pageViews) {
    const entry = bySession.get(pv.sessionId) ?? { count: 0, durationSum: 0 };
    entry.count += 1;
    entry.durationSum += pv.duration ?? 0;
    bySession.set(pv.sessionId, entry);
  }

  const totalPageViews = pageViews.length;
  // "Unique Visitors" and "Total Visits" are the same number in this
  // design: the 30-day session cookie IS the visitor identity, so a
  // returning visit within that window reuses the same VisitorSession row
  // rather than minting a new one — see POST /api/analytics/session.
  const uniqueVisitors = bySession.size;
  const totalLeads = inquiries.length + submissions.length;
  const conversionRate = uniqueVisitors > 0 ? (totalLeads / uniqueVisitors) * 100 : 0;
  const bounced = [...bySession.values()].filter((s) => s.count === 1).length;
  const bounceRate = uniqueVisitors > 0 ? (bounced / uniqueVisitors) * 100 : 0;
  const totalDuration = [...bySession.values()].reduce((sum, s) => sum + s.durationSum, 0);
  const avgSessionDuration = uniqueVisitors > 0 ? totalDuration / uniqueVisitors : 0;
  const avgPagesPerSession = uniqueVisitors > 0 ? totalPageViews / uniqueVisitors : 0;

  const visitsByDay = new Map<string, Set<string>>();
  for (const pv of pageViews) {
    const key = dayKey(pv.createdAt);
    if (!visitsByDay.has(key)) visitsByDay.set(key, new Set());
    visitsByDay.get(key)!.add(pv.sessionId);
  }
  const leadsByDay = new Map<string, number>();
  for (const row of [...inquiries, ...submissions]) {
    const key = dayKey(row.createdAt);
    leadsByDay.set(key, (leadsByDay.get(key) ?? 0) + 1);
  }

  const dailyTrend: { date: string; visits: number; leads: number }[] = [];
  const cappedStart = start.getTime() < end.getTime() - 366 * DAY_MS ? new Date(end.getTime() - 366 * DAY_MS) : start; // "All Time" still renders a sane chart instead of one point per day since the dawn of the DB
  for (let d = new Date(cappedStart); d <= end; d = new Date(d.getTime() + DAY_MS)) {
    const key = dayKey(d);
    dailyTrend.push({ date: key, visits: visitsByDay.get(key)?.size ?? 0, leads: leadsByDay.get(key) ?? 0 });
  }

  res.json({
    range: { start, end },
    totalPageViews,
    totalVisits: uniqueVisitors,
    uniqueVisitors,
    totalLeads,
    conversionRate: Math.round(conversionRate * 100) / 100,
    avgSessionDuration: Math.round(avgSessionDuration),
    bounceRate: Math.round(bounceRate * 100) / 100,
    avgPagesPerSession: Math.round(avgPagesPerSession * 100) / 100,
    dailyTrend,
  });
});

// ── GET /sources ────────────────────────────────────────────────────────
// Channels (donut chart), referring domains (bar chart), and UTM campaigns
// (table) — three cuts of the same underlying "which sessions started in
// this window, and how many leads did they produce" data. Sessions (not
// page views) are the grain here since attribution is a first-touch,
// per-session concept.
adminAnalyticsRouter.get("/sources", async (req, res) => {
  const { start, end } = resolveDateRange(req.query as Record<string, unknown>);
  const dateFilter = { gte: start, lte: end };

  const [sessions, inquiries, submissions] = await Promise.all([
    prisma.visitorSession.findMany({
      where: { createdAt: dateFilter },
      select: { sessionId: true, utmSource: true, utmMedium: true, utmCampaign: true, referringDomain: true },
    }),
    prisma.contactInquiry.findMany({ where: { createdAt: dateFilter, sessionId: { not: null } }, select: { sessionId: true } }),
    prisma.formSubmission.findMany({ where: { createdAt: dateFilter, sessionId: { not: null } }, select: { sessionId: true } }),
  ]);

  const leadCountBySession = new Map<string, number>();
  for (const row of [...inquiries, ...submissions]) {
    if (!row.sessionId) continue;
    leadCountBySession.set(row.sessionId, (leadCountBySession.get(row.sessionId) ?? 0) + 1);
  }

  const channels = new Map<string, { visits: number; leads: number }>();
  const domains = new Map<string, { visits: number; leads: number }>();
  const campaigns = new Map<string, { source: string; medium: string; campaign: string; visits: number; leads: number }>();

  for (const s of sessions) {
    const leads = leadCountBySession.get(s.sessionId) ?? 0;

    const channel = classifyChannel({ utmMedium: s.utmMedium, utmSource: s.utmSource, referringDomain: s.referringDomain });
    const cEntry = channels.get(channel) ?? { visits: 0, leads: 0 };
    cEntry.visits += 1;
    cEntry.leads += leads;
    channels.set(channel, cEntry);

    const domain = s.referringDomain || "direct";
    const dEntry = domains.get(domain) ?? { visits: 0, leads: 0 };
    dEntry.visits += 1;
    dEntry.leads += leads;
    domains.set(domain, dEntry);

    if (s.utmCampaign || s.utmSource || s.utmMedium) {
      const key = `${s.utmSource ?? ""}::${s.utmMedium ?? ""}::${s.utmCampaign ?? ""}`;
      const campEntry = campaigns.get(key) ?? { source: s.utmSource ?? "—", medium: s.utmMedium ?? "—", campaign: s.utmCampaign ?? "—", visits: 0, leads: 0 };
      campEntry.visits += 1;
      campEntry.leads += leads;
      campaigns.set(key, campEntry);
    }
  }

  res.json({
    range: { start, end },
    channels: [...channels.entries()].map(([channel, v]) => ({ channel, ...v })).sort((a, b) => b.visits - a.visits),
    referringDomains: [...domains.entries()].map(([domain, v]) => ({ domain, ...v })).sort((a, b) => b.visits - a.visits),
    campaigns: [...campaigns.values()].sort((a, b) => b.visits - a.visits),
  });
});

// ── GET /top-pages ─────────────────────────────────────────────────────
adminAnalyticsRouter.get("/top-pages", async (req, res) => {
  const { start, end } = resolveDateRange(req.query as Record<string, unknown>);
  const dateFilter = { gte: start, lte: end };

  const [pageViews, inquiries, submissions] = await Promise.all([
    prisma.pageView.findMany({ where: { createdAt: dateFilter }, select: { path: true, sessionId: true } }),
    prisma.contactInquiry.findMany({ where: { createdAt: dateFilter, conversionPage: { not: null } }, select: { conversionPage: true } }),
    prisma.formSubmission.findMany({ where: { createdAt: dateFilter, conversionPage: { not: null } }, select: { conversionPage: true } }),
  ]);

  const byPage = new Map<string, { views: number; visitors: Set<string> }>();
  for (const pv of pageViews) {
    const entry = byPage.get(pv.path) ?? { views: 0, visitors: new Set<string>() };
    entry.views += 1;
    entry.visitors.add(pv.sessionId);
    byPage.set(pv.path, entry);
  }

  const conversionsByPage = new Map<string, number>();
  for (const row of [...inquiries, ...submissions]) {
    const page = row.conversionPage;
    if (!page) continue;
    conversionsByPage.set(page, (conversionsByPage.get(page) ?? 0) + 1);
  }

  const pages = [...byPage.entries()]
    .map(([path, v]) => {
      const conversions = conversionsByPage.get(path) ?? 0;
      return {
        path,
        views: v.views,
        uniqueVisitors: v.visitors.size,
        conversions,
        conversionRate: v.views > 0 ? Math.round((conversions / v.views) * 10000) / 100 : 0,
      };
    })
    .sort((a, b) => b.views - a.views);

  res.json({ range: { start, end }, pages });
});

// ── GET /leads ──────────────────────────────────────────────────────────
adminAnalyticsRouter.get("/leads", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const hasRange = typeof req.query.startDate === "string" || typeof req.query.preset === "string";
  const range = hasRange ? resolveDateRange(req.query as Record<string, unknown>) : undefined;

  const all = await fetchUnifiedLeads(range);
  const total = all.length;
  const items = all.slice((page - 1) * limit, (page - 1) * limit + limit);

  res.json({ items, total, page, limit });
});

// ── GET /leads/:id/journey ─────────────────────────────────────────────
// The full chronological PageView timeline leading up to (and including)
// this lead's own conversion moment — id is "inquiry:<id>" or
// "submission:<id>" (see fetchUnifiedLeads), so this can look the right
// table up directly instead of guessing/trying both.
adminAnalyticsRouter.get("/leads/:id/journey", async (req, res) => {
  const [type, rawId] = req.params.id.split(":");
  if ((type !== "inquiry" && type !== "submission") || !rawId) {
    return res.status(400).json({ error: "Invalid lead id" });
  }

  const lead =
    type === "inquiry"
      ? await prisma.contactInquiry.findUnique({ where: { id: rawId } })
      : await prisma.formSubmission.findUnique({ where: { id: rawId } });
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  const leadSummary =
    type === "inquiry"
      ? { id: `inquiry:${lead.id}`, name: (lead as { name: string }).name, email: (lead as { email: string }).email, formName: "Contact Page" }
      : { id: `submission:${lead.id}`, ...guessNameEmail((lead as { data: unknown }).data), formName: (lead as { formId: string }).formId };

  if (!lead.sessionId) {
    return res.json({
      lead: { ...leadSummary, createdAt: lead.createdAt, landingPage: lead.landingPage, conversionPage: lead.conversionPage, utmSource: lead.utmSource, utmMedium: lead.utmMedium, utmCampaign: lead.utmCampaign },
      session: null,
      timeline: [],
    });
  }

  const session = await prisma.visitorSession.findUnique({ where: { sessionId: lead.sessionId } });
  const timeline = await prisma.pageView.findMany({
    where: { sessionId: lead.sessionId, createdAt: { lte: lead.createdAt } },
    orderBy: { createdAt: "asc" },
  });

  res.json({
    lead: {
      ...leadSummary,
      createdAt: lead.createdAt,
      landingPage: lead.landingPage,
      conversionPage: lead.conversionPage,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
    },
    session: session
      ? {
          referringDomain: session.referringDomain,
          referrer: session.referrer,
          country: session.country,
          city: session.city,
          deviceType: session.deviceType,
          browser: session.browser,
          os: session.os,
          createdAt: session.createdAt,
        }
      : null,
    timeline: timeline.map((t) => ({ path: t.path, title: t.title, referrer: t.referrer, duration: t.duration, createdAt: t.createdAt })),
  });
});

// ── GET /export ─────────────────────────────────────────────────────────
function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

adminAnalyticsRouter.get("/export", async (req, res) => {
  const hasRange = typeof req.query.startDate === "string" || typeof req.query.preset === "string";
  const range = hasRange ? resolveDateRange(req.query as Record<string, unknown>) : undefined;
  const leads = await fetchUnifiedLeads(range);

  const headers = ["Date", "Type", "Form", "Name", "Email", "Source", "Medium", "Campaign", "Landing Page", "Conversion Page", "Session ID"];
  const rows = leads.map((l) =>
    [
      l.createdAt.toISOString(),
      l.type,
      l.formName,
      l.name,
      l.email,
      l.utmSource ?? "",
      l.utmMedium ?? "",
      l.utmCampaign ?? "",
      l.landingPage ?? "",
      l.conversionPage ?? "",
      l.sessionId ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");

  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

// ── Session Recordings (self-hosted rrweb) ─────────────────────────────
// GET /recordings — paginated list backing the dedicated Session Recordings
// browser (apps/admin's /analytics/recordings) as well as the Lead Feed /
// CRM "Watch User Session" entry points. Filterable by free-text search
// (visitor IP, location, or associated lead email), duration range, rage
// clicks, a specific page route visited, a date range, or a specific Contact.
adminAnalyticsRouter.get("/recordings", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const minDuration = req.query.minDuration !== undefined ? Number(req.query.minDuration) : undefined;
  const maxDuration = req.query.maxDuration !== undefined ? Number(req.query.maxDuration) : undefined;
  const country = typeof req.query.country === "string" ? req.query.country : undefined;
  const hasRageClicks = req.query.hasRageClicks === "true" ? true : req.query.hasRageClicks === "false" ? false : undefined;
  const contactId = typeof req.query.contactId === "string" ? req.query.contactId : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  const pagePath = typeof req.query.pagePath === "string" ? req.query.pagePath.trim() : undefined;
  const startDate = typeof req.query.startDate === "string" ? new Date(req.query.startDate) : undefined;
  const endDate = typeof req.query.endDate === "string" ? new Date(req.query.endDate) : undefined;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  const durationFilter: Prisma.IntFilter = {};
  if (minDuration !== undefined && !Number.isNaN(minDuration)) durationFilter.gte = minDuration;
  if (maxDuration !== undefined && !Number.isNaN(maxDuration)) durationFilter.lte = maxDuration;

  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (startDate && !Number.isNaN(startDate.getTime())) createdAtFilter.gte = startDate;
  if (endDate && !Number.isNaN(endDate.getTime())) createdAtFilter.lte = endDate;

  const where: Prisma.SessionRecordingWhereInput = {
    ...(Object.keys(durationFilter).length > 0 ? { duration: durationFilter } : {}),
    ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
    ...(hasRageClicks !== undefined ? { hasRageClicks } : {}),
    session: {
      ...(country ? { country } : {}),
      ...(contactId ? { contactId } : {}),
      ...(pagePath ? { pageViews: { some: { path: { contains: pagePath, mode: "insensitive" } } } } : {}),
      ...(search
        ? {
            OR: [
              { ipAddress: { contains: search, mode: "insensitive" } },
              { country: { contains: search, mode: "insensitive" } },
              { city: { contains: search, mode: "insensitive" } },
              { contact: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
  };

  const [items, total] = await Promise.all([
    prisma.sessionRecording.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        sessionId: true,
        duration: true,
        eventCount: true,
        hasRageClicks: true,
        createdAt: true,
        session: {
          select: {
            ipAddress: true,
            country: true,
            city: true,
            deviceType: true,
            browser: true,
            landingPage: true,
            contactId: true,
            contact: { select: { id: true, firstName: true, lastName: true, email: true } },
            _count: { select: { pageViews: true } },
          },
        },
      },
    }),
    prisma.sessionRecording.count({ where }),
  ]);

  res.json({ items, total, page, limit });
});

// GET /recordings/:sessionId — full rrweb event payload for rrweb-player playback.
adminAnalyticsRouter.get("/recordings/:sessionId", async (req, res) => {
  const recording = await prisma.sessionRecording.findUnique({
    where: { sessionId: req.params.sessionId },
    include: {
      session: { select: { country: true, city: true, deviceType: true, browser: true, os: true, contactId: true } },
    },
  });
  if (!recording) return res.status(404).json({ error: "Recording not found" });
  res.json(recording);
});
