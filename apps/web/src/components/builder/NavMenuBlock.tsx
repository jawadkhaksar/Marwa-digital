"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { api, type MenuItem } from "@/lib/api";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";
import { useMounted } from "@/lib/useMounted";

const BREAKPOINT_PX: Record<"mobile" | "tablet", number> = { mobile: 768, tablet: 1025 };

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function HamburgerIcon({ size }: { size: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon({ size }: { size: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4 }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

/**
 * The Theme Builder's "Nav Menu" widget — renders a named menu from
 * Admin → Menus (one level of nesting = real dropdown submenus). `menuId`
 * picks which menu; left empty, it falls back to the site's primary menu.
 */
export function NavMenuBlock({
  menuId,
  enableSchemaSupport,
  layout,
  alignment,
  showSubmenuIcon,
  submenuAnimation,
  responsiveBreakpoint,
  mobileMenuStyle,
  mobileAlignment,
  mobileFullWidth,
  menuIcon,
  closeIcon,
  horizontalPadding,
  verticalPadding,
  itemSpacing,
  rowSpacing,
  linkHoverEffect,
  menuFontFamily,
  menuFontSize,
  menuFontWeight,
  menuTextTransform,
  menuFontStyle,
  menuTextDecoration,
  menuLineHeight,
  menuLetterSpacing,
  menuWordSpacing,
  menuTextColor,
  menuHoverTextColor,
  menuActiveTextColor,
  menuBackground,
  menuHoverBackground,
  menuActiveBackground,
  dropdownTextColor,
  dropdownHoverTextColor,
  dropdownBackground,
  dropdownHoverBackground,
  dropdownFontFamily,
  dropdownFontSize,
  dropdownFontWeight,
  dropdownTextTransform,
  dropdownFontStyle,
  dropdownTextDecoration,
  dropdownLineHeight,
  dropdownLetterSpacing,
  dropdownWordSpacing,
  dropdownBorderStyle,
  dropdownBorderWidth,
  dropdownBorderWidthTop,
  dropdownBorderWidthRight,
  dropdownBorderWidthBottom,
  dropdownBorderWidthLeft,
  dropdownBorderColor,
  dropdownBorderRadiusTop,
  dropdownBorderRadiusRight,
  dropdownBorderRadiusBottom,
  dropdownBorderRadiusLeft,
  dropdownBoxShadow,
  dropdownWidth,
  dropdownPaddingH,
  dropdownPaddingV,
  dropdownTopDistance,
  dropdownItemGap,
  triggerColor,
  triggerHoverColor,
  triggerBackground,
  triggerHoverBackground,
  triggerIconSize,
  triggerBorderWidth,
  triggerBorderWidthTop,
  triggerBorderWidthRight,
  triggerBorderWidthBottom,
  triggerBorderWidthLeft,
  triggerBorderRadius,
  flyoutBackground,
  mobileMenuBackground,
}: {
  menuId?: string;
  enableSchemaSupport?: boolean;
  layout?: "horizontal" | "vertical";
  alignment?: "start" | "center" | "end" | "space-between";
  showSubmenuIcon?: boolean;
  submenuAnimation?: "none" | "fade" | "slide";
  responsiveBreakpoint?: "mobile" | "tablet" | "none";
  mobileMenuStyle?: "dropdown" | "flyout";
  mobileAlignment?: "start" | "center" | "end" | "space-between";
  mobileFullWidth?: boolean;
  menuIcon?: string;
  closeIcon?: string;
  horizontalPadding?: string;
  verticalPadding?: string;
  itemSpacing?: string;
  rowSpacing?: string;
  linkHoverEffect?: "none" | "underline" | "color" | "background";
  menuFontFamily?: string;
  menuFontSize?: string;
  menuFontWeight?: string;
  menuTextTransform?: CSSProperties["textTransform"];
  menuFontStyle?: CSSProperties["fontStyle"];
  menuTextDecoration?: string;
  menuLineHeight?: string;
  menuLetterSpacing?: string;
  menuWordSpacing?: string;
  menuTextColor?: string;
  menuHoverTextColor?: string;
  menuActiveTextColor?: string;
  menuBackground?: string;
  menuHoverBackground?: string;
  menuActiveBackground?: string;
  dropdownTextColor?: string;
  dropdownHoverTextColor?: string;
  dropdownBackground?: string;
  dropdownHoverBackground?: string;
  dropdownFontFamily?: string;
  dropdownFontSize?: string;
  dropdownFontWeight?: string;
  dropdownTextTransform?: CSSProperties["textTransform"];
  dropdownFontStyle?: CSSProperties["fontStyle"];
  dropdownTextDecoration?: string;
  dropdownLineHeight?: string;
  dropdownLetterSpacing?: string;
  dropdownWordSpacing?: string;
  dropdownBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  dropdownBorderWidth?: string;
  dropdownBorderWidthTop?: string;
  dropdownBorderWidthRight?: string;
  dropdownBorderWidthBottom?: string;
  dropdownBorderWidthLeft?: string;
  dropdownBorderColor?: string;
  dropdownBorderRadiusTop?: string;
  dropdownBorderRadiusRight?: string;
  dropdownBorderRadiusBottom?: string;
  dropdownBorderRadiusLeft?: string;
  dropdownBoxShadow?: string;
  dropdownWidth?: string;
  dropdownPaddingH?: string;
  dropdownPaddingV?: string;
  dropdownTopDistance?: string;
  dropdownItemGap?: string;
  triggerColor?: string;
  triggerHoverColor?: string;
  triggerBackground?: string;
  triggerHoverBackground?: string;
  triggerIconSize?: string;
  triggerBorderWidth?: string;
  triggerBorderWidthTop?: string;
  triggerBorderWidthRight?: string;
  triggerBorderWidthBottom?: string;
  triggerBorderWidthLeft?: string;
  triggerBorderRadius?: string;
  flyoutBackground?: string;
  mobileMenuBackground?: string;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  // Where the "dropdown" mobile panel's fixed overlay should start — measured
  // from the actual trigger button rather than assumed, since the button can
  // sit anywhere in the header (nested inside an arbitrarily-narrow/off-center
  // flex column, e.g. a right-aligned actions row), so a fixed pixel offset
  // or a CSS-only trick like `left:50%;margin-left:-50vw` (which only cancels
  // out correctly for a horizontally *centered* ancestor) can't be trusted.
  const [mobilePanelTop, setMobilePanelTop] = useState(0);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const dropdownPanelRef = useRef<HTMLDivElement>(null);
  // `document` doesn't exist during SSR — the portal below can only mount
  // once hydrated on the client.
  const mounted = useMounted();
  const [openMobileParents, setOpenMobileParents] = useState<Set<string>>(new Set());
  // Which child (by id) is currently shown in a parent's swap-on-hover
  // image panel — only meaningful for parents whose children have a Preview
  // Image set (Admin → Menus). Keyed by parent id since more than one
  // dropdown's worth of state can exist at once.
  const [hoveredChildByParent, setHoveredChildByParent] = useState<Record<string, string>>({});
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const resolvedId = menuId || (await api.getSettings().catch(() => null))?.primaryMenuId;
      if (!resolvedId) {
        if (!cancelled) setItems([]);
        return;
      }
      const menu = await api.getMenu(resolvedId).catch(() => null);
      if (!cancelled) setItems(menu?.items ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  // Whether the viewport is currently under the breakpoint can only be
  // known client-side (no viewport info during SSR) — the sync setState
  // calls below are the correct, unavoidable way to seed and then track
  // that value, not a pattern that should be moved into a callback.
  useEffect(() => {
    if (responsiveBreakpoint === "none" || !responsiveBreakpoint) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(false);
      return;
    }
    const px = BREAKPOINT_PX[responsiveBreakpoint];
    const mq = window.matchMedia(`(max-width: ${px - 1}px)`);
    setIsCollapsed(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsCollapsed(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [responsiveBreakpoint]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isCollapsed) setOpen(false);
  }, [isCollapsed]);

  useEffect(() => {
    if (!open || mobileMenuStyle !== "dropdown" || !mobileFullWidth) return;
    function measure() {
      if (triggerWrapRef.current) setMobilePanelTop(triggerWrapRef.current.getBoundingClientRect().bottom);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open, mobileMenuStyle, mobileFullWidth]);

  // Close the "dropdown" style panel on an outside click/tap — never wired
  // up before, so it only ever closed via the trigger button itself or
  // picking a link. Skipped for "flyout", which already has its own
  // dedicated close button and is meant to be modal (no outside click to
  // miss, it covers the whole screen).
  useEffect(() => {
    if (!open || mobileMenuStyle !== "dropdown") return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerWrapRef.current?.contains(target)) return;
      if (dropdownPanelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, mobileMenuStyle]);

  const iconSize = triggerIconSize || "24px";
  const uid = `navmenu-h${hashString(`${menuHoverTextColor ?? ""}${menuHoverBackground ?? ""}${dropdownHoverTextColor ?? ""}${dropdownHoverBackground ?? ""}${triggerHoverColor ?? ""}${triggerHoverBackground ?? ""}${linkHoverEffect ?? ""}`)}`;

  const topLevel = items.filter((i) => !i.parentId).sort((a, b) => a.order - b.order);
  function childrenOf(id: string) {
    return items.filter((i) => i.parentId === id).sort((a, b) => a.order - b.order);
  }

  // Reads through var(--exr-{key}, {desktop value}) — see the identical note
  // on Heading/Services/ImageBox in blockComponents.tsx — so a per-breakpoint
  // override set in the PropertyPanel's Style tab (e.g. a smaller Menu Item
  // font size on Mobile) actually reaches these elements. None of NavMenu's
  // ~65 style props share a name with the wrapper's own generic Advanced-tab
  // fields (they're all `menu*`/`dropdown*`/`trigger*`-prefixed), so unlike
  // CTAButton/ServiceCard there's no BOX_MODEL_KEYS collision to work around
  // here — every field below is safe to bridge.
  const itemStyle = (isActive: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    padding: `var(--exr-verticalPadding, ${verticalPadding || "8px"}) var(--exr-horizontalPadding, ${horizontalPadding || "12px"})`,
    fontFamily: menuFontFamily && menuFontFamily !== "inherit" ? menuFontFamily : undefined,
    fontSize: `var(--exr-menuFontSize, ${menuFontSize || "inherit"})`,
    fontWeight: `var(--exr-menuFontWeight, ${menuFontWeight || "inherit"})`,
    textTransform: `var(--exr-menuTextTransform, ${menuTextTransform && menuTextTransform !== "none" ? menuTextTransform : "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-menuFontStyle, ${menuFontStyle && menuFontStyle !== "normal" ? menuFontStyle : "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-menuTextDecoration, ${menuTextDecoration && menuTextDecoration !== "none" ? menuTextDecoration : "none"})`,
    lineHeight: `var(--exr-menuLineHeight, ${menuLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-menuLetterSpacing, ${menuLetterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-menuWordSpacing, ${menuWordSpacing || "inherit"})`,
    color: isActive ? `var(--exr-menuActiveTextColor, ${menuActiveTextColor || menuTextColor || "inherit"})` : `var(--exr-menuTextColor, ${menuTextColor || "inherit"})`,
    background: isActive ? `var(--exr-menuActiveBackground, ${menuActiveBackground || menuBackground || "transparent"})` : `var(--exr-menuBackground, ${menuBackground || "transparent"})`,
  });

  // `isActivePreview` is only meaningful for a dropdown with images — the
  // item currently shown in the swap-on-hover image panel gets a persistent
  // highlight (not just a transient CSS :hover, which disappears the moment
  // the mouse moves onto the image itself, leaving the list with no
  // indication of which item the image belongs to). Falls back to the
  // site's own brand gold when the admin hasn't set Dropdown Hover
  // colors, matching the look of the site's original "Service" dropdown.
  // `withCardBackground` gives every row (not just the active one) its own
  // subtle default card background — also matching that reference, where
  // every item is a distinct rounded card, not just plain list text — but
  // only for image dropdowns; a plain (no-image) dropdown still relies on
  // CSS :hover only, since a permanent per-row background there would fight
  // with a fully custom Dropdown Background the admin has already set.
  const dropdownItemStyle = (isActivePreview = false, withCardBackground = false): CSSProperties => ({
    display: "block",
    whiteSpace: "nowrap",
    borderRadius: "6px",
    padding: `var(--exr-dropdownPaddingV, ${dropdownPaddingV || "8px"}) var(--exr-dropdownPaddingH, ${dropdownPaddingH || "14px"})`,
    fontFamily: dropdownFontFamily && dropdownFontFamily !== "inherit" ? dropdownFontFamily : undefined,
    fontSize: `var(--exr-dropdownFontSize, ${dropdownFontSize || "inherit"})`,
    fontWeight: `var(--exr-dropdownFontWeight, ${dropdownFontWeight || "inherit"})`,
    textTransform: `var(--exr-dropdownTextTransform, ${dropdownTextTransform && dropdownTextTransform !== "none" ? dropdownTextTransform : "none"})` as CSSProperties["textTransform"],
    fontStyle: `var(--exr-dropdownFontStyle, ${dropdownFontStyle && dropdownFontStyle !== "normal" ? dropdownFontStyle : "normal"})` as CSSProperties["fontStyle"],
    textDecoration: `var(--exr-dropdownTextDecoration, ${dropdownTextDecoration && dropdownTextDecoration !== "none" ? dropdownTextDecoration : "none"})`,
    lineHeight: `var(--exr-dropdownLineHeight, ${dropdownLineHeight || "inherit"})`,
    letterSpacing: `var(--exr-dropdownLetterSpacing, ${dropdownLetterSpacing || "inherit"})`,
    wordSpacing: `var(--exr-dropdownWordSpacing, ${dropdownWordSpacing || "inherit"})`,
    color: isActivePreview
      ? `var(--exr-dropdownHoverTextColor, ${dropdownHoverTextColor || "#2563ff"})`
      : `var(--exr-dropdownTextColor, ${dropdownTextColor || "inherit"})`,
    background: isActivePreview
      ? `var(--exr-dropdownHoverBackground, ${dropdownHoverBackground || "rgba(37,99,255,0.12)"})`
      : `var(--exr-dropdownBackground, ${dropdownBackground || (withCardBackground ? "rgba(255,255,255,0.06)" : "transparent")})`,
  });

  const dropdownPanelStyle: CSSProperties = {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: `var(--exr-dropdownTopDistance, ${dropdownTopDistance || "0px"})`,
    minWidth: `var(--exr-dropdownWidth, ${dropdownWidth || "180px"})`,
    background: `var(--exr-dropdownBackground, ${dropdownBackground || "#18181b"})`,
    borderStyle: dropdownBorderStyle && dropdownBorderStyle !== "none" ? dropdownBorderStyle : undefined,
    borderTopWidth: dropdownBorderStyle && dropdownBorderStyle !== "none" ? `var(--exr-dropdownBorderWidthTop, ${dropdownBorderWidthTop || dropdownBorderWidth || "1px"})` : undefined,
    borderRightWidth: dropdownBorderStyle && dropdownBorderStyle !== "none" ? `var(--exr-dropdownBorderWidthRight, ${dropdownBorderWidthRight || dropdownBorderWidth || "1px"})` : undefined,
    borderBottomWidth: dropdownBorderStyle && dropdownBorderStyle !== "none" ? `var(--exr-dropdownBorderWidthBottom, ${dropdownBorderWidthBottom || dropdownBorderWidth || "1px"})` : undefined,
    borderLeftWidth: dropdownBorderStyle && dropdownBorderStyle !== "none" ? `var(--exr-dropdownBorderWidthLeft, ${dropdownBorderWidthLeft || dropdownBorderWidth || "1px"})` : undefined,
    borderColor: dropdownBorderStyle && dropdownBorderStyle !== "none" ? dropdownBorderColor || undefined : undefined,
    borderRadius: `var(--exr-dropdownBorderRadiusTop, ${dropdownBorderRadiusTop || "6px"}) var(--exr-dropdownBorderRadiusRight, ${dropdownBorderRadiusRight || "6px"}) var(--exr-dropdownBorderRadiusBottom, ${dropdownBorderRadiusBottom || "6px"}) var(--exr-dropdownBorderRadiusLeft, ${dropdownBorderRadiusLeft || "6px"})`,
    boxShadow: `var(--exr-dropdownBoxShadow, ${dropdownBoxShadow || "0 8px 24px rgba(0,0,0,0.35)"})`,
    backdropFilter: "blur(8px)",
    zIndex: 40,
  };

  const justifyContent =
    alignment === "center" ? "center" : alignment === "end" ? "flex-end" : alignment === "space-between" ? "space-between" : "flex-start";
  const mobileJustify =
    mobileAlignment === "center" ? "center" : mobileAlignment === "start" ? "flex-start" : mobileAlignment === "space-between" ? "space-between" : "flex-end";

  const transitionCss =
    submenuAnimation === "none" ? "" : submenuAnimation === "slide" ? "transition: opacity 0.2s ease, transform 0.2s ease; transform: translateY(-6px);" : "transition: opacity 0.2s ease;";
  const transitionShownCss = submenuAnimation === "slide" ? "transform: translateY(0);" : "";

  function toggleMobileParent(id: string) {
    setOpenMobileParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderDesktopItem(item: MenuItem) {
    const isActive = pathname === item.href;
    const kids = childrenOf(item.id);
    const kidsHaveImages = kids.some((k) => k.previewImage);
    const activeChildId = hoveredChildByParent[item.id] ?? kids.find((k) => k.previewImage)?.id ?? kids[0]?.id;
    const activeChild = kids.find((k) => k.id === activeChildId);
    const itemClass = `${uid}-item-${item.id}`;
    const dropdownClass = `${uid}-dd-${item.id}`;
    return (
      <div key={item.id} className={itemClass} style={{ position: "relative" }}>
        <a
          href={item.href}
          target={item.openInNewTab ? "_blank" : undefined}
          rel={item.openInNewTab ? "noopener noreferrer" : undefined}
          className={`${item.cssClasses ?? ""} ${uid}`}
          style={itemStyle(isActive)}
          itemProp={enableSchemaSupport ? "url" : undefined}
        >
          <span itemProp={enableSchemaSupport ? "name" : undefined}>{item.label}</span>
          {showSubmenuIcon && kids.length > 0 && <ChevronIcon />}
        </a>
        {kids.length > 0 && (
          <div
            className={dropdownClass}
            style={{
              ...dropdownPanelStyle,
              width: kidsHaveImages ? "auto" : undefined,
              display: "flex",
              gap: kidsHaveImages ? "8px" : undefined,
              padding: kidsHaveImages ? "8px" : undefined,
              opacity: 0,
              pointerEvents: "none",
              ...(submenuAnimation === "slide" ? { transform: "translateY(-6px)" } : {}),
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: `var(--exr-dropdownItemGap, ${dropdownItemGap || "0px"})`, minWidth: kidsHaveImages ? "160px" : undefined }}>
              {kids.map((child) => (
                <a
                  key={child.id}
                  href={child.href}
                  target={child.openInNewTab ? "_blank" : undefined}
                  rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                  className={`${child.cssClasses ?? ""} ${kidsHaveImages ? "" : uid + "-dditem"}`}
                  style={dropdownItemStyle(kidsHaveImages && child.id === activeChildId, kidsHaveImages)}
                  onMouseEnter={() => kidsHaveImages && setHoveredChildByParent((prev) => ({ ...prev, [item.id]: child.id }))}
                >
                  {child.label}
                </a>
              ))}
            </div>
            {kidsHaveImages && activeChild?.previewImage && (
              <div style={{ position: "relative", width: "220px", minHeight: "160px", alignSelf: "stretch", flexShrink: 0, overflow: "hidden", borderRadius: "4px" }}>
                {/* Admin-uploaded, cross-origin — plain <img>, not next/image, same reasoning as SiteLogo/ImageBox/MenuDropdownPreview. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImageUrl(activeChild.previewImage)} alt={activeChild.label} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderMobileItem(item: MenuItem) {
    const isActive = pathname === item.href;
    const kids = childrenOf(item.id);
    const isOpen = openMobileParents.has(item.id);
    return (
      <div key={item.id}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <a
            href={item.href}
            target={item.openInNewTab ? "_blank" : undefined}
            rel={item.openInNewTab ? "noopener noreferrer" : undefined}
            className={`${item.cssClasses ?? ""} ${uid}`}
            style={{ ...itemStyle(isActive), flex: 1 }}
            itemProp={enableSchemaSupport ? "url" : undefined}
            onClick={() => setOpen(false)}
          >
            <span itemProp={enableSchemaSupport ? "name" : undefined}>{item.label}</span>
          </a>
          {kids.length > 0 && (
            <button
              type="button"
              aria-label={isOpen ? "Collapse submenu" : "Expand submenu"}
              onClick={() => toggleMobileParent(item.id)}
              style={{ padding: "8px 12px", color: menuTextColor || undefined, background: "transparent", border: "none", cursor: "pointer" }}
            >
              <span style={{ display: "inline-block", transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s ease" }}>
                <ChevronIcon />
              </span>
            </button>
          )}
        </div>
        {kids.length > 0 && isOpen && (
          <div style={{ display: "flex", flexDirection: "column", paddingLeft: "16px" }}>
            {kids.map((child) => (
              <a
                key={child.id}
                href={child.href}
                target={child.openInNewTab ? "_blank" : undefined}
                rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                className={child.cssClasses ?? ""}
                style={dropdownItemStyle()}
                onClick={() => setOpen(false)}
              >
                {child.label}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  const triggerButtonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: `calc(${iconSize} + 16px)`,
    height: `calc(${iconSize} + 16px)`,
    color: `var(--exr-triggerColor, ${triggerColor || "inherit"})`,
    background: `var(--exr-triggerBackground, ${triggerBackground || "transparent"})`,
    borderTopWidth: `var(--exr-triggerBorderWidthTop, ${triggerBorderWidthTop || triggerBorderWidth || "0px"})`,
    borderRightWidth: `var(--exr-triggerBorderWidthRight, ${triggerBorderWidthRight || triggerBorderWidth || "0px"})`,
    borderBottomWidth: `var(--exr-triggerBorderWidthBottom, ${triggerBorderWidthBottom || triggerBorderWidth || "0px"})`,
    borderLeftWidth: `var(--exr-triggerBorderWidthLeft, ${triggerBorderWidthLeft || triggerBorderWidth || "0px"})`,
    borderStyle: triggerBorderWidth || triggerBorderWidthTop || triggerBorderWidthRight || triggerBorderWidthBottom || triggerBorderWidthLeft ? "solid" : undefined,
    borderColor: triggerColor || undefined,
    borderRadius: `var(--exr-triggerBorderRadius, ${triggerBorderRadius || "0px"})`,
    cursor: "pointer",
  };

  const hoverCss = `
    .${uid}:hover{${menuHoverTextColor ? `color:${menuHoverTextColor} !important;` : ""}${menuHoverBackground ? `background:${menuHoverBackground} !important;` : ""}${linkHoverEffect === "underline" ? "text-decoration:underline !important;" : ""}}
    .${uid}-dditem:hover{${dropdownHoverTextColor ? `color:${dropdownHoverTextColor} !important;` : ""}${dropdownHoverBackground ? `background:${dropdownHoverBackground} !important;` : ""}}
    ${topLevel
      .map(
        (item) =>
          `.${uid}-item-${item.id}:hover .${uid}-dd-${item.id}{opacity:1 !important;pointer-events:auto !important;${transitionShownCss}}
           .${uid}-item-${item.id} .${uid}-dd-${item.id}{${transitionCss}}`
      )
      .join("\n")}
    button[aria-label]:hover{${triggerHoverColor ? `color:${triggerHoverColor} !important;` : ""}${triggerHoverBackground ? `background:${triggerHoverBackground} !important;` : ""}}
  `;

  const NavTag = "nav" as const;

  if (!isCollapsed) {
    return (
      <>
        <GoogleFontLink family={menuFontFamily} />
        <GoogleFontLink family={dropdownFontFamily} />
        <style dangerouslySetInnerHTML={{ __html: hoverCss }} />
        <NavTag
          itemScope={enableSchemaSupport}
          itemType={enableSchemaSupport ? "https://schema.org/SiteNavigationElement" : undefined}
          style={{
            display: "flex",
            flexDirection: layout === "vertical" ? "column" : "row",
            justifyContent: `var(--exr-alignment, ${justifyContent})`,
            alignItems: layout === "vertical" ? "flex-start" : "center",
            gap: `var(--exr-itemSpacing, ${itemSpacing || "0px"})`,
            flexWrap: "wrap",
            rowGap: `var(--exr-rowSpacing, ${rowSpacing || itemSpacing || "0px"})`,
          }}
        >
          {topLevel.map(renderDesktopItem)}
        </NavTag>
      </>
    );
  }

  return (
    <>
      <GoogleFontLink family={menuFontFamily} />
      <GoogleFontLink family={dropdownFontFamily} />
      <style dangerouslySetInnerHTML={{ __html: hoverCss }} />
      <div ref={triggerWrapRef} style={{ display: "flex", justifyContent: mobileJustify }}>
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)} style={triggerButtonStyle}>
          {open ? (
            closeIcon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveImageUrl(closeIcon)} alt="" style={{ width: iconSize, height: iconSize }} />
            ) : (
              <CloseIcon size={iconSize} />
            )
          ) : menuIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={resolveImageUrl(menuIcon)} alt="" style={{ width: iconSize, height: iconSize }} />
          ) : (
            <HamburgerIcon size={iconSize} />
          )}
        </button>
      </div>

      {mobileMenuStyle === "flyout" ? (
        portalIfMounted(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: `var(--exr-flyoutBackground, ${flyoutBackground || "rgba(10,10,10,0.97)"})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: `var(--exr-rowSpacing, ${rowSpacing || "8px"})`,
              opacity: open ? 1 : 0,
              pointerEvents: open ? "auto" : "none",
              transform: open ? "translateX(0)" : "translateX(100%)",
              transition: "opacity 0.25s ease, transform 0.25s ease",
              overflowY: "auto",
            }}
          >
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} style={{ ...triggerButtonStyle, position: "absolute", top: 16, right: 16 }}>
              {closeIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveImageUrl(closeIcon)} alt="" style={{ width: iconSize, height: iconSize }} />
              ) : (
                <CloseIcon size={iconSize} />
              )}
            </button>
            <div itemScope={enableSchemaSupport} itemType={enableSchemaSupport ? "https://schema.org/SiteNavigationElement" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: `var(--exr-rowSpacing, ${rowSpacing || "8px"})` }}>
              {topLevel.map(renderMobileItem)}
            </div>
          </div>,
          mounted
        )
      ) : mobileFullWidth ? (
        portalIfMounted(
          <div
            ref={dropdownPanelRef}
            itemScope={enableSchemaSupport}
            itemType={enableSchemaSupport ? "https://schema.org/SiteNavigationElement" : undefined}
            style={{
              display: open ? "flex" : "none",
              flexDirection: "column",
              gap: `var(--exr-rowSpacing, ${rowSpacing || itemSpacing || "0px"})`,
              // Anchored at the trigger's own measured bottom edge (see the
              // `mobilePanelTop` effect above) and portaled straight onto
              // <body> (see `portalIfMounted`) — `position:fixed` alone
              // isn't enough here: if ANY ancestor Section has its own
              // Background Blur (a `backdrop-filter`, admin-configurable),
              // that ancestor becomes the containing block for `fixed`
              // descendants per the CSS spec, silently repositioning this
              // panel relative to that Section instead of the viewport. The
              // portal sidesteps the whole ancestor chain, so it can't be
              // broken by any Style tab setting elsewhere in the header.
              position: "fixed",
              top: mobilePanelTop,
              left: 0,
              width: "100%",
              maxHeight: `calc(100vh - ${mobilePanelTop}px)`,
              overflowY: "auto",
              zIndex: 9999,
              background: `var(--exr-mobileMenuBackground, ${mobileMenuBackground || "rgba(10,10,10,0.97)"})`,
              padding: "12px 0",
            }}
          >
            {topLevel.map(renderMobileItem)}
          </div>,
          mounted
        )
      ) : (
        <div
          ref={dropdownPanelRef}
          itemScope={enableSchemaSupport}
          itemType={enableSchemaSupport ? "https://schema.org/SiteNavigationElement" : undefined}
          style={{
            display: open ? "flex" : "none",
            flexDirection: "column",
            gap: `var(--exr-rowSpacing, ${rowSpacing || itemSpacing || "0px"})`,
            marginTop: "8px",
          }}
        >
          {topLevel.map(renderMobileItem)}
        </div>
      )}
    </>
  );
}

function portalIfMounted(node: ReactNode, mounted: boolean) {
  return mounted ? createPortal(node, document.body) : null;
}
