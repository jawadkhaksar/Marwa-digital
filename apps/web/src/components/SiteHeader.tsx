"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import gsap from "gsap";
import type { LayoutDocument } from "@marwa/builder";
import { Logo } from "./home/Logo";
import { IconChevron } from "./home/icons";
import { MiniServicePreview } from "./home/MiniServicePreview";
import { MenuDropdownPreview } from "./home/MenuDropdownPreview";
import { api, type MenuLink, type SiteSettings } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { getCurrentLang, setLang as applyLang, type SiteLang } from "@/lib/googleTranslate";
import { resolveActiveSiteTemplate, readCachedTemplateLayout, writeCachedTemplateLayout, type PageContext } from "@/lib/resolveSiteTemplate";
import { LayoutRenderer } from "./builder/LayoutRenderer";
import { siteTagDataFromSettings } from "./builder/resolveDynamicTokens";
import { ThemeToggle } from "./ThemeToggle";

// getCurrentLang() reads a cookie, so it only knows the real language once
// on the client — useSyncExternalStore (not a useState+useEffect pair) is
// the hydration-safe way to read it: getServerSnapshot ("en") is what SSR
// and the client's first render both use (so hydration never mismatches),
// then it swaps to the real client snapshot right after. The subscribe
// function is a no-op (the cookie doesn't push change events; selecting a
// language calls setLang further below, which reloads the page instead).
const noSubscribe = () => () => {};
const getServerLang = (): SiteLang => "en";

