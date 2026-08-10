"use client";

import { SiteHeader } from "./SiteHeader";
import type { PageContext } from "@/lib/resolveSiteTemplate";

/**
 * Every non-homepage page should render the exact same header as the
 * homepage (nav, language toggle, Book now) — just docked solid at the top
 * instead of floating transparently over a hero image.
 */
export function SubPageHeader({ context }: { context?: PageContext } = {}) {
  return <SiteHeader solid context={context} />;
}
