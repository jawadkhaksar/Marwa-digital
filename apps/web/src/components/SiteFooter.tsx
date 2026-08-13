"use client";

import { useEffect, useState } from "react";
import type { LayoutDocument } from "@marwa/builder";
import { api, type SiteSettings } from "@/lib/api";
import { resolveActiveSiteTemplate, writeCachedTemplateLayout, type PageContext } from "@/lib/resolveSiteTemplate";
import { LayoutRenderer } from "./builder/LayoutRenderer";
import { siteTagDataFromSettings } from "./builder/resolveDynamicTokens";

/**
 * The site footer, always rendered from the Theme Builder Footer template
 * (Admin → Appearance & Builder → Theme Builder).
 *
 * Mirrors SiteHeader exactly — see the longer note there for why the
 * hard-coded markup that used to live here was removed rather than kept as a
 * fallback.
 */
export function SiteFooter({
  context = { kind: "other" },
  initialTemplate = null,
}: {
  context?: PageContext;
  initialTemplate?: LayoutDocument | null;
} = {}) {
  const [templateLayout, setTemplateLayout] = useState<LayoutDocument | null>(initialTemplate);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);


  useEffect(() => {
    let cancelled = false;
    resolveActiveSiteTemplate("footer", context).then((template) => {
      const layout = template?.layout ?? null;
      // See SiteHeader: a failed request must not tear down a footer that is
      // already rendering correctly.
      if (!cancelled && layout) setTemplateLayout(layout);
      writeCachedTemplateLayout("footer", context, layout);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(context)]);

  if (!templateLayout) return null;

  return <LayoutRenderer blocks={templateLayout} siteContext={siteTagDataFromSettings(settings)} showAddSectionBanner={false} />;
}