export function SiteHeader({ solid = false, context = { kind: "other" } }: { solid?: boolean; context?: PageContext } = {}) {
  const detectedLang = useSyncExternalStore(noSubscribe, getCurrentLang, getServerLang);
  const [langOverride, setLangOverride] = useState<SiteLang | null>(null);
  const lang = langOverride ?? detectedLang;
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [links, setLinks] = useState<MenuLink[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  // Starts `null` (render the hard-coded header immediately) rather than a
  // blocking "loading" state — most pages have no Theme Builder override, so
  // gating the entire header on that fetch resolving meant every page load
  // showed a blank strip where the nav should be. The rare page that *does*
  // have a custom header override gets a brief default→custom swap once the
  // fetch resolves instead; that's a far smaller cost than blocking every
  // page. `context` always has a value now (defaults to `{kind:"other"}`
  // below when the caller doesn't pass one) — Theme Builder resolution runs
  // on every route, not just ones that bothered to pass a specific context,
  // so an "Entire Site" Include still applies to e.g. /booking/* instead of
  // silently skipping resolution entirely.
  const [templateLayout, setTemplateLayout] = useState<LayoutDocument | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const mobilePanelRef = useRef<HTMLDivElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Any data-driven nav item with children (Admin → Menus) gets its own
  // hover dropdown, styled like the hard-coded "Service" one above but
  // built from real menu data — see MenuDropdownPreview. Plain CSS
  // opacity/transition instead of GSAP (unlike "Service") since there can
  // be any number of these, not one fixed ref to animate.
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const openItemTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [openMobileItemIds, setOpenMobileItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getMenuLinks().then(setLinks).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  // Restores a same-session cached result *before* the browser paints, so a
  // page whose custom header was already seen once this session never
  // flashes the hard-coded header again while the fetch below re-confirms
  // it — see readCachedTemplateLayout's own comment for why this can't just
  // be the useState initializer (would mismatch the server-rendered HTML).
  useLayoutEffect(() => {
    const cached = readCachedTemplateLayout("header", context);
    if (cached) setTemplateLayout(cached);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(context)]);

  // Theme Builder — a custom Header template (Settings → Theme Builder)
  // takes over entirely when one matches this page; falls back to the
  // hard-coded header below when it doesn't (or the request fails).
  useEffect(() => {
    let cancelled = false;
    resolveActiveSiteTemplate("header", context).then((template) => {
      const layout = template?.layout ?? null;
      if (!cancelled) setTemplateLayout(layout);
      writeCachedTemplateLayout("header", context, layout);
    });
    return () => {
      cancelled = true;
    };
    // `context` is a fresh object literal from the caller on every render —
    // depend on its serialized value instead of identity so this doesn't
    // refetch on every unrelated SiteHeader re-render (mobile menu, etc).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(context)]);

  function selectLang(next: SiteLang) {
    if (next === lang) return;
    setLangOverride(next);
    applyLang(next);
  }

  // "Service" has a special hover dropdown and is never a data-driven link;
  // it's always rendered right after the first (Home) nav item.
  const [firstLink, ...restLinks] = links;

  useEffect(() => {
    const el = dropdownRef.current;
    if (!el) return;

    gsap.killTweensOf(el);
    if (servicesOpen) {
      gsap.set(el, { pointerEvents: "auto" });
      gsap.fromTo(el, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    } else {
      gsap.to(el, { opacity: 0, y: -10, duration: 0.18, ease: "power2.in", onComplete: () => gsap.set(el, { pointerEvents: "none" }) });
    }
  }, [servicesOpen]);

  useEffect(() => {
    const el = mobilePanelRef.current;
    if (!el) return;

    gsap.killTweensOf(el);
    if (mobileOpen) {
      gsap.set(el, { display: "block" });
      gsap.fromTo(el, { opacity: 0, y: -12 }, { opacity: 1, y: 0, duration: 0.25, ease: "power2.out" });
    } else {
      gsap.to(el, {
        opacity: 0,
        y: -12,
        duration: 0.2,
        ease: "power2.in",
        onComplete: () => gsap.set(el, { display: "none" }),
      });
    }
  }, [mobileOpen]);

  function openDropdown() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setServicesOpen(true);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setServicesOpen(false), 150);
  }

  function openItemDropdown(id: string) {
    if (openItemTimer.current) clearTimeout(openItemTimer.current);
    setOpenItemId(id);
  }

  function scheduleCloseItem() {
    openItemTimer.current = setTimeout(() => setOpenItemId(null), 150);
  }

  function toggleMobileItem(id: string) {
    setOpenMobileItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (openItemTimer.current) clearTimeout(openItemTimer.current);
    };
  }, []);

  if (templateLayout) {
    return <LayoutRenderer blocks={templateLayout} siteContext={siteTagDataFromSettings(settings)} showAddSectionBanner={false} />;
  }

  return (
    <header
      className={
        solid
          ? "sticky inset-x-0 top-0 z-20 bg-[#141414] backdrop-blur-md border-b border-white/10"
          : "absolute inset-x-0 top-0 z-20 bg-black/60 backdrop-blur-md"
      }
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
        <Logo
          logoImage={settings?.logoImage ? resolveImageUrl(settings.logoImage) : null}
          siteName={settings?.siteName}
          taglineText={settings?.tagline}
        />

        <nav className="hidden items-center gap-8 text-sm font-medium text-white/85 md:flex">
          {firstLink && (
            <a
              href={firstLink.href}
              target={firstLink.openInNewTab ? "_blank" : undefined}
              rel={firstLink.openInNewTab ? "noopener noreferrer" : undefined}
              className="transition-colors hover:text-white"
            >
              {firstLink.label}
            </a>
          )}

          <div className="relative" onMouseEnter={openDropdown} onMouseLeave={scheduleClose}>
            <button type="button" className="flex items-center gap-1 transition-colors hover:text-white">
              Service
              <IconChevron className={`h-3.5 w-3.5 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
            </button>

            <div
              ref={dropdownRef}
              className="absolute left-1/2 top-full -translate-x-1/2 pt-4 opacity-0"
              style={{ pointerEvents: "none" }}
            >
              <MiniServicePreview className="shadow-2xl" />
            </div>
          </div>

          {restLinks.map((item) =>
            item.children && item.children.length > 0 ? (
              <div key={item.id} className="relative" onMouseEnter={() => openItemDropdown(item.id)} onMouseLeave={scheduleCloseItem}>
                <a
                  href={item.href}
                  target={item.openInNewTab ? "_blank" : undefined}
                  rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-1 transition-colors hover:text-white"
                >
                  {item.label}
                  <IconChevron className={`h-3.5 w-3.5 transition-transform ${openItemId === item.id ? "rotate-180" : ""}`} />
                </a>
                <div
                  className="absolute left-1/2 top-full -translate-x-1/2 pt-4 transition-opacity duration-200"
                  style={{ opacity: openItemId === item.id ? 1 : 0, pointerEvents: openItemId === item.id ? "auto" : "none" }}
                >
                  <MenuDropdownPreview className="shadow-2xl" items={item.children} />
                </div>
              </div>
            ) : (
              <a
                key={item.id}
                href={item.href}
                target={item.openInNewTab ? "_blank" : undefined}
                rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                className="transition-colors hover:text-white"
              >
                {item.label}
              </a>
            )
          )}
        </nav>

        <div className="flex items-center gap-3 md:gap-5">
          <div className="hidden items-center gap-2 rounded-full bg-[#2a2a2a] p-1 text-sm text-white/70 md:flex">
            <button onClick={() => selectLang("de")} className={`rounded-full px-3 py-1 ${lang === "de" ? "bg-white/10 text-white" : "hover:text-white"}`}>
              De
            </button>
            <button onClick={() => selectLang("en")} className={`rounded-full px-3 py-1 ${lang === "en" ? "bg-white/10 text-white" : "hover:text-white"}`}>
              En
            </button>
          </div>

          <ThemeToggle className="hidden md:flex" />
          <Link
            href="/contact"
            className="hidden rounded-full border border-white/30 px-5 py-2 text-sm font-medium text-white transition-colors hover:border-gold hover:text-gold sm:inline-block"
          >
            Book now
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              {mobileOpen ? (
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={mobilePanelRef}
        className="absolute inset-x-4 top-full mt-2 hidden rounded-2xl bg-black/80 p-5 opacity-0 backdrop-blur-md md:hidden"
      >
        <nav className="flex flex-col gap-1 text-sm font-medium text-white/85">
          {firstLink && (
            <a href={firstLink.href} className="rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 hover:text-white">
              {firstLink.label}
            </a>
          )}
          <a href="#services" className="rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 hover:text-white">
            Service
          </a>
          {restLinks.map((item) =>
            item.children && item.children.length > 0 ? (
              <div key={item.id}>
                <div className="flex items-center">
                  <a href={item.href} className="flex-1 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 hover:text-white">
                    {item.label}
                  </a>
                  <button
                    type="button"
                    aria-label={openMobileItemIds.has(item.id) ? "Collapse submenu" : "Expand submenu"}
                    onClick={() => toggleMobileItem(item.id)}
                    className="px-3 py-2.5 text-white/70"
                  >
                    <IconChevron className={`h-3.5 w-3.5 transition-transform ${openMobileItemIds.has(item.id) ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {openMobileItemIds.has(item.id) && (
                  <div className="ml-3 flex flex-col gap-1 border-l border-white/10 pl-3">
                    {item.children.map((child) => (
                      <a key={child.id} href={child.href} className="rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white">
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <a
                key={item.id}
                href={item.href}
                className="rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 hover:text-white"
              >
                {item.label}
              </a>
            )
          )}
          <Link
            href="/contact"
            className="mt-2 rounded-lg bg-gold px-3 py-2.5 text-center font-semibold text-white sm:hidden"
          >
            Book now
          </Link>
        </nav>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <button onClick={() => selectLang("de")} className={lang === "de" ? "text-white" : "hover:text-white"}>
              De
            </button>
            <span className="text-white/30">|</span>
            <button onClick={() => selectLang("en")} className={lang === "en" ? "text-white" : "hover:text-white"}>
              En
            </button>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
