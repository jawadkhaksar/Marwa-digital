// Theme Builder condition system — shared between apps/admin (authoring the
// Include/Exclude rules) and apps/web (resolving which Header/Footer
// template applies to a given page render). Deliberately scoped to this
// site's actual content model (Home, Contact, Pages) rather than
// WordPress's generic Post Type/Archive/Singular/404 taxonomy. Blog routes
// resolve as the "other" context below — the blog has its own dedicated
// chrome-slot template types instead of condition matching.

// "blog_archive_extra"/"blog_post_cta"/"blog_single" are editable-block
// *chrome slots* for the Blog Engine's archive/single-post templates (see
// apps/web's blog components) — unlike header/footer, there's only ever
// meant to be one active row of each (no per-page condition matching
// needed: a blog archive page is always the same page, and every single
// post shares the same CTA slot / the same single-post template), so
// apps/web resolves them with a direct "first active row of this type"
// lookup rather than going through resolveSiteTemplate's condition-matching
// below. Still edited through the exact same Theme Builder canvas as
// Header/Footer, so every block inside is real and editable — just without
// the Conditions step being meaningful for them. "blog_single" additionally
// gets real post data via `postContext` (see LayoutRenderer.tsx) so its
// dynamic PostTitle/PostFeaturedImage/PostContent/PostMeta blocks can render
// the actual post being viewed instead of static admin-authored content.
//
// "blog_loop_item" is a different shape entirely — NOT a singleton slot.
// It's a reusable single-card design (e.g. image/title/excerpt/button)
// referenced BY ID from a `Posts` block's own `loopTemplateId` prop, the
// same per-instance-reference pattern the `Template` block already uses for
// its `templateId` — an admin can have several of these (different card
// designs for different Posts blocks), unlike the "only one active row
// matters" types above. It still gets real per-post data via `postContext`
// when a Posts block repeats it once per post (see PostsBlock.tsx).
export const SITE_TEMPLATE_TYPE_VALUES = ["header", "footer", "blog_archive_extra", "blog_post_cta", "blog_single", "blog_loop_item"] as const;
export type SiteTemplateType = (typeof SITE_TEMPLATE_TYPE_VALUES)[number];

export const SITE_TEMPLATE_TARGET_KIND_VALUES = [
  "entire_site",
  "home",
  "contact",
  "all_pages",
  "page",
] as const;
export type SiteTemplateTargetKind = (typeof SITE_TEMPLATE_TARGET_KIND_VALUES)[number];

export type SiteTemplateTarget =
  | { kind: "entire_site" }
  | { kind: "home" }
  | { kind: "contact" }
  | { kind: "all_pages" }
  | { kind: "page"; pageSlug: string; pageTitle?: string };

export interface SiteTemplateCondition {
  include: boolean; // true = Include, false = Exclude
  target: SiteTemplateTarget;
}

/** What's actually being rendered right now, from the web app's perspective — passed to resolveSiteTemplate to find the matching Header/Footer. */
export type PageContext =
  | { kind: "home" }
  | { kind: "contact" }
  | { kind: "page"; pageSlug: string }
  // Catch-all for routes with no more specific PageContext (the blog, any
  // future route that doesn't call SiteHeader/SiteFooter with an explicit
  // context) — SiteHeader/SiteFooter default to this instead of skipping
  // template resolution entirely when no context prop is passed. Matches
  // "entire_site" Include conditions (targetMatches' entire_site case is
  // unconditional) but nothing more specific, so a Header scoped to e.g.
  // "one specific page" correctly still won't apply here.
  | { kind: "other" };

/** Higher rank = more specific. Ties within the same template are broken by `priority` (lower wins), then most-recently-updated. */
const SPECIFICITY_RANK: Record<SiteTemplateTargetKind, number> = {
  page: 3,
  home: 3,
  contact: 3,
  all_pages: 2,
  entire_site: 1,
};

function targetMatches(context: PageContext, target: SiteTemplateTarget): boolean {
  switch (target.kind) {
    case "entire_site":
      return true;
    case "home":
      return context.kind === "home";
    case "contact":
      return context.kind === "contact";
    case "all_pages":
      return context.kind === "page";
    case "page":
      return context.kind === "page" && context.pageSlug === target.pageSlug;
  }
}

export interface SiteTemplateLike {
  id: string;
  conditions: SiteTemplateCondition[];
  priority: number;
  active: boolean;
  updatedAt: string | Date;
}

/**
 * Picks the best-matching template for `context` out of `templates` (already
 * filtered to one `type`, e.g. all "header" rows). Real Elementor-matching
 * behavior in spirit, not necessarily byte-identical to its (undocumented)
 * internals: the most specific matching condition wins; an Exclude at the
 * same-or-higher specificity as a template's best Include removes that
 * template from candidacy entirely, regardless of any other Include it has.
 * Returns `null` when nothing matches (or no templates exist) — the caller
 * falls back to the site's own hard-coded Header/Footer.
 */
export function resolveSiteTemplate<T extends SiteTemplateLike>(templates: T[], context: PageContext): T | null {
  let best: { template: T; rank: number } | null = null;

  for (const template of templates) {
    if (!template.active) continue;

    let bestIncludeRank = -1;
    let bestExcludeRank = -1;
    for (const condition of template.conditions) {
      if (!targetMatches(context, condition.target)) continue;
      const rank = SPECIFICITY_RANK[condition.target.kind];
      if (condition.include) bestIncludeRank = Math.max(bestIncludeRank, rank);
      else bestExcludeRank = Math.max(bestExcludeRank, rank);
    }

    if (bestIncludeRank === -1) continue; // no matching Include at all
    if (bestExcludeRank >= bestIncludeRank) continue; // excluded at equal-or-higher specificity

    if (
      !best ||
      bestIncludeRank > best.rank ||
      (bestIncludeRank === best.rank && template.priority < best.template.priority) ||
      (bestIncludeRank === best.rank && template.priority === best.template.priority && new Date(template.updatedAt) > new Date(best.template.updatedAt))
    ) {
      best = { template, rank: bestIncludeRank };
    }
  }

  return best?.template ?? null;
}
