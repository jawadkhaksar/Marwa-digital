import { createElement, type CSSProperties, type ReactNode } from "react";
import type { LayoutNode } from "@marwa/builder";
import { getBlockDefinition, parseLayoutDocumentSafe, generateGSAPScript } from "@marwa/builder";
import { BLOCK_COMPONENTS } from "./blockComponents";
import { resolveNodeStyle } from "./resolveNodeStyle";

export interface ExportAssets {
  /** React elements — no builder chrome, no inline `--exr-*`/style attributes (see `css`), no per-node `<style>` tags. Render these directly in a real Server Component (see app/export/[slug]/page.tsx); Next's App Router forbids manually string-rendering a tree via `react-dom/server` anywhere in its module graph. */
  elements: ReactNode[];
  /** Every block's desktop declarations + tablet/mobile/hover/customCss rules, one rule per block class. */
  css: string;
  /** Standalone GSAP script for every block's `node.animations` — see generateGSAPScript. */
  js: string;
}

/**
 * Walks a `Page.layout` tree into a clean, standalone bundle: plain React
 * elements (no builder chrome), one aggregated stylesheet, and a
 * framework-free GSAP script — for a page shell with none of the admin
 * builder's runtime attached. See app/export/[slug]/page.tsx, the real
 * Server Component route that renders `elements` and embeds `css`/`js`.
 *
 * Deliberately reimplements LayoutRenderer's node walk rather than reusing
 * it directly: LayoutRenderer always mounts PreviewBridge/
 * MotionPathScrollBinder/EmptyContainerDropzone/CanvasAddSectionBanner
 * (harmless on a live page — they no-op or stay `display:none` outside the
 * admin iframe, see PreviewBridge.tsx) and emits one scattered `<style>` tag
 * per node. Touching that shared component to add an export-mode branch
 * risks the real site's rendering; a parallel, additive walk here is zero
 * risk to it. Still calls the exact same `resolveNodeStyle`/
 * `getBlockDefinition`/`BLOCK_COMPONENTS` LayoutRenderer itself uses, so
 * visual output matches the live page exactly.
 */
export function buildExportAssets(layout: unknown): ExportAssets {
  const doc = parseLayoutDocumentSafe(layout);
  const cssRules: string[] = [];
  const elements = doc.nodes.map((node) => renderExportNode(node, cssRules));
  const js = generateGSAPScript(doc.nodes);
  return { elements, css: cssRules.join("\n"), js };
}

function renderExportNode(node: LayoutNode, cssRules: string[]): ReactNode {
  const definition = getBlockDefinition(node.type);
  const Component = BLOCK_COMPONENTS[node.type];
  if (!definition || !Component) return null;

  const parsedProps = definition.propsSchema.safeParse(node.props);
  const props = parsedProps.success ? parsedProps.data : definition.defaultProps;

  const children = node.children?.length ? node.children.map((child) => renderExportNode(child, cssRules)) : undefined;

  // Legacy singleton sections self-fetch their own content and render
  // unwrapped — see the matching branch in LayoutRenderer.tsx.
  if (definition.singleton) {
    return createElement(Component, { key: node.id });
  }

  const blockClassName = `blk-${node.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { className, style, responsiveCss, htmlId } = resolveNodeStyle(node.style, props as Record<string, unknown>, blockClassName);
  const rootStyle = node.type === "Divider" ? { ...style, alignSelf: "stretch" as const } : style;

  // Every declaration LayoutRenderer would apply inline instead becomes a
  // class rule here — the point of a "single stylesheet" export. Safe to
  // move desktop values off the inline style and onto the same class the
  // tablet/mobile/hover rules already target: those already carry
  // `!important` specifically so they can beat this rule regardless of
  // cascade origin (see resolveNodeStyle.ts), and source order still places
  // this desktop rule first.
  const desktopDecl = styleObjectToCssDeclarations(rootStyle);
  if (desktopDecl) cssRules.push(`.${blockClassName}{${desktopDecl}}`);
  if (responsiveCss) cssRules.push(responsiveCss);

  const rootAttrs = { id: htmlId, className: className || undefined, "data-block-id": node.id, "data-block-type": node.type };

  if (definition.isContainer) {
    return createElement(Component, { ...props, key: node.id, wrapperProps: rootAttrs }, children);
  }
  return createElement("div", { ...rootAttrs, key: node.id }, createElement(Component, props, children));
}

// zIndex/opacity/etc. are unitless numbers in React's own style handling —
// everything else numeric gets "px", matching what React does for inline
// styles today so moving these values from `style=` to a CSS rule doesn't
// change their meaning.
const UNITLESS_PROPS = new Set(["opacity", "zIndex", "flexGrow", "flexShrink", "fontWeight", "lineHeight", "order", "zoom"]);

function camelToKebab(key: string): string {
  return key.startsWith("--") ? key : key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function styleObjectToCssDeclarations(style: CSSProperties | Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null || value === "") continue;
    const prop = camelToKebab(key);
    const strValue = key.startsWith("--")
      ? String(value)
      : typeof value === "number"
        ? UNITLESS_PROPS.has(key)
          ? String(value)
          : `${value}px`
        : String(value);
    parts.push(`${prop}:${strValue}`);
  }
  return parts.join(";");
}
