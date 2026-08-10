/**
 * Client-side visitor tracking: a persistent session id, first-touch
 * attribution (UTM tags + referrer + landing page, captured once and never
 * overwritten for the life of the session cookie), and the admin-traffic
 * opt-out. No React here — AnalyticsTracker.tsx drives the network calls;
 * ContactForm.tsx and FormBlock.tsx read `getAttributionPayload()` directly
 * to stamp outgoing submissions without needing the tracker mounted above them.
 */

const SESSION_COOKIE = "mw_sid";
const EXCLUDE_COOKIE = "mw_no_track";
const ATTRIBUTION_KEY = "mw_attribution";
const EXCLUDE_PARAM = "marwa_no_track";

export interface AttributionData {
  sessionId: string;
  referrer: string;
  referringDomain: string;
  landingPage: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getCookie(name: string): string | undefined {
  if (!isBrowser()) return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function setCookie(name: string, value: string, days: number): void {
  if (!isBrowser()) return;
  const maxAge = Math.max(1, Math.round(days * 86400));
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function generateSessionId(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback for environments without crypto.randomUUID (older browsers) —
  // not cryptographically strong, but this is a tracking id, not a secret.
  return `sid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getReferringDomain(referrer: string): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || "direct";
  } catch {
    return "direct";
  }
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

function parseUtmFromLocation(): Pick<AttributionData, "utmSource" | "utmMedium" | "utmCampaign" | "utmTerm" | "utmContent"> {
  if (!isBrowser()) return {};
  const sp = new URLSearchParams(window.location.search);
  const [utmSource, utmMedium, utmCampaign, utmTerm, utmContent] = UTM_KEYS.map((k) => sp.get(k) ?? undefined);
  return { utmSource, utmMedium, utmCampaign, utmTerm, utmContent };
}

/**
 * Reads the previously-stored first-touch attribution, or captures a fresh
 * one from the current page (referrer/UTMs/landing page) if this is a new
 * session. Idempotent — safe to call on every AnalyticsTracker mount; only
 * ever writes once per cookie lifetime, matching the server's own
 * first-touch-wins rule in POST /api/analytics/session.
 */
export function ensureSession(cookieDays: number): AttributionData {
  const existingId = getCookie(SESSION_COOKIE);
  const stored = getStoredAttribution();

  if (existingId && stored) {
    // Session cookie survives a page reload; re-extend its lifetime so an
    // active visitor's window keeps rolling forward instead of expiring
    // mid-browse.
    setCookie(SESSION_COOKIE, existingId, cookieDays);
    return stored;
  }

  const sessionId = existingId || generateSessionId();
  const referrer = isBrowser() ? document.referrer : "";
  const attribution: AttributionData = {
    sessionId,
    referrer,
    referringDomain: getReferringDomain(referrer),
    landingPage: isBrowser() ? window.location.pathname : "",
    ...parseUtmFromLocation(),
  };

  setCookie(SESSION_COOKIE, sessionId, cookieDays);
  if (isBrowser()) {
    try {
      window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    } catch {
      // Private browsing / storage disabled — attribution just won't survive
      // a reload; the session cookie (and current-page fallback) still work.
    }
  }
  return attribution;
}

export function getStoredAttribution(): AttributionData | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AttributionData;
  } catch {
    return null;
  }
}

export function getSessionId(): string | undefined {
  return getCookie(SESSION_COOKIE);
}

/** What ContactForm/FormBlock inject into every submission — first-touch UTMs plus this-moment's landing/conversion pages. Falls back to whatever's available if a visitor arrives at the form with tracking blocked or storage cleared mid-session. */
export function getAttributionPayload(): {
  sessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  conversionPage?: string;
} {
  const stored = getStoredAttribution();
  const sessionId = stored?.sessionId ?? getSessionId();
  return {
    sessionId,
    utmSource: stored?.utmSource,
    utmMedium: stored?.utmMedium,
    utmCampaign: stored?.utmCampaign,
    landingPage: stored?.landingPage,
    conversionPage: isBrowser() ? window.location.pathname : undefined,
  };
}

// ── Admin-traffic exclusion ─────────────────────────────────────────────
// apps/web and apps/admin are different origins in dev (and can be in prod
// too), so a logged-in admin's session in the admin app isn't visible here
// via ordinary same-origin cookie rules. Instead, visiting this site with
// ?marwa_no_track=1 sets a plain client-side opt-out cookie for a year — the
// admin dashboard surfaces a "copy untracked preview link" using this param
// rather than attempting real cross-origin session detection.

export function isTrackingExcluded(): boolean {
  return getCookie(EXCLUDE_COOKIE) === "1";
}

export function checkExclusionParam(): void {
  if (!isBrowser()) return;
  const sp = new URLSearchParams(window.location.search);
  if (sp.get(EXCLUDE_PARAM) === "1") setCookie(EXCLUDE_COOKIE, "1", 365);
}

// ── Click/Scroll Heatmaps ─────────────────────────────────────────────────

export type HeatmapDevice = "DESKTOP" | "MOBILE" | "TABLET";

/** Viewport-width heuristic — there's no server-side UA parse available client-side, and this is what the click actually happened at, which matters more for a heatmap than a UA-sniffed device category. */
export function getDeviceType(): HeatmapDevice {
  if (!isBrowser()) return "DESKTOP";
  const w = window.innerWidth;
  if (w < 768) return "MOBILE";
  if (w < 1024) return "TABLET";
  return "DESKTOP";
}
