import { DYNAMIC_TOKEN_GLOBAL_RE } from "@marwa/builder";
import type { PostContextData, SiteSettings } from "@/lib/api";
import { formatDate } from "@/components/blog/formatDate";

/** What `{{site.*}}` tags resolve against — a small projection of
 *  `SiteSettings`, not the whole (much larger, key-bearing) object, mirroring
 *  why `postContext` is `PostContextData` rather than the raw API type. */
export interface SiteTagData {
  title: string;
  tagline: string;
  url: string;
  logoImage: string;
}

export function siteTagDataFromSettings(settings: SiteSettings | null | undefined): SiteTagData | undefined {
  if (!settings) return undefined;
  return { title: settings.siteName, tagline: settings.tagline, url: settings.siteUrl, logoImage: settings.logoImage ?? "" };
}

interface DynamicTagRuntimeContext {
  post?: PostContextData;
  site?: SiteTagData;
}

function resolveTagValue(key: string, ctx: DynamicTagRuntimeContext): string {
  switch (key) {
    case "post.title":
      return ctx.post?.title ?? "";
    case "post.excerpt":
      return ctx.post?.excerpt ?? "";
    case "post.permalink":
      return ctx.post?.href ?? "";
    case "post.publishedAt":
      return ctx.post?.publishedAt ? formatDate(ctx.post.publishedAt) : "";
    case "post.author":
      return ctx.post?.author?.name ?? "";
    case "post.featuredImage":
      return ctx.post?.featuredImage ?? "";
    case "site.title":
      return ctx.site?.title ?? "";
    case "site.tagline":
      return ctx.site?.tagline ?? "";
    case "site.url":
      return ctx.site?.url ?? "";
    case "site.logoImage":
      return ctx.site?.logoImage ?? "";
    case "site.currentDateTime":
      return new Date().toLocaleString();
    default:
      // Unknown tag key (a category not yet built, or stale data from a
      // future version) — same "never leak {{...}} to a visitor" rule as a
      // known tag with missing context.
      return "";
  }
}

function resolveString(value: string, ctx: DynamicTagRuntimeContext): string {
  if (!value.includes("{{")) return value; // fast path — the overwhelming majority of prop strings have no tokens at all
  return value.replace(DYNAMIC_TOKEN_GLOBAL_RE, (_match, key: string) => resolveTagValue(key, ctx));
}

/**
 * Recursively walks a block's already-schema-parsed `props` and substitutes
 * any `{{tag.key}}` tokens found in string values with real data — called
 * once per node from LayoutRenderer.tsx, right after props are parsed and
 * before they're spread onto the block's component, so every block (current
 * and future) gets this for free with no per-block code. Walks arrays and
 * plain objects too, not just top-level string props, so tokens inside
 * repeater items (e.g. a testimonial's `quote` field) are resolved as well.
 */
export function resolveDynamicTokens<T>(value: T, ctx: DynamicTagRuntimeContext): T {
  if (typeof value === "string") return resolveString(value, ctx) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => resolveDynamicTokens(v, ctx)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = resolveDynamicTokens(v, ctx);
    return out as T;
  }
  return value;
}
