import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { formatZodError } from "../lib/zodError";
import { extractIp, extractGeo, extractReferringDomain, parseUserAgent, analyticsLimiter } from "../lib/analyticsUtils";
import { dispatchTrigger } from "../services/workflowEngine";

export const analyticsRouter = Router();

analyticsRouter.use(analyticsLimiter);

/**
 * Anonymizes to the containing /24 (IPv4) or /48 (IPv6) subnet rather than
 * dropping the IP entirely — still enough to de-duplicate/geo-locate at a
 * coarse level for the Sources report, but no longer a specific individual's
 * address. Applied at write time (not read time) so a later settings change
 * only affects future sessions, matching how every other "anonymize going
 * forward" toggle in this codebase behaves.
 */
function anonymizeIp(ip: string | undefined): string | undefined {
  if (!ip) return ip;
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 3).join(":") + "::";
  }
  const octets = ip.split(".");
  if (octets.length === 4) return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
  return ip;
}

const sessionSchema = z.object({
  sessionId: z.string().min(1),
  referrer: z.string().optional(),
  landingPage: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
});

/**
 * Registers a visitor session on first load. Idempotent by sessionId — a
 * returning visitor within the same cookie lifetime calling this again
 * (e.g. a second tab) touches nothing about the original first-touch
 * attribution, since that's the whole point of first-touch tracking: it's
 * whatever brought them in the FIRST time, not overwritten by a later
 * direct visit.
 */
analyticsRouter.post("/session", async (req, res) => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { sessionId, referrer, landingPage, utmSource, utmMedium, utmCampaign, utmTerm, utmContent } = parsed.data;

  const existing = await prisma.visitorSession.findUnique({ where: { sessionId }, select: { id: true } });
  if (existing) return res.status(200).json({ ok: true, created: false });

  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  const rawIp = extractIp(req);
  const ip = settings?.analyticsAnonymizeIp ? anonymizeIp(rawIp) : rawIp;
  const geo = extractGeo(req);
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
  const ua = parseUserAgent(userAgent);

  await prisma.visitorSession.create({
    data: {
      sessionId,
      ipAddress: ip,
      userAgent,
      country: geo.country,
      city: geo.city,
      deviceType: ua.deviceType,
      browser: ua.browser,
      os: ua.os,
      referrer,
      referringDomain: extractReferringDomain(referrer),
      landingPage,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
    },
  });

  res.status(201).json({ ok: true, created: true });
});

const pageviewSchema = z.object({
  sessionId: z.string().min(1),
  // Omitted entirely by the beforeunload/visibilitychange beacon on the
  // last page of a visit — that call exists only to report `duration` for
  // the page already recorded, not to log a new one.
  path: z.string().optional(),
  title: z.string().optional(),
  referrer: z.string().optional(),
  duration: z.coerce.number().int().nonnegative().optional(),
});

analyticsRouter.post("/pageview", async (req, res) => {
  const parsed = pageviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { sessionId, path, title, referrer, duration } = parsed.data;

  // Defensive fallback: a session row should already exist (the client
  // always calls /session first) but a slow/dropped session request racing
  // the first pageview must not orphan this pageview against a missing FK.
  const session = await prisma.visitorSession.findUnique({ where: { sessionId }, select: { sessionId: true } });
  if (!session) {
    const geo = extractGeo(req);
    const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;
    const ua = parseUserAgent(userAgent);
    const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    const rawIp = extractIp(req);
    await prisma.visitorSession.create({
      data: {
        sessionId,
        ipAddress: settings?.analyticsAnonymizeIp ? anonymizeIp(rawIp) : rawIp,
        userAgent,
        country: geo.country,
        city: geo.city,
        deviceType: ua.deviceType,
        browser: ua.browser,
        os: ua.os,
        referrer,
        referringDomain: extractReferringDomain(referrer),
        landingPage: path,
      },
    });
  }

  if (duration !== undefined) {
    const lastView = await prisma.pageView.findFirst({ where: { sessionId }, orderBy: { createdAt: "desc" } });
    if (lastView && lastView.duration === null) {
      await prisma.pageView.update({ where: { id: lastView.id }, data: { duration } });
    }
  }

  if (!path) return res.status(200).json({ ok: true }); // duration-only ping

  await prisma.pageView.create({
    data: { sessionId, path, title, referrer },
  });

  res.status(201).json({ ok: true });
});

// ── Session Recording (self-hosted rrweb) ────────────────────────────────

interface RRWebEventLike {
  type?: number;
  timestamp?: number;
  data?: { source?: number; type?: number; id?: number };
}

// rrweb's IncrementalSource.MouseInteraction (2) + MouseInteractions.Click
// (2) — see rrweb-types. Detected on the INCOMING batch only (not
// re-scanned across everything already stored) since a rage click always
// happens within a single short burst, never straddling two separate
// upload chunks in practice.
const MOUSE_INTERACTION_SOURCE = 2;
const CLICK_INTERACTION_TYPE = 2;
const RAGE_CLICK_THRESHOLD = 3;
const RAGE_CLICK_WINDOW_MS = 500;

