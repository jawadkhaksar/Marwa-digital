// Authoring toolkit for generating Marwa Digital's marketing pages as real
// builder documents (Page.layout / LayoutDocument), so every page created
// here opens and edits normally in the visual builder — no bespoke
// hard-coded React templates, and nothing that only a developer can change.
//
// Design tokens below mirror apps/web's globals.css so generated sections
// sit flush with the site's own header/footer chrome instead of looking
// like a separate microsite.

import type { LayoutDocument, LayoutNode } from "@marwa/builder";

export const T = {
  bg: "#080b1f",
  bgAlt: "#0c1029",
  surface: "rgba(255,255,255,0.03)",
  surfaceBorder: "rgba(255,255,255,0.10)",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.68)",
  accent: "#2563ff",
  accentStrong: "#1d4fd8",
  violet: "#7c3aed",
  gradient: "linear-gradient(90deg, #2563ff 0%, #7c3aed 100%)",
  radius: "18px",
  sectionPadY: "112px",
  sectionPadYMobile: "64px",
  maxWidth: "1200px",
};

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

type Style = NonNullable<LayoutNode["style"]>;

export function n(type: string, props: Record<string, unknown> = {}, extra: Partial<LayoutNode> = {}): LayoutNode {
  return { id: uid(type.toLowerCase()), type, props, ...extra };
}

/** Scroll-triggered fade-and-rise — the site's default entrance for section content. */
export function reveal(delay = 0, y = 34): NonNullable<LayoutNode["timelines"]> {
  return [
    {
      version: 2,
      duration: 0.75,
      delay,
      trigger: { mode: "onScroll", scrollConfig: { scrub: false, start: "top 85%", end: "top 40%", pin: false } },
      tracks: [
        {
          id: uid("trk"),
          property: "opacity",
          keyframes: [
            { id: uid("kf"), time: 0, value: 0, easingOut: "power2.out", easingIn: "power2.out", interpolation: "smooth" },
            { id: uid("kf"), time: 0.75, value: 1, easingOut: "power2.out", easingIn: "power2.out", interpolation: "smooth" },
          ],
        },
        {
          id: uid("trk"),
          property: "y",
          keyframes: [
            { id: uid("kf"), time: 0, value: y, easingOut: "power3.out", easingIn: "power3.out", interpolation: "smooth" },
            { id: uid("kf"), time: 0.75, value: 0, easingOut: "power3.out", easingIn: "power3.out", interpolation: "smooth" },
          ],
        },
      ],
      cssVarTracks: [],
      clipPathTracks: [],
    },
  ];
}

/**
 * Scroll-scrubbed parallax — the element drifts as the page moves rather
 * than playing once. Used on section imagery so long pages feel alive
 * while scrolling, not just at the moment each section first appears.
 */
export function parallax(distance = 46): NonNullable<LayoutNode["timelines"]> {
  return [
    {
      version: 2,
      duration: 1,
      trigger: { mode: "onScroll", scrollConfig: { scrub: 0.6, start: "top bottom", end: "bottom top", pin: false } },
      tracks: [
        {
          id: uid("trk"),
          property: "y",
          keyframes: [
            { id: uid("kf"), time: 0, value: distance, easingOut: "linear", easingIn: "linear", interpolation: "smooth" },
            { id: uid("kf"), time: 1, value: -distance, easingOut: "linear", easingIn: "linear", interpolation: "smooth" },
          ],
        },
      ],
      cssVarTracks: [],
      clipPathTracks: [],
    },
  ];
}

/** Entrance that scales up slightly as it fades in — for hero visuals. */
export function revealScale(delay = 0): NonNullable<LayoutNode["timelines"]> {
  return [
    {
      version: 2,
      duration: 0.9,
      delay,
      trigger: { mode: "onScroll", scrollConfig: { scrub: false, start: "top 88%", end: "top 45%", pin: false } },
      tracks: [
        {
          id: uid("trk"),
          property: "opacity",
          keyframes: [
            { id: uid("kf"), time: 0, value: 0, easingOut: "power2.out", easingIn: "power2.out", interpolation: "smooth" },
            { id: uid("kf"), time: 0.9, value: 1, easingOut: "power2.out", easingIn: "power2.out", interpolation: "smooth" },
          ],
        },
        {
          id: uid("trk"),
          property: "scale",
          keyframes: [
            { id: uid("kf"), time: 0, value: 0.92, easingOut: "power3.out", easingIn: "power3.out", interpolation: "smooth" },
            { id: uid("kf"), time: 0.9, value: 1, easingOut: "power3.out", easingIn: "power3.out", interpolation: "smooth" },
          ],
        },
      ],
      cssVarTracks: [],
      clipPathTracks: [],
    },
  ];
}

