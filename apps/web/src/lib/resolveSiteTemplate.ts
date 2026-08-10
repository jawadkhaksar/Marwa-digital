import { api, type SiteTemplate } from "./api";
import { resolveSiteTemplate, type PageContext, type SiteTemplateType } from "@marwa/builder";

export type { PageContext };

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