function detectRageClicks(events: RRWebEventLike[]): boolean {
  const clicksByTarget = new Map<number, number[]>();
  for (const ev of events) {
    if (ev?.type !== 3 || ev.data?.source !== MOUSE_INTERACTION_SOURCE || ev.data?.type !== CLICK_INTERACTION_TYPE) continue;
    const targetId = ev.data.id;
    const ts = ev.timestamp;
    if (typeof targetId !== "number" || typeof ts !== "number") continue;
    const list = clicksByTarget.get(targetId) ?? [];
    list.push(ts);
    clicksByTarget.set(targetId, list);
  }
  for (const timestamps of clicksByTarget.values()) {
    timestamps.sort((a, b) => a - b);
    for (let i = 0; i + RAGE_CLICK_THRESHOLD - 1 < timestamps.length; i++) {
      if (timestamps[i + RAGE_CLICK_THRESHOLD - 1] - timestamps[i] <= RAGE_CLICK_WINDOW_MS) return true;
    }
  }
  return false;
}

function computeDurationSeconds(events: RRWebEventLike[]): number {
  const timestamps = events.map((e) => e.timestamp).filter((t): t is number => typeof t === "number");
  if (timestamps.length < 2) return 0;
  return Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 1000);
}

const recordingSchema = z.object({
  sessionId: z.string().min(1),
  events: z.array(z.unknown()).min(1),
});

/**
 * Appends one batch of rrweb events to this session's recording (creating
 * it on the first batch), recomputing duration/eventCount/hasRageClicks from
 * the merged event list every time. apps/web's tracker calls this on route
 * changes and again via sendBeacon on unload, so a single visit's recording
 * is assembled from several small POSTs rather than one giant one at the end.
 */
analyticsRouter.post("/recording", async (req, res) => {
  const parsed = recordingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { sessionId, events: incoming } = parsed.data;

  const session = await prisma.visitorSession.findUnique({ where: { sessionId }, select: { sessionId: true, contactId: true } });
  if (!session) return res.status(404).json({ error: "Unknown session" });

  const existing = await prisma.sessionRecording.findUnique({ where: { sessionId } });
  const incomingEvents = incoming as RRWebEventLike[];
  const merged = existing ? [...(existing.events as RRWebEventLike[]), ...incomingEvents] : incomingEvents;

  const duration = computeDurationSeconds(merged);
  const wasRageClicking = Boolean(existing?.hasRageClicks);
  const hasRageClicks = wasRageClicking || detectRageClicks(incomingEvents);

  const eventsJson = merged as unknown as Prisma.InputJsonValue;
  await prisma.sessionRecording.upsert({
    where: { sessionId },
    create: { sessionId, events: eventsJson, duration, eventCount: merged.length, hasRageClicks },
    update: { events: eventsJson, duration, eventCount: merged.length, hasRageClicks },
  });

  // Fires the Marketing Automation trigger once, the moment a session first
  // crosses into rage-click territory — not on every later batch that still
  // has it (hasRageClicks never clears once true for a session).
  if (!wasRageClicking && hasRageClicks) {
    dispatchTrigger("SESSION_RAGE_CLICK", { contactId: session.contactId });
  }

  res.status(202).json({ ok: true });
});

// ── Click/Scroll Heatmaps ─────────────────────────────────────────────────

const heatmapClickSchema = z.object({
  path: z.string().min(1),
  device: z.enum(["DESKTOP", "MOBILE", "TABLET"]).default("DESKTOP"),
  clicks: z
    .array(z.object({ xPercent: z.number().min(0).max(100), yPx: z.number().int().nonnegative() }))
    .min(1)
    .max(200),
});

/** apps/web's AnalyticsTracker throttles/batches clicks client-side before calling this — see recordClick in lib/analytics.ts. */
analyticsRouter.post("/heatmaps", async (req, res) => {
  const parsed = heatmapClickSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { path, device, clicks } = parsed.data;

  await prisma.heatmapClick.createMany({
    data: clicks.map((c) => ({ path, device, xPercent: c.xPercent, yPx: c.yPx })),
  });

  res.status(201).json({ ok: true, recorded: clicks.length });
});

// ── Form Field Analytics ───────────────────────────────────────────────────

const formFieldEventSchema = z.object({
  formId: z.string().min(1),
  fieldId: z.string().min(1),
  fieldName: z.string().min(1),
  event: z.enum(["interaction", "abandonment"]),
});

/**
 * Interaction events fire on field focus (apps/web debounces repeat focus/
 * blur cycles on the same field within one visit — see formAnalytics.ts).
 * Abandonment events fire once per visit, for whichever field was last
 * focused when the visitor left without a successful submit.
 */
analyticsRouter.post("/forms/field-event", async (req, res) => {
  const parsed = formFieldEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { formId, fieldId, fieldName, event } = parsed.data;

  await prisma.formFieldAnalytics.upsert({
    where: { formId_fieldId: { formId, fieldId } },
    create: {
      formId,
      fieldId,
      fieldName,
      interactions: event === "interaction" ? 1 : 0,
      abandonments: event === "abandonment" ? 1 : 0,
    },
    update: {
      fieldName,
      ...(event === "interaction" ? { interactions: { increment: 1 } } : { abandonments: { increment: 1 } }),
    },
  });

  res.status(201).json({ ok: true });
});
