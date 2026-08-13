import type { LayoutDocument } from "@marwa/builder";
import { api, type SiteTemplate } from "./api";
import { resolveSiteTemplate, type PageContext, type SiteTemplateType } from "@marwa/builder";

export type { PageContext };

// SiteHeader/SiteFooter start `templateLayout` at `null` and resolve it via
// a client-side fetch (see resolveActiveSiteTemplate below) rather than
// blocking the whole header/footer on that request — the right call for the
// common case (no Theme Builder override), but it means the FIRST time a
// page with an active override loads in a session, the hard-coded
// header/footer paints for one fetch round-trip before swapping to the
// custom one. Caching the last-resolved layout per (type, context) in
// sessionStorage and restoring it synchronously in a layout effect (see
// callers) closes that gap for every subsequent navigation in the same tab
// — the fetch still runs to catch changes, it just doesn't gate the first
// paint once something's already been seen this session.
function cacheKey(type: SiteTemplateType, context: PageContext): string {
  return `tb-template:${type}:${JSON.stringify(context)}`;
}

export function readCachedTemplateLayout(type: SiteTemplateType, context: PageContext): LayoutDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(type, context));
    // "null" is a real cached value (this page resolved to "no override" —
    // caching that too avoids re-flashing the hard-coded chrome on every
    // navigation for the vast majority of pages that never have one).
    return raw ? (JSON.parse(raw) as LayoutDocument | null) : null;
  } catch {
    return null;
  }
}

export function writeCachedTemplateLayout(type: SiteTemplateType, context: PageContext, layout: LayoutDocument | null): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(cacheKey(type, context), JSON.stringify(layout));
  } catch {
    // Storage full/disabled — the fetch-driven state still works, this is a pure UX nicety.
  }
}

/**
 * Fetches this site's active Header/Footer templates and picks the one that
 * matches `context` (see packages/builder/src/siteTemplate.ts for the
 * specificity-ranked Include/Exclude algorithm). Called from SiteHeader/
 * SiteFooter — both client components — so any failure (network, malformed
 * data) is swallowed and treated as "no match," falling back to the site's
 * normal hard-coded header/footer rather than breaking every page's chrome.
 */
export async function resolveActiveSiteTemplate(type: SiteTemplateType, context: PageContext): Promise<SiteTemplate | null> {
  try {
    const templates = await api.getSiteTemplates(type);
    return resolveSiteTemplate(templates, context);
  } catch {
    return null;
  }
}
