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

/** Staggered version for grids/rows — children animate in sequence. */
export function revealStagger(amount = 0.12): NonNullable<LayoutNode["timelines"]> {
  const [base] = reveal();
  return [{ ...base, stagger: { amount, from: "start" } }];
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

/** A full-bleed band with a centered, max-width content column — the structural unit every page below is composed from. */
export function section(children: LayoutNode[], o: SectionOpts = {}): LayoutNode {
  const props: Record<string, unknown> = {
    layoutMode: "flex",
    direction: "column",
    justifyContent: "flex-start",
    alignItems: o.align ?? "stretch",
    gap: o.gap ?? "28px",
    contentWidth: "boxed",
    width: o.width ?? T.maxWidth,
    background: o.background ?? "transparent",
    htmlTag: "section",
  };
  if (o.backgroundImage) {
    props.backgroundImage = o.backgroundImage;
    props.backgroundSize = "cover";
    props.backgroundPosition = "center";
    props.backgroundOverlayType = "color";
    props.backgroundOverlayColor = o.overlay ?? "rgba(8,11,31,0.78)";
  }
  const style: Style = {
    paddingTop: o.padY ?? T.sectionPadY,
    paddingBottom: o.padY ?? T.sectionPadY,
    paddingLeft: "24px",
    paddingRight: "24px",
    mobile: { paddingTop: T.sectionPadYMobile, paddingBottom: T.sectionPadYMobile, paddingLeft: "18px", paddingRight: "18px" },
    ...(o.id ? { htmlId: o.id } : {}),
    ...(o.style ?? {}),
  };
  return n("Section", props, { children, style, name: o.id });
}

/** Small uppercase label that sits above a section title. */
export function eyebrow(text: string): LayoutNode {
  return n(
    "Heading",
    { text, level: "div", fontSize: "13px", fontWeight: "700", letterSpacing: "0.18em", textTransform: "uppercase", color: T.accent, align: "inherit" },
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
      timelines: reveal(0.08, 26),
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
