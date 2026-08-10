import type { SiteTemplateCondition } from "@marwa/builder";

function targetLabel(target: SiteTemplateCondition["target"]): string {
  switch (target.kind) {
    case "entire_site":
      return "Entire Site";
    case "home":
      return "Home Page";
    case "contact":
      return "Contact Page";
    case "all_pages":
      return "All Pages";
    case "page":
      return `Page: ${target.pageTitle || target.pageSlug || "(unset)"}`;
  }
}

/** e.g. "Include: Entire Site" or "Include: All Pages · Exclude: Page: Pricing" */
export function summarizeConditions(conditions: SiteTemplateCondition[]): string {
  if (conditions.length === 0) return "No conditions set";
  return conditions.map((c) => `${c.include ? "Include" : "Exclude"}: ${targetLabel(c.target)}`).join(" · ");
}
