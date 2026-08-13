"use client";

import { useEffect, useState } from "react";
import type { LayoutDocument } from "@marwa/builder";
import { api, type SiteSettings } from "@/lib/api";
import { resolveActiveSiteTemplate, writeCachedTemplateLayout, type PageContext } from "@/lib/resolveSiteTemplate";
import { LayoutRenderer } from "./builder/LayoutRenderer";
import { siteTagDataFromSettings } from "./builder/resolveDynamicTokens";

/**
 * The site header, always rendered from the Theme Builder Header template
 * (Admin → Appearance & Builder → Theme Builder).
 *
 * There used to be a hard-coded header here — a fixed logo, "Service"
 * dropdown, language switcher and "Book now" button — which rendered by
 * default and was replaced by the Theme Builder template once a client-side
 * fetch resolved. That meant the real header was never what shipped in the
 * server HTML, every page briefly flashed a header nobody had designed, and
 * editing the Header template appeared to do nothing on any page where the
 * fetch was slow or failed. The template is the single source of truth now.
 *
 * `initialTemplate` is how a Server Component hands the already-resolved
 * template in, so the correct header is in the server HTML rather than
 * appearing a moment later. Callers that cannot resolve it server-side still
 * work — the effect below fetches it — they just render nothing until it
 * arrives, which is the honest representation of "no header configured yet".
 *
 * There is deliberately no session-storage cache read here any more. It
 * existed to cover the gap before the fetch resolved, but the server now
 * supplies the template on every CMS route, and restoring cached markup in an
 * effect meant setting state during hydration — the pattern React's
 * set-state-in-effect rule flags.
 */
export function SiteHeader({
  context = { kind: "other" },
  initialTemplate = null,
}: {
  /** Retained for call-site compatibility; the template controls its own appearance. */
  solid?: boolean;
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
    resolveActiveSiteTemplate("header", context).then((template) => {
      const layout = template?.layout ?? null;
      // A failed request resolves to null. Keeping whatever is already on
      // screen in that case is better than tearing a working header down
      // because one fetch did not come back.
      if (!cancelled && layout) setTemplateLayout(layout);
      writeCachedTemplateLayout("header", context, layout);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(context)]);

  if (!templateLayout) return null;

  return <LayoutRenderer blocks={templateLayout} siteContext={siteTagDataFromSettings(settings)} showAddSectionBanner={false} />;
}