/** Word-by-word headline reveal — reserved for hero/statement headings. */
export function revealWords(delay = 0): NonNullable<LayoutNode["timelines"]> {
  return [
    {
      version: 2,
      duration: 0.7,
      delay,
      trigger: { mode: "onScroll", scrollConfig: { scrub: false, start: "top 88%", end: "top 45%", pin: false } },
      splitText: "words",
      stagger: { amount: 0.5, from: "start", ease: "power2.out" },
      tracks: [
        {
          id: uid("trk"),
          property: "opacity",
          keyframes: [
            { id: uid("kf"), time: 0, value: 0, easingOut: "power2.out", easingIn: "power2.out", interpolation: "smooth" },
            { id: uid("kf"), time: 0.7, value: 1, easingOut: "power2.out", easingIn: "power2.out", interpolation: "smooth" },
          ],
        },
        {
          id: uid("trk"),
          property: "y",
          keyframes: [
            { id: uid("kf"), time: 0, value: 26, easingOut: "power3.out", easingIn: "power3.out", interpolation: "smooth" },
            { id: uid("kf"), time: 0.7, value: 0, easingOut: "power3.out", easingIn: "power3.out", interpolation: "smooth" },
          ],
        },
      ],
      cssVarTracks: [],
      clipPathTracks: [],
    },
  ];
}

/** Staggered version for grids/rows — children animate in sequence. */
export function revealStagger(amount = 0.12): NonNullable<LayoutNode["timelines"]> {
  const [base] = reveal();
  return [{ ...base, stagger: { amount, from: "start", ease: "power2.out" } }];
}

export interface SectionOpts {
  background?: string;
  backgroundImage?: string;
  overlay?: string;
  padY?: string;
  width?: string;
  gap?: string;
  align?: "flex-start" | "center" | "flex-end" | "stretch";
  id?: string;
  style?: Style;
}

/**
 * A full-bleed band with a centered, max-width content column.
 *
 * Deliberately two nested Sections. `contentWidth: "boxed"` clamps the
 * element it's set on — background and all (see blockComponents.tsx, which
 * maps it to max-width + margin auto on the wrapper itself) — so setting it
 * on the outer band would shrink the background to 1200px and leave bare
 * gutters either side on wide screens. The outer stays "full" to carry the
 * background and vertical rhythm; the inner "boxed" one constrains the
 * content.
 */
export function section(children: LayoutNode[], o: SectionOpts = {}): LayoutNode {
  const outerProps: Record<string, unknown> = {
    layoutMode: "flex",
    direction: "column",
    justifyContent: "center",
    alignItems: "stretch",
    gap: "0px",
    contentWidth: "full",
    background: o.background ?? "transparent",
    htmlTag: "section",
  };
  if (o.backgroundImage) {
    outerProps.backgroundImage = o.backgroundImage;
    outerProps.backgroundSize = "cover";
    outerProps.backgroundPosition = "center";
    outerProps.backgroundOverlayType = "color";
    outerProps.backgroundOverlayColor = o.overlay ?? "rgba(8,11,31,0.78)";
  }

  const inner = n(
    "Section",
    {
      layoutMode: "flex",
      direction: "column",
      justifyContent: "flex-start",
      alignItems: o.align ?? "stretch",
      gap: o.gap ?? "28px",
      contentWidth: "boxed",
      width: o.width ?? T.maxWidth,
      background: "transparent",
    },
    { children, style: { width: "100%" }, name: o.id ? `${o.id}-inner` : undefined }
  );

  const style: Style = {
    paddingTop: o.padY ?? T.sectionPadY,
    paddingBottom: o.padY ?? T.sectionPadY,
    paddingLeft: "24px",
    paddingRight: "24px",
    mobile: { paddingTop: T.sectionPadYMobile, paddingBottom: T.sectionPadYMobile, paddingLeft: "18px", paddingRight: "18px" },
    ...(o.id ? { htmlId: o.id } : {}),
    ...(o.style ?? {}),
  };
  return n("Section", outerProps, { children: [inner], style, name: o.id });
}

