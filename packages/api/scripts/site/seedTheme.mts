// Builds the site-wide Header and Footer as Theme Builder templates
// (SiteTemplate rows), so the chrome is editable in the builder exactly like
// any page — rather than living in hard-coded React that only a developer
// can change. Idempotent by title.
import { T, n } from "./kit.mjs";
import type { LayoutNode } from "@marwa/builder";

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const out = (i >= 0 ? process.argv[i + 1] : undefined) ?? fallback;
  if (!out) throw new Error(`Missing --${name}`);
  return out;
}

const API = arg("api", "http://localhost:4000").replace(/\/$/, "");
const EMAIL = arg("email");
const PASSWORD = arg("password");

const INK = T.text;
const MUTED = T.muted;

function navLink(label: string, href: string): LayoutNode {
  return n(
    "CTAButton",
    {
      label,
      href,
      variant: "gold",
      background: "transparent",
      color: INK,
      borderStyle: "none",
      borderRadius: "8px",
      fontSize: "0.95rem",
      fontWeight: "600",
      paddingTop: "8px",
      paddingBottom: "8px",
      paddingLeft: "12px",
      paddingRight: "12px",
    },
    {
      style: {
        hoverTransitionDuration: "0.24s",
        hover: { color: T.accent, background: "rgba(37,99,255,0.07)" },
      },
    }
  );
}

function headerLayout() {
  const logo = n("SiteLogo", { link: "site", align: "left", imageMaxWidth: "168px" });

  const nav = n(
    "Section",
    { layoutMode: "flex", direction: "row", gap: "4px", wrap: "wrap", alignItems: "center", justifyContent: "center", contentWidth: "full", background: "transparent" },
    {
      children: [
        navLink("Home", "/home"),
        navLink("Services", "/services"),
        navLink("Case Studies", "/case-studies"),
        navLink("About", "/about"),
        navLink("Pricing", "/pricing"),
        navLink("Insights", "/insights"),
      ],
    }
  );

  const cta = n(
    "Section",
    { layoutMode: "flex", direction: "row", gap: "10px", alignItems: "center", justifyContent: "flex-end", contentWidth: "full", background: "transparent" },
    {
      children: [
        n(
          "CTAButton",
          {
            label: "Start a project",
            href: "/contact",
            variant: "gold",
            background: T.gradient,
            color: "#ffffff",
            borderStyle: "none",
            borderRadius: "9999px",
            fontSize: "0.92rem",
            fontWeight: "700",
            paddingTop: "13px",
            paddingBottom: "13px",
            paddingLeft: "26px",
            paddingRight: "26px",
            boxShadow: "0 10px 26px rgba(37,99,255,0.30)",
          },
          {
            style: {
              hoverTransitionDuration: "0.34s",
              hoverTransitionEasing: "cubic-bezier(0.22, 1, 0.36, 1)",
              hover: { transform: "translateY(-3px) scale(1.04)", boxShadow: "0 18px 38px rgba(37,99,255,0.42)" },
            },
          }
        ),
      ],
    }
  );

  const bar = n(
    "Columns",
    { columnCount: 3, ratio: "25-75", gap: "20px", layoutMode: "grid", alignItems: "center", contentWidth: "boxed", width: T.maxWidth },
    { children: [logo, nav, cta] }
  );

  return {
    version: 1 as const,
    nodes: [
      n(
        "Section",
        {
          layoutMode: "flex",
          direction: "column",
          justifyContent: "center",
          alignItems: "stretch",
          contentWidth: "full",
          background: "rgba(255,255,255,0.86)",
          htmlTag: "header",
        },
        {
          children: [bar],
          name: "site-header",
          style: {
            paddingTop: "16px",
            paddingBottom: "16px",
            paddingLeft: "24px",
            paddingRight: "24px",
            borderStyle: "solid",
            borderWidthBottom: "1px",
            borderColor: T.surfaceBorder,
            backdropFilterBlur: "14px",
            mobile: { paddingLeft: "16px", paddingRight: "16px" },
          },
        }
      ),
    ],
  };
}

function footerColumn(title: string, links: { label: string; href: string }[]): LayoutNode {
  return n(
    "Section",
    { layoutMode: "flex", direction: "column", gap: "12px", contentWidth: "full", background: "transparent" },
    {
      children: [
        n("Heading", { text: title, level: "div", fontSize: "0.82rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.14em", color: MUTED }),
        n("IconList", {
          items: links.map((l) => ({ text: l.label, icon: "FaChevronRight", href: l.href, openInNewTab: false })),
          layout: "list",
          listGap: "10px",
          listAlign: "flex-start",
          dividerEnabled: false,
          applyLinkOn: "full",
          iconColor: T.accent,
          iconSize: "11px",
          iconGap: "9px",
          textColor: INK,
          textFontSize: "0.95rem",
          textFontWeight: "500",
        }),
      ],
    }
  );
}

