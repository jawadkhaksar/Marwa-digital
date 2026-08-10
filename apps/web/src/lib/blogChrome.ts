import { api } from "@/lib/api";

/**
 * The Blog Engine's editable chrome slots ("blog_archive_extra",
 * "blog_post_cta", "blog_single") are just SiteTemplate rows, edited
 * through the exact same Theme Builder canvas as Header/Footer — but unlike
 * Header/Footer, there's only ever meant to be one of each in use (no
 * per-page condition matching: the archive page is always the same page,
 * every post shares the same CTA slot / the same single-post template), so
 * this takes the first active row of that type directly instead of going
 * through resolveSiteTemplate's condition matching. Returns `null` when the
 * admin hasn't created one yet (or deactivated it) — callers fall back to
 * their own default (the archive's own extra section, the default CTA
 * banner, or — for "blog_single" — the hardcoded PostTemplateA/B/C).
 */
export async function getBlogChromeLayout(type: "blog_archive_extra" | "blog_post_cta" | "blog_single") {
  try {
    const templates = await api.getSiteTemplates(type);
    return templates[0]?.layout ?? null;
  } catch {
    return null;
  }
}
