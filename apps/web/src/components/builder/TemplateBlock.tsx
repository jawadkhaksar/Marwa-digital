import { api, ApiError, type PostContextData } from "@/lib/api";
import { LayoutRenderer } from "@/components/builder/LayoutRenderer";
import type { SiteTagData } from "@/components/builder/resolveDynamicTokens";

/**
 * Recurses back into LayoutRenderer with another saved SiteTemplate's own
 * layout tree — real, not a shell: `GET /api/site-templates/:id` already
 * exists and is already public (the Theme Builder header/footer resolver
 * calls it on every page load), so this just points the same fetch at an
 * admin-chosen template id. An async Server Component, same pattern Next's
 * App Router already uses for every page/layout.tsx in this app.
 *
 * `postContext`/`siteContext` arrive as normal props (LayoutRenderer spreads
 * both onto every block component, same as any other block) — just passed
 * straight through to the nested render, so dynamic tags and post-bound
 * blocks keep working inside a Template-embedded layout, not just at the
 * top level.
 */
export async function TemplateBlock({
  templateId,
  postContext,
  siteContext,
}: {
  templateId?: string;
  postContext?: PostContextData;
  siteContext?: SiteTagData;
}) {
  if (!templateId) return null;
  let template;
  try {
    template = await api.getSiteTemplate(templateId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
  return <LayoutRenderer blocks={template.layout} postContext={postContext} siteContext={siteContext} showAddSectionBanner={false} />;
}