function footerLayout() {
  const brand = n(
    "Section",
    { layoutMode: "flex", direction: "column", gap: "16px", contentWidth: "full", background: "transparent" },
    {
      children: [
        n("SiteLogo", { link: "site", align: "left", imageMaxWidth: "170px" }),
        n("RichText", {
          html: "<p>A strategy-led digital agency building websites, brands and search programmes that turn traffic into revenue.</p>",
          color: MUTED,
          fontSize: "0.96rem",
          lineHeight: "1.7",
        }),
        n("SocialIcons", {
          socials: [
            { platform: "linkedin", url: "https://linkedin.com" },
            { platform: "twitter", url: "https://twitter.com" },
            { platform: "instagram", url: "https://instagram.com" },
            { platform: "facebook", url: "https://facebook.com" },
          ],
          iconColor: INK,
          iconHoverColor: "#ffffff",
          iconBackground: "rgba(15,23,42,0.05)",
          iconHoverBackground: T.accent,
          iconSize: "18px",
          iconGap: "10px",
          iconBorderStyle: "solid",
          iconBorderWidth: "1px",
          iconBorderColor: T.surfaceBorder,
          iconBorderRadius: "9999px",
        }),
      ],
    }
  );

  const columns = n(
    "Columns",
    { columnCount: 4, ratio: "equal", gap: "34px", layoutMode: "grid", alignItems: "flex-start", contentWidth: "full" },
    {
      children: [
        brand,
        footerColumn("Services", [
          { label: "Web Design", href: "/services#web-design" },
          { label: "Web Development", href: "/services#web-development" },
          { label: "SEO & Content", href: "/services#seo" },
          { label: "E-commerce", href: "/services#ecommerce" },
          { label: "Branding", href: "/services#branding" },
        ]),
        footerColumn("Company", [
          { label: "About Us", href: "/about" },
          { label: "Case Studies", href: "/case-studies" },
          { label: "Pricing", href: "/pricing" },
          { label: "Insights", href: "/insights" },
          { label: "Contact", href: "/contact" },
        ]),
        footerColumn("Get in touch", [
          { label: "hello@marwadigital.com", href: "mailto:hello@marwadigital.com" },
          { label: "Request a proposal", href: "/contact" },
          { label: "Book a call", href: "/contact" },
        ]),
      ],
    }
  );

  const legal = n(
    "Section",
    { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", alignItems: "center", justifyContent: "space-between", contentWidth: "full", background: "transparent" },
    {
      children: [
        n("RichText", { html: `<p>© ${new Date().getFullYear()} Marwa Digital. All rights reserved.</p>`, color: MUTED, fontSize: "0.86rem" }),
        n("RichText", { html: "<p>Built with the Marwa Digital platform.</p>", color: MUTED, fontSize: "0.86rem" }),
      ],
      style: {
        paddingTop: "22px",
        borderStyle: "solid",
        borderWidthTop: "1px",
        borderColor: T.surfaceBorder,
        marginTop: "10px",
      },
    }
  );

  const inner = n(
    "Section",
    { layoutMode: "flex", direction: "column", gap: "30px", contentWidth: "boxed", width: T.maxWidth, background: "transparent" },
    { children: [columns, legal], style: { width: "100%" } }
  );

  return {
    version: 1 as const,
    nodes: [
      n(
        "Section",
        { layoutMode: "flex", direction: "column", justifyContent: "center", alignItems: "stretch", contentWidth: "full", background: T.bgAlt, htmlTag: "footer" },
        {
          children: [inner],
          name: "site-footer",
          style: {
            paddingTop: "72px",
            paddingBottom: "44px",
            paddingLeft: "24px",
            paddingRight: "24px",
            borderStyle: "solid",
            borderWidthTop: "1px",
            borderColor: T.surfaceBorder,
            mobile: { paddingTop: "52px", paddingLeft: "16px", paddingRight: "16px" },
          },
        }
      ),
    ],
  };
}

async function main() {
  const loginRes = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed (${loginRes.status})`);
  const { token } = (await loginRes.json()) as { token: string };
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const existing = (await (await fetch(`${API}/api/admin/site-templates`, { headers })).json()) as { id: string; title: string }[];

  const templates = [
    { type: "header", title: "Main Header", layout: headerLayout() },
    { type: "footer", title: "Main Footer", layout: footerLayout() },
  ];

  for (const tpl of templates) {
    const payload = {
      ...tpl,
      // Applies everywhere; a more specific template can still override it
      // per-page later without touching this one.
      conditions: [{ include: true, target: { kind: "entire_site" } }],
      priority: 0,
      active: true,
    };
    const found = existing.find((e) => e.title === tpl.title);
    const res = found
      ? await fetch(`${API}/api/admin/site-templates/${found.id}`, { method: "PATCH", headers, body: JSON.stringify(payload) })
      : await fetch(`${API}/api/admin/site-templates`, { method: "POST", headers, body: JSON.stringify(payload) });
    console.log(`${res.ok ? (found ? "updated" : "created") : `FAILED (${res.status})`}  ${tpl.type}: ${tpl.title}`);
    if (!res.ok) console.warn((await res.text()).slice(0, 400));
  }
  console.log("\nTheme Builder header/footer configured.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
