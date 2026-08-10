import type { Request } from "express";
import { UAParser } from "ua-parser-js";
import rateLimit from "express-rate-limit";

/**
 * Real client IP behind a proxy/load balancer — same `x-forwarded-for`
 * convention forms.ts already uses for FormSubmission.userIp, pulled out
 * here so the tracking endpoints (which need it for both storage and geo
 * header lookups) don't re-hand-roll it a third time.
 */
export function extractIp(req: Request): string | undefined {
  const forwardedFor = req.headers["x-forwarded-for"];
  return (typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : undefined) || req.socket.remoteAddress || undefined;
}

/**
 * Best-effort country/city — read from whichever edge platform's request
 * headers are present (Vercel and Cloudflare both inject geo headers at
 * their edge, before the request ever reaches this server) rather than an
 * IP-geolocation database/API call, which would need a paid service or a
 * regularly-updated local database this project has no other use for.
 * Both come back `undefined` for a plain self-hosted deploy or local dev —
 * VisitorSession.country/city are nullable specifically for that case.
 */
export function extractGeo(req: Request): { country?: string; city?: string } {
  const header = (name: string): string | undefined => {
    const value = req.headers[name];
    return typeof value === "string" && value ? value : undefined;
  };

  const country = header("x-vercel-ip-country") || header("cf-ipcountry");
  const city = header("x-vercel-ip-city") || header("cf-ipcity");
  return {
    country: country ? decodeURIComponent(country) : undefined,
    city: city ? decodeURIComponent(city) : undefined,
  };
}

export interface ParsedUserAgent {
  deviceType?: string; // "desktop" | "mobile" | "tablet"
  browser?: string;
  os?: string;
}

/** Device/browser/OS breakdown for the Sources/Overview reports — ua-parser-js's device.type is undefined for desktop (there's no "desktop" device category upstream), normalized to a real value here. */
export function parseUserAgent(userAgent: string | undefined): ParsedUserAgent {
  if (!userAgent) return {};
  const result = new UAParser(userAgent).getResult();
  const deviceType = result.device.type === "mobile" || result.device.type === "tablet" ? result.device.type : "desktop";
  return {
    deviceType,
    browser: result.browser.name,
    os: result.os.name,
  };
}

/**
 * Hostname a visitor arrived from, normalized for grouping in the Sources
 * report — "direct" (not null) for no-referrer visits so it can be grouped
 * and sorted alongside real domains in the same list, matching how every
 * other analytics tool buckets direct traffic.
 */
export function extractReferringDomain(referrer: string | undefined | null): string {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || "direct";
  } catch {
    return "direct";
  }
}

/**
 * Coarse channel bucket for the Acquisition Channels donut chart — derived
 * from utmMedium first (an explicit tag always wins), falling back to
 * referringDomain heuristics for organic search/social/referral traffic
 * that never passed through a tagged campaign link.
 */
const SEARCH_ENGINES = ["google", "bing", "yahoo", "duckduckgo", "baidu", "yandex", "ecosia"];
const SOCIAL_DOMAINS = ["facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com", "tiktok.com", "pinterest.com", "youtube.com", "reddit.com"];

export function classifyChannel(input: { utmMedium?: string | null; utmSource?: string | null; referringDomain?: string | null }): string {
  const medium = input.utmMedium?.toLowerCase();
  if (medium) {
    if (medium === "cpc" || medium === "ppc" || medium === "paid" || medium.includes("paid")) return "Paid";
    if (medium === "email") return "Email";
    if (medium === "social" || medium === "social-media") return "Social";
    if (medium === "organic") return "Organic Search";
    if (medium === "referral") return "Referral";
  }

  const domain = input.referringDomain?.toLowerCase();
  if (!domain || domain === "direct") return "Direct";
  if (SEARCH_ENGINES.some((engine) => domain.includes(engine))) return "Organic Search";
  if (SOCIAL_DOMAINS.some((social) => domain.includes(social))) return "Social";
  return "Referral";
}

/**
 * Tracking-beacon traffic ceiling — much more generous than formsLimiter
 * (a real visitor firing a pageview on every route change, plus one session
 * call, is routine, not abuse) but still a real defense-in-depth ceiling
 * against a scripted beacon flood from a single IP.
 */
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
