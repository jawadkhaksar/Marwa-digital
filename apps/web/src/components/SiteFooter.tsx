"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { LayoutDocument } from "@marwa/builder";
import { Logo } from "./home/Logo";
import {
  IconFacebook,
  IconInstagram,
  IconTwitter,
  IconYoutube,
  IconMail,
  IconPin,
  IconPhone,
  IconVisa,
  IconMastercard,
  IconDiscover,
  IconAmex,
  IconPaypal,
  IconApplePay,
  IconGooglePay,
} from "./home/icons";
import { api, type FooterLink, type SiteSettings, type MenuLink } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { resolveActiveSiteTemplate, readCachedTemplateLayout, writeCachedTemplateLayout, type PageContext } from "@/lib/resolveSiteTemplate";
import { LayoutRenderer } from "./builder/LayoutRenderer";
import { siteTagDataFromSettings } from "./builder/resolveDynamicTokens";

const SOCIAL_ICONS = {
  facebookUrl: IconFacebook,
  instagramUrl: IconInstagram,
  twitterUrl: IconTwitter,
  youtubeUrl: IconYoutube,
} as const;

export const PAYMENT_METHOD_ICONS = {
  visa: IconVisa,
  mastercard: IconMastercard,
  discover: IconDiscover,
  amex: IconAmex,
  paypal: IconPaypal,
  applepay: IconApplePay,
  googlepay: IconGooglePay,
} as const;

export const PAYMENT_METHOD_LABELS: Record<keyof typeof PAYMENT_METHOD_ICONS, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  discover: "Discover",
  amex: "American Express",
  paypal: "PayPal",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
};

export function SiteFooter({ context = { kind: "other" } }: { context?: PageContext } = {}) {
  const [links, setLinks] = useState<FooterLink[]>([]);
  // Admin → Menus → "Show in Footer" — when a menu is assigned there, its
  // items replace the "Quick Links" column below instead of the static
  // FooterLink rows (which still power "Legal", a grouping this newer
  // unified Menu system has no equivalent for). null while loading/unset,
  // so the very first render doesn't flash the FooterLink version first.
  const [footerMenuItems, setFooterMenuItems] = useState<MenuLink[] | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  // Starts `null` (render the hard-coded footer immediately) rather than a
  // blocking "loading" state — same fix as SiteHeader: most pages have no
  // Theme Builder override, so gating the whole footer on that fetch
  // resolving meant every page load showed a blank strip until it returned.
  // `context` always has a value now (defaults to `{kind:"other"}` below) —
  // Theme Builder resolution runs on every route, so an "Entire Site"
  // Include still applies to routes (e.g. /booking/*) that don't pass a
  // specific context.
  const [templateLayout, setTemplateLayout] = useState<LayoutDocument | null>(null);

  useEffect(() => {
    api.getFooterLinks().then(setLinks).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
    api
      .getMenuByLocation("footer")
      .then((res) => setFooterMenuItems(res.menu ? res.items : []))
      .catch(() => setFooterMenuItems([]));
  }, []);

  // Restores a same-session cached result before paint — see SiteHeader's
  // matching layout effect for why this can't just be the useState initializer.
  useLayoutEffect(() => {
    const cached = readCachedTemplateLayout("footer", context);
    if (cached) setTemplateLayout(cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(context)]);

  // Theme Builder — a custom Footer template (Settings → Theme Builder)
  // takes over entirely when one matches this page; falls back to the
  // hard-coded footer below when it doesn't (or the request fails).
  useEffect(() => {
    let cancelled = false;
    resolveActiveSiteTemplate("footer", context).then((template) => {
      const layout = template?.layout ?? null;
      if (!cancelled) setTemplateLayout(layout);
      writeCachedTemplateLayout("footer", context, layout);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(context)]);

  if (templateLayout) {
    return <LayoutRenderer blocks={templateLayout} siteContext={siteTagDataFromSettings(settings)} showAddSectionBanner={false} />;
  }

  const quickLinks: { id: string; label: string; href: string }[] =
    footerMenuItems && footerMenuItems.length > 0 ? footerMenuItems : links.filter((l) => l.group === "Quick Links");
  const legalLinks = links.filter((l) => l.group === "Legal");
  const socials = (Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[])
    .map((key) => ({ key, url: settings?.[key], Icon: SOCIAL_ICONS[key] }))
    .filter((s) => s.url);
  const copyrightText = (settings?.footerCopyrightText ?? "All Rights Reserved © {year} {siteName}.")
    .replace("{year}", String(new Date().getFullYear()))
    .replace("{siteName}", settings?.siteName ?? "Marwa Digital");

  return (
    <footer className="bg-ink px-6 pb-8 pt-16 text-foreground/60 md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Logo
              logoImage={settings?.logoImage ? resolveImageUrl(settings.logoImage) : null}
              siteName={settings?.siteName}
              taglineText={settings?.tagline}
            />
            <p className="mt-4 max-w-xs text-sm">{settings?.description}</p>
            {socials.length > 0 && (
              <div className="mt-5 flex gap-3">
                {socials.map(({ key, url, Icon }) => (
                  <a
                    key={key}
                    href={url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={key.replace("Url", "")}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/20 text-foreground/70 transition-colors hover:border-gold hover:text-gold"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <FooterColumn title="Quick Links" links={quickLinks} />
          <FooterColumn title="Legal" links={legalLinks} />

          <div>
            <h4 className="text-lg font-bold text-foreground">Contact Us</h4>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <IconMail className="h-4 w-4 shrink-0" /> {settings?.contactEmail}
              </li>
              <li className="flex items-center gap-2">
                <IconPin className="h-4 w-4 shrink-0" /> {settings?.contactAddress}
              </li>
              <li className="flex items-center gap-2">
                <IconPhone className="h-4 w-4 shrink-0" /> {settings?.contactPhone}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-ink-border pt-6 text-center text-xs text-foreground/40">
          {copyrightText}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { id: string; label: string; href: string }[] }) {
  return (
    <div>
      <h4 className="text-lg font-bold text-foreground">{title}</h4>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.id}>
            <a href={link.href} className="transition-colors hover:text-gold">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
