import { api, ApiError } from "@/lib/api";
import type { Page } from "@/lib/api";
import type { LayoutDocument } from "@marwa/builder";

/**
 * `/` is the one remaining hand-coded route that isn't simply "a Page at this
 * slug" — it falls back to a placeholder when nothing is configured, and can
 * still be overridden at the legacy `core-home` slug for backward
 * compatibility with sites that used the old "Convert to Builder" flow.
 * New setups should use Settings → Reading → Homepage instead, which takes
 * priority (see app/page.tsx).
 *
 * `/contact` used to work the same way but no longer does — it's now an
 * ordinary Page row (slug `"contact"`), served like any other page through
 * `[...slug]/page.tsx`. No entry for it belongs here.
 *
 * Draft-vs-published doubles as an undo switch for `home`: the public
 * `/api/pages/:slug` endpoint 404s for unpublished pages, so setting the
 * override to Draft transparently reverts `/` to its placeholder without
 * deleting the builder work.
 */
export const CORE_OVERRIDE_SLUGS = {
  home: "core-home",
} as const;

/** Fetches the raw override Page row (or null) — used when a route needs more than just `.layout`, e.g. its metaTitle/metaDescription for generateMetadata. */
export async function getCoreOverridePage(slug: string): Promise<Page | null> {
  try {
    return await api.getPage(slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getCoreLayoutOverride(slug: string): Promise<LayoutDocument | null> {
  const page = await getCoreOverridePage(slug);
  if (!page || page.editorMode !== "BUILDER" || !page.layout) return null;
  return page.layout;
}
