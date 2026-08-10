"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

function titleCase(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** No real page-hierarchy data model exists (pages aren't parent/child in the CMS) — trail is derived from the current URL path itself, which works site-wide with no extra data. */
export function BreadcrumbsBlock({
  homeLabel,
  separator,
  linkColor,
  activeColor,
  separatorColor,
  fontSize,
}: {
  homeLabel?: string;
  separator?: string;
  linkColor?: string;
  activeColor?: string;
  separatorColor?: string;
  fontSize?: string;
}) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = [
    { label: homeLabel || "Home", href: "/" },
    ...segments.map((seg, i) => ({ label: titleCase(seg), href: "/" + segments.slice(0, i + 1).join("/") })),
  ];

  return (
    <nav aria-label="Breadcrumb" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", fontSize: `var(--exr-fontSize, ${fontSize || "13px"})` }}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={crumb.href} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {i > 0 && <span style={{ color: `var(--exr-separatorColor, ${separatorColor || "#999"})` }}>{separator || "/"}</span>}
            {isLast ? (
              <span style={{ color: `var(--exr-activeColor, ${activeColor || "inherit"})`, fontWeight: 600 }}>{crumb.label}</span>
            ) : (
              <Link href={crumb.href} style={{ color: `var(--exr-linkColor, ${linkColor || "#2563FF"})`, textDecoration: "none" }}>
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