/** Small uppercase label that sits above a section title. */
export function eyebrow(text: string): LayoutNode {
  return n(
    "Heading",
    { text, level: "div", fontSize: "13px", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", color: T.accent },
    { timelines: reveal(0, 18) }
  );
}

export function h(text: string, level: "h1" | "h2" | "h3" | "h4" = "h2", extra: Record<string, unknown> = {}): LayoutNode {
  const sizes: Record<string, string> = { h1: "clamp(2.6rem, 6vw, 4.4rem)", h2: "clamp(2rem, 4vw, 3.1rem)", h3: "clamp(1.35rem, 2.2vw, 1.75rem)", h4: "1.15rem" };
  return n(
    "Heading",
    { text, level, fontSize: sizes[level], fontWeight: level === "h1" ? "800" : "700", lineHeight: "1.1", letterSpacing: "-0.02em", color: T.text, ...extra },
    { timelines: reveal(0.05) }
  );
}

export function p(html: string, extra: Record<string, unknown> = {}): LayoutNode {
  return n(
    "RichText",
    { html: html.startsWith("<") ? html : `<p>${html}</p>`, color: T.muted, fontSize: "1.02rem", lineHeight: "1.75", ...extra },
    { timelines: reveal(0.1) }
  );
}

export function button(label: string, href: string, kind: "primary" | "ghost" = "primary"): LayoutNode {
  const primary = {
    background: T.gradient,
    color: "#ffffff",
    borderStyle: "none",
    boxShadow: "0 12px 34px rgba(37,99,255,0.34)",
  };
  const ghost = {
    background: "transparent",
    color: T.text,
    borderStyle: "solid",
    borderWidth: "1px",
    borderColor: "rgba(255,255,255,0.28)",
  };
  return n(
    "CTAButton",
    {
      label,
      href,
      variant: "gold",
      borderRadius: "9999px",
      fontWeight: "600",
      fontSize: "0.98rem",
      paddingTop: "16px",
      paddingBottom: "16px",
      paddingLeft: "34px",
      paddingRight: "34px",
      ...(kind === "primary" ? primary : ghost),
    },
    {
      style: {
        hoverTransitionDuration: "0.28s",
        hoverTransitionEasing: "cubic-bezier(0.4, 0, 0.2, 1)",
        hover: kind === "primary" ? { transform: "translateY(-3px)", boxShadow: "0 18px 44px rgba(124,58,237,0.46)" } : { background: "rgba(255,255,255,0.09)", borderColor: T.accent },
      },
    }
  );
}

/** Horizontal button row. */
export function buttonRow(...buttons: LayoutNode[]): LayoutNode {
  return n(
    "Section",
    { layoutMode: "flex", direction: "row", gap: "14px", wrap: "wrap", alignItems: "center", justifyContent: "flex-start", contentWidth: "full", background: "transparent" },
    { children: buttons, style: { marginTop: "12px" }, timelines: reveal(0.18) }
  );
}

export interface ColsOpts {
  count?: number;
  ratio?: "equal" | "33-66" | "66-33" | "25-75" | "75-25";
  gap?: string;
  align?: "flex-start" | "center" | "stretch";
  stagger?: boolean;
}

export function cols(children: LayoutNode[], o: ColsOpts = {}): LayoutNode {
  return n(
    "Columns",
    {
      columnCount: o.count ?? children.length,
      ratio: o.ratio ?? "equal",
      gap: o.gap ?? "26px",
      layoutMode: "grid",
      alignItems: o.align ?? "stretch",
      contentWidth: "full",
    },
    { children, timelines: o.stagger === false ? undefined : revealStagger() }
  );
}

/** A bordered glass card used across services, values, case studies and pricing. */
export function card(children: LayoutNode[], accent = T.accent): LayoutNode {
  return n(
    "Section",
    { layoutMode: "flex", direction: "column", gap: "14px", contentWidth: "full", background: T.surface, htmlTag: "article" },
    {
      children,
      style: {
        paddingTop: "34px",
        paddingBottom: "34px",
        paddingLeft: "30px",
        paddingRight: "30px",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: T.surfaceBorder,
        borderRadius: T.radius,
        height: "100%",
        hoverTransitionDuration: "0.32s",
        hoverTransitionEasing: "cubic-bezier(0.4, 0, 0.2, 1)",
        hover: {
          transform: "translateY(-8px)",
          borderColor: accent,
          background: "rgba(255,255,255,0.06)",
          boxShadow: `0 22px 54px rgba(2,6,23,0.55)`,
        },
      },
    }
  );
}

export function iconBox(icon: string, title: string, description: string, color = T.accent): LayoutNode {
  return n("IconBox", {
    icon,
    title,
    description,
    titleTag: "h3",
    iconPosition: "top",
    align: "left",
    size: "26px",
    shape: "circle",
    color,
    secondaryColor: "rgba(37,99,255,0.14)",
    padding: "14px",
    iconSpacing: "18px",
    titleColor: T.text,
    descriptionColor: T.muted,
  });
}

export function counter(value: string, label: string): LayoutNode {
  return n(
    "Counter",
    {
      value,
      label,
      countUp: true,
      countDuration: 2,
      valueColor: T.text,
      valueFontSize: "clamp(2.2rem, 4vw, 3.2rem)",
      valueFontWeight: "800",
      labelColor: T.muted,
      labelFontSize: "0.95rem",
      labelTextTransform: "uppercase",
      labelLetterSpacing: "0.12em",
    },
    { style: { textAlign: "center" } }
  );
}

export function image(src: string, alt: string, radius = T.radius): LayoutNode {
  return n(
    "Image",
    { src, alt, imageBorderRadiusTop: radius, imageBorderRadiusRight: radius, imageBorderRadiusBottom: radius, imageBorderRadiusLeft: radius, width: "100%" },
    {
      style: {
        hoverTransitionDuration: "0.5s",
        hover: { transform: "scale(1.03)" },
        overflow: "hidden",
      },
      timelines: [...revealScale(0.05), ...parallax(30)],
    }
  );
}

export function spacer(height = "18px"): LayoutNode {
  return n("Spacer", { height });
}

/** Centered section intro: eyebrow + title + supporting line. */
export function sectionIntro(kicker: string, title: string, body?: string): LayoutNode {
  const kids = [eyebrow(kicker), h(title, "h2", { align: "center" })];
  if (body) kids.push(p(body, { align: "center", fontSize: "1.06rem" }));
  return n(
    "Section",
    { layoutMode: "flex", direction: "column", gap: "16px", alignItems: "center", contentWidth: "boxed", width: "760px", background: "transparent" },
    { children: kids, style: { textAlign: "center", marginBottom: "18px", blockAlign: "center" } }
  );
}

// ── Depth & atmosphere ────────────────────────────────────────────────────
// Flat colour bands are what make a generated page read as "template". These
// layered radial gradients give each section a light source, so sections
// differ from one another without needing a photo behind every one.

export const GLOW = {
  topLeft: `radial-gradient(1100px 520px at 12% -10%, rgba(37,99,255,0.22), transparent 62%), ${T.bg}`,
  topRight: `radial-gradient(1000px 480px at 88% -6%, rgba(124,58,237,0.20), transparent 60%), ${T.bg}`,
  center: `radial-gradient(900px 520px at 50% 0%, rgba(37,99,255,0.16), transparent 62%), ${T.bgAlt}`,
  dual: `radial-gradient(760px 420px at 8% 8%, rgba(37,99,255,0.20), transparent 58%), radial-gradient(760px 420px at 92% 92%, rgba(124,58,237,0.18), transparent 58%), ${T.bg}`,
  soft: `radial-gradient(1200px 600px at 50% 110%, rgba(124,58,237,0.16), transparent 60%), ${T.bgAlt}`,
};

/** Small capsule label — the "badge" above a hero headline. */
export function pill(text: string): LayoutNode {
  return n(
    "Heading",
    { text, level: "div", fontSize: "12.5px", fontWeight: "700", letterSpacing: "0.16em", textTransform: "uppercase", color: "#c7d2fe", align: "center" },
    {
      style: {
        background: "rgba(37,99,255,0.14)",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: "rgba(37,99,255,0.42)",
        borderRadius: "9999px",
        paddingTop: "9px",
        paddingBottom: "9px",
        paddingLeft: "20px",
        paddingRight: "20px",
        blockAlign: "left",
        width: "fit-content",
      },
      timelines: reveal(0, 16),
    }
  );
}

/** Two-tone headline — the second half picks up the brand accent. */
export function splitHeading(part1: string, part2: string, align: "left" | "center" = "left", level: "h1" | "h2" = "h2"): LayoutNode {
  return n(
    "DualColorHeading",
    {
      part1,
      part2,
      level,
      align,
      part1Color: T.text,
      part2Color: T.accent,
      fontSize: level === "h1" ? "clamp(2.7rem, 5.6vw, 4.5rem)" : "clamp(2rem, 4vw, 3.2rem)",
      fontWeight: "800",
    },
    { style: { letterSpacing: "-0.025em", lineHeight: "1.07" }, timelines: revealWords(0.05) }
  );
}

/** Section header with an uppercase kicker, big title and accent rule. */
export function advHeading(kicker: string, title: string, align: "left" | "center" = "center", highlight = ""): LayoutNode {
  return n(
    "AdvancedHeading",
    {
      subtitle: kicker,
      title,
      highlightText: highlight,
      dividerEnabled: true,
      align,
      subtitleColor: T.accent,
      subtitleFontSize: "13px",
      subtitleLetterSpacing: "0.18em",
      titleColor: T.text,
      titleFontSize: "clamp(2rem, 4vw, 3.1rem)",
      titleFontWeight: "800",
      highlightColor: T.accent,
      dividerColor: T.accent,
    },
    { style: { letterSpacing: "-0.02em", ...(align === "center" ? { blockAlign: "center" } : {}) }, timelines: reveal(0.04) }
  );
}

/** Feature card with a coloured glow — richer than a flat bordered box. */
export function glowCard(icon: string, title: string, description: string, glow = T.accent, cta?: { label: string; url: string }): LayoutNode {
  return n(
    "GlowingCard",
    {
      icon,
      title,
      description,
      glowColor: glow,
      glowIntensity: "34px",
      borderRadius: "18px",
      cardBackground: "rgba(255,255,255,0.035)",
      cardBorderStyle: "solid",
      cardBorderWidth: "1px",
      cardBorderColor: "rgba(255,255,255,0.10)",
      iconColor: glow,
      titleColor: T.text,
      descColor: T.muted,
      ctaLabel: cta?.label ?? "",
      ctaUrl: cta?.url ?? "",
    },
    { style: { height: "100%" } }
  );
}

/** Numbered process step. */
export function step(number: string, title: string, description: string, color = T.accent): LayoutNode {
  return n(
    "NumberBox",
    {
      number,
      title,
      description,
      numberColor: "#ffffff",
      numberBackground: color,
      numberSize: "58px",
      numberFontSize: "20px",
      titleColor: T.text,
      titleFontSize: "1.18rem",
      descColor: T.muted,
    },
    { style: { height: "100%" } }
  );
}

/** Scrolling keyword band — breaks up long pages and adds motion. */
export function marquee(items: string[], speed = 26): LayoutNode {
  return n("MarqueeStrip", {
    items,
    showIcon: true,
    speedSeconds: speed,
    gap: "1.25rem",
    background: "transparent",
    color: T.text,
    pillBackground: "rgba(255,255,255,0.05)",
    pillColor: "rgba(255,255,255,0.86)",
    fontSize: "0.95rem",
    fontWeight: "600",
  });
}

/** Big scroll-revealed statement — a full-width moment between dense sections. */
export function statement(text: string): LayoutNode {
  return n("ScrollTextAnimation", {
    text,
    unit: "word",
    revealStyle: "opacity",
    dimmedOpacity: "0.14",
    align: "center",
    color: T.text,
    fontSize: "clamp(1.7rem, 4.2vw, 3.2rem)",
    fontWeight: "800",
    lineHeight: "1.25",
  });
}

/** Overlapping, tilted photo stack — a far more interesting hero visual than one flat image. */
export function stackedImages(images: string[]): LayoutNode {
  return n(
    "StackedImages",
    {
      images: [
        { image: images[0], rotate: "-7deg", offsetX: "0px", offsetY: "10px" },
        { image: images[1], rotate: "4deg", offsetX: "34px", offsetY: "-12px" },
        { image: images[2], rotate: "-2deg", offsetX: "68px", offsetY: "14px" },
      ],
      hoverExpand: true,
      imageWidth: "260px",
      imageHeight: "330px",
      borderRadius: "18px",
      borderColor: "rgba(255,255,255,0.14)",
      boxShadow: "0 26px 70px rgba(2,6,23,0.65)",
    },
    { timelines: [...revealScale(0.1), ...parallax(24)] }
  );
}

/** Compact metric block used in rows beneath a hero. */
export function statTile(value: string, label: string, accent = T.accent): LayoutNode {
  return n(
    "Section",
    { layoutMode: "flex", direction: "column", gap: "4px", contentWidth: "full", background: "rgba(255,255,255,0.04)" },
    {
      children: [
        n("Counter", {
          value,
          label,
          countUp: true,
          countDuration: 2,
          valueColor: T.text,
          valueFontSize: "clamp(1.7rem, 2.6vw, 2.3rem)",
          valueFontWeight: "800",
          labelColor: T.muted,
          labelFontSize: "0.82rem",
          labelTextTransform: "uppercase",
          labelLetterSpacing: "0.1em",
        }),
      ],
      style: {
        paddingTop: "22px",
        paddingBottom: "22px",
        paddingLeft: "20px",
        paddingRight: "20px",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: "rgba(255,255,255,0.10)",
        borderRadius: "14px",
        textAlign: "center",
        hoverTransitionDuration: "0.3s",
        hover: { borderColor: accent, background: "rgba(255,255,255,0.07)", transform: "translateY(-4px)" },
      },
    }
  );
}

/** Bordered "quote" card with an oversized mark, for testimonials. */
export function quote(text: string, author: string, role: string, accent = T.accent): LayoutNode {
  return n(
    "Section",
    { layoutMode: "flex", direction: "column", gap: "14px", contentWidth: "full", background: "rgba(255,255,255,0.035)" },
    {
      children: [
        n("Heading", { text: "“", level: "div", fontSize: "62px", fontWeight: "800", color: accent }, { style: { lineHeight: "0.7", opacity: "0.55" } }),
        p(text, { fontSize: "1.04rem", color: "rgba(255,255,255,0.86)", lineHeight: "1.7" }),
        n("Heading", { text: author, level: "div", fontSize: "0.98rem", fontWeight: "700", color: T.text }),
        n("Heading", { text: role, level: "div", fontSize: "0.86rem", fontWeight: "500", color: accent }),
      ],
      style: {
        paddingTop: "32px",
        paddingBottom: "32px",
        paddingLeft: "28px",
        paddingRight: "28px",
        borderStyle: "solid",
        borderWidth: "1px",
        borderColor: "rgba(255,255,255,0.10)",
        borderRadius: T.radius,
        height: "100%",
        hoverTransitionDuration: "0.32s",
        hover: { borderColor: accent, transform: "translateY(-6px)", boxShadow: "0 22px 54px rgba(2,6,23,0.55)" },
      },
    }
  );
}

/** Horizontal flex row that doesn't force a grid — used for button/stat clusters. */
export function row(children: LayoutNode[], justify: "flex-start" | "center" = "flex-start", gap = "14px"): LayoutNode {
  return n(
    "Section",
    { layoutMode: "flex", direction: "row", gap, wrap: "wrap", alignItems: "center", justifyContent: justify, contentWidth: "full", background: "transparent" },
    { children, timelines: reveal(0.16) }
  );
}

export function doc(nodes: LayoutNode[]): LayoutDocument {
  return { version: 1, nodes };
}

export const IMG = {
  heroTeam: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1900&q=80",
  meeting: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
  analytics: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80",
  desk: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1600&q=80",
  workspace: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&q=80",
  strategy: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80",
  collab: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80",
  code: "https://images.unsplash.com/photo-1531973576160-7125cd663d86?auto=format&fit=crop&w=1600&q=80",
  city: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1900&q=80",
  studio: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
};
