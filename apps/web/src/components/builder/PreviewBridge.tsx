"use client";

import { useEffect, useRef, useState } from "react";
import { BLOCK_REGISTRY } from "@marwa/builder";
import { applyTracksToDOM } from "./timelineUtils";

// Computed once from the registry (Section, Columns, Carousel, Modal Popup,
// Off-Canvas today) rather than hardcoded, so a future container block gets
// the hover toolbar/top-left badge/drag-reorder/empty-dropzone treatment
// automatically instead of silently missing it.
const CONTAINER_TYPES = new Set(Object.values(BLOCK_REGISTRY).filter((b) => b.isContainer).map((b) => b.type));
const CONTAINER_SELECTOR = [...CONTAINER_TYPES].map((t) => `[data-block-type="${t}"]`).join(",");

interface HoverRect {
  blockId: string;
  /** Bottom-center anchor for the existing ⠿/+/✕ toolbar. */
  top: number;
  left: number;
  width: number;
  /** Top-left corner, for the small container badge. */
  topEdge: number;
  leftEdge: number;
}

type DropZone = "before" | "after" | "into";
interface DropIndicator {
  top: number;
  left: number;
  width: number;
  height: number;
  zone: DropZone;
  /** A precise line indicator (see computeChildInsertion) already carries its own exact rect — true renders a vertical bar (width/height swapped) instead of the default horizontal one. */
  horizontal?: boolean;
}

interface SelectedRect {
  blockId: string;
  blockType: string;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ContextMenuState {
  /** null means "the bottom-of-canvas add-section banner", not a real block — see handleContextMenu. */
  blockId: string | null;
  blockType: string;
  x: number;
  y: number;
  hasClipboard: boolean;
}

/**
 * Only activates when this page is embedded in an iframe (the admin
 * builder's live preview panel) — no-ops entirely for normal site visitors,
 * since `window.self === window.top` outside an iframe.
 *
 * Responsibilities:
 * 1. Clicking any block (`data-block-id`, set by LayoutRenderer) posts its
 *    id to the parent window instead of navigating, so the admin canvas can
 *    select it in the outline/property panel.
 * 2. Hovering a Section shows a small floating "⠿ / + / ✕" toolbar docked
 *    to its bottom edge — matching Elementor's in-canvas add/delete/drag
 *    controls. Rendered *inside* the iframe (not the parent window) so it
 *    can be positioned with plain `getBoundingClientRect()`, no cross-frame
 *    coordinate math.
 * 3. Dragging the ⠿ handle reorders/nests Sections directly in the canvas —
 *    a real native HTML5 drag confined entirely to this document (the admin
 *    parent window is a different origin/port, so a drag can't cross the
 *    iframe boundary itself; only the *result* — a postMessage once the
 *    drop completes — needs to reach it).
 * 4. Listens *back* for the admin's currently-selected block id (round-
 *    tripped through the same "select" click above, or set directly from
 *    the Structure panel / outline tree) and draws a persistent outline
 *    around it plus scrolls it into view — otherwise picking an off-screen
 *    or deeply-nested block from the Structure panel had no visible effect
 *    on the canvas at all. A small pencil icon tracks the same block's edge
 *    (re-measured on scroll/resize, since smooth-scrolling it into view is
 *    itself a scroll sequence) as an explicit "you're editing this" cue,
 *    matching Elementor's own selected-element affordance.
 */
// `window.self !== window.top` only proves the page is inside SOME iframe —
// a browser extension, a link-preview bot, or any other third-party wrapper
// trips it exactly the same way the real admin builder does, which
// previously made the editor's visible "Drag widget here" chrome (and its
// dashed-border override CSS below) leak onto a genuine site visitor's
// screen whenever anything else happened to frame the page (confirmed
// live — neither an async postMessage handshake nor a client-side URL-param
// check alone was reliable enough). `isBuilderPreview` fixes this at the
// root: it's decided server-side (each page route reads `__builder_preview`
// from `searchParams`) and passed down as a real prop all the way from
// LayoutRenderer — this component doesn't even mount on a real visitor's
// page, since its caller never renders it without that prop being true.
export function PreviewBridge({ isBuilderPreview }: { isBuilderPreview: boolean }) {
  const [embedded, setEmbedded] = useState(false);
  const [hover, setHover] = useState<HoverRect | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedRect, setSelectedRect] = useState<SelectedRect | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  // Fed by the admin parent's "clipboard-state" message (see page.tsx) —
  // NOT read from this iframe's own localStorage, which is a different
  // origin's storage than the admin page that actually writes the clipboard
  // on Copy, and would always read back empty.
  const hasClipboardRef = useRef(false);
  // Last drop target computed from the admin's postMessage-driven pointer
  // drag (see handleParentMessage's "external-drag-move" below) — the
  // "external-drag-drop" message that follows carries no coordinates of its
  // own, so this is what it reads to know where to actually insert.
  const externalDragTargetRef = useRef<{ kind: "banner" } | { kind: "container"; targetId: string; childIndex: number } | null>(null);

  useEffect(() => {
    if (!isBuilderPreview || typeof window === "undefined" || window.self === window.top) return;
    // Flags that this render is embedded in the admin's builder iframe —
    // only knowable client-side (window.self/window.top), and this same
    // effect goes on to set up the actual postMessage listener machinery
    // that only makes sense once that's true, so there's no clean way to
    // split this one flag out into its own external-store read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmbedded(true);

    function measureSelectedRect(blockId: string | null) {
      if (!blockId) {
        setSelectedRect(null);
        return;
      }
      const target = document.querySelector(`[data-block-id="${blockId}"]`);
      if (!target) {
        setSelectedRect(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setSelectedRect({
        blockId,
        blockType: target.getAttribute("data-block-type") ?? "",
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    }

    function handleParentMessage(e: MessageEvent) {
      // `e.source === window.parent` guards against a spoofed message from
      // some other frame/window that merely knows the "marwa-admin" source
      // tag — without it, anything with a reference to this iframe (an ad,
      // a third-party embed sharing the page) could drive scroll/timeline-
      // scrub/drag-drop actions in the live preview.
      if (e.source !== window.parent) return;
      if (e.data?.source !== "marwa-admin") return;

      if (e.data.action === "request-scroll-report") {
        window.parent.postMessage({ source: "marwa-preview", action: "scroll-report", scrollY: window.scrollY }, "*");
        return;
      }
      if (e.data.action === "restore-scroll" && typeof e.data.scrollY === "number") {
        window.scrollTo(0, e.data.scrollY);
        return;
      }
      if (e.data.action === "scrub-timeline" && typeof e.data.time === "number" && Array.isArray(e.data.layers)) {
        applyTracksToDOM(e.data.layers, e.data.time);
        return;
      }
      if (e.data.action === "clipboard-state" && typeof e.data.hasClipboard === "boolean") {
        hasClipboardRef.current = e.data.hasClipboard;
        return;
      }

      // Cross-origin native HTML5 drag-and-drop (dataTransfer) can't
      // reliably deliver its payload from the admin's sidebar palette into
      // this cross-origin iframe's drop handler in every browser — this is
      // a synthetic replacement driven entirely by postMessage instead,
      // with the admin tracking the real pointermove/pointerup and just
      // telling this document where the cursor currently is.
      if (e.data.action === "external-drag-move" && typeof e.data.x === "number" && typeof e.data.y === "number") {
        const el = document.elementFromPoint(e.data.x, e.data.y) as HTMLElement | null;
        const banner = el?.closest("[data-canvas-bottom-banner]") as HTMLElement | null;
        if (banner) {
          externalDragTargetRef.current = { kind: "banner" };
          const rect = banner.getBoundingClientRect();
          setDropIndicator({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height, zone: "into" });
          return;
        }
        const target = el?.closest(CONTAINER_SELECTOR) as HTMLElement | null;
        const targetId = target?.getAttribute("data-block-id");
        if (!target || !targetId) {
          externalDragTargetRef.current = null;
          setDropIndicator(null);
          return;
        }
        const { childIndex, indicator } = computeChildInsertion(target, e.data.x, e.data.y);
        externalDragTargetRef.current = { kind: "container", targetId, childIndex };
        setDropIndicator(indicator);
        return;
      }
      if (e.data.action === "external-drag-clear") {
        externalDragTargetRef.current = null;
        setDropIndicator(null);
        return;
      }
      if (e.data.action === "external-drag-drop" && typeof e.data.blockType === "string") {
        const t = externalDragTargetRef.current;
        externalDragTargetRef.current = null;
        setDropIndicator(null);
        if (!t) return;
        if (t.kind === "banner") {
          window.parent.postMessage({ source: "marwa-preview", action: "request-insert-block-as-section", blockType: e.data.blockType }, "*");
        } else {
          window.parent.postMessage(
            { source: "marwa-preview", action: "request-insert-block-at-index", blockType: e.data.blockType, targetId: t.targetId, childIndex: t.childIndex },
            "*"
          );
        }
        return;
      }

      if (e.data.action !== "highlight-select") return;

      const blockId: string | null = e.data.blockId ?? null;
      setSelectedBlockId(blockId);
      measureSelectedRect(blockId);
      if (!blockId) return;
      const target = document.querySelector(`[data-block-id="${blockId}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    // Keeps the pencil icon glued to the selected block's edge while the
    // smooth-scroll from selecting it (above) is still animating, and while
    // the page is scrolled/resized afterward for any other reason.
    function handleScrollOrResize() {
      setSelectedBlockId((current) => {
        measureSelectedRect(current);
        return current;
      });
    }

    function handleClick(e: MouseEvent) {
      const toolbar = (e.target as HTMLElement)?.closest("[data-preview-toolbar]");
      if (toolbar) return; // let the toolbar's own onClick handlers run
      const target = (e.target as HTMLElement)?.closest("[data-block-id]");
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      window.parent.postMessage({ source: "marwa-preview", action: "select", blockId: target.getAttribute("data-block-id") }, "*");
    }

    function handleOver(e: MouseEvent) {
      // Moving onto the toolbar itself would otherwise miss the
      // `[data-block-type="Section"]` match below (the toolbar isn't
      // rendered inside the section's DOM subtree), clearing `hover` and
      // unmounting the toolbar out from under the cursor — a flicker loop
      // that made the "+" button nearly unclickable. Keep the current
      // hover in place while the pointer is over the toolbar.
      if ((e.target as HTMLElement)?.closest("[data-preview-toolbar]")) return;

      // Only containers (Section, Columns, Carousel, Modal Popup, Off-Canvas)
      // get the insert/delete/drag toolbar — hovering a widget (Heading,
      // Button, Divider, ...) inside one resolves to its nearest enclosing
      // container instead of showing a toolbar on the widget.
      const target = (e.target as HTMLElement)?.closest(CONTAINER_SELECTOR) as HTMLElement | null;
      if (!target) {
        setHover(null);
        return;
      }
      const rect = target.getBoundingClientRect();
      setHover({
        blockId: target.getAttribute("data-block-id")!,
        top: rect.bottom + window.scrollY,
        left: rect.left + rect.width / 2 + window.scrollX,
        width: rect.width,
        topEdge: rect.top + window.scrollY,
        leftEdge: rect.left + window.scrollX,
      });
    }

    function handleLeave() {
      setHover(null);
    }

    // Reads the block type for a brand-new widget dragged in from the admin
    // sidebar's palette. Prefers the custom MIME type, but that's not
    // guaranteed to survive into a cross-origin iframe's drop handler in
    // every browser (see the matching comment in BlockLibrarySidebar.tsx),
    // so a prefixed "text/plain" fallback — a standard type guaranteed to
    // cross — is what actually gets relied on. Returns null for anything
    // else (e.g. an existing block's id being dragged to reorder).
    function readNewBlockType(e: DragEvent): string | null {
      const direct = e.dataTransfer?.getData("application/marwa-block-type");
      if (direct) return direct;
      const plain = e.dataTransfer?.getData("text/plain");
      const PREFIX = "marwa-block:";
      if (plain?.startsWith(PREFIX)) return plain.slice(PREFIX.length);
      return null;
    }

    // Where a brand-new widget dragged in from the sidebar palette actually
    // lands inside a container — a simpler container-level before/after/into
    // split only ever resolves to "first child", "last child", or "append at
    // the end", regardless of which existing sibling the cursor is
    // actually over. For a Section already holding several cards, that meant
    // a drop anywhere in its middle always landed after every existing
    // child — visually correct in a column layout, but wrong for a
    // horizontal row (new item forced to the end instead of where it was
    // dropped) and confusing either way with the whole container highlighted
    // instead of a line at the real target position. Compares the cursor to
    // each existing child's own midpoint instead.
    function computeChildInsertion(
      container: HTMLElement,
      clientX: number,
      clientY: number
    ): { childIndex: number; indicator: DropIndicator } {
      const containerRect = container.getBoundingClientRect();
      const children = Array.from(container.children).filter(
        (c): c is HTMLElement => c instanceof HTMLElement && c.hasAttribute("data-block-id")
      );

      if (children.length === 0) {
        return {
          childIndex: 0,
          indicator: {
            top: containerRect.top + window.scrollY + 4,
            left: containerRect.left + window.scrollX + 4,
            width: containerRect.width - 8,
            height: 3,
            zone: "before",
          },
        };
      }

      // Flex row (a horizontal card/column layout) needs the cursor's X
      // compared against each child's horizontal midpoint instead of Y —
      // anything else (flex column, grid, or no flex at all) falls back to
      // the vertical-stacking assumption, which covers the overwhelming
      // majority of real Section/Columns content.
      const cs = getComputedStyle(container);
      const horizontal = cs.display.includes("flex") && cs.flexDirection.startsWith("row");

      let childIndex = children.length;
      for (let i = 0; i < children.length; i++) {
        const r = children[i].getBoundingClientRect();
        const mid = horizontal ? r.left + r.width / 2 : r.top + r.height / 2;
        if ((horizontal ? clientX : clientY) < mid) {
          childIndex = i;
          break;
        }
      }

      const boundary = (childIndex < children.length ? children[childIndex] : children[children.length - 1]).getBoundingClientRect();
      const indicator: DropIndicator = horizontal
        ? {
            top: containerRect.top + window.scrollY,
            left: (childIndex < children.length ? boundary.left : boundary.right) + window.scrollX - 1,
            width: 3,
            height: containerRect.height,
            zone: "before",
            horizontal: true,
          }
        : {
            top: (childIndex < children.length ? boundary.top : boundary.bottom) + window.scrollY - 1,
            left: containerRect.left + window.scrollX,
            width: containerRect.width,
            height: 3,
            zone: "before",
          };

      return { childIndex, indicator };
    }

    function handleDragOver(e: DragEvent) {
      const banner = (e.target as HTMLElement)?.closest("[data-canvas-bottom-banner]") as HTMLElement | null;
      if (banner) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        const rect = banner.getBoundingClientRect();
        setDropIndicator({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width, height: rect.height, zone: "into" });
        return;
      }

      const target = (e.target as HTMLElement)?.closest(CONTAINER_SELECTOR) as HTMLElement | null;
      if (!target) {
        setDropIndicator(null);
        return;
      }
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = e.dataTransfer.types.includes("application/marwa-block-type") ? "copy" : "move";
      const { indicator } = computeChildInsertion(target, e.clientX, e.clientY);
      setDropIndicator(indicator);
    }

    function handleDrop(e: DragEvent) {
      const banner = (e.target as HTMLElement)?.closest("[data-canvas-bottom-banner]") as HTMLElement | null;
      if (banner) {
        setDropIndicator(null);
        e.preventDefault();
        const newBlockType = readNewBlockType(e);
        if (newBlockType) {
          window.parent.postMessage({ source: "marwa-preview", action: "request-insert-block-as-section", blockType: newBlockType }, "*");
        }
        return;
      }

      const target = (e.target as HTMLElement)?.closest(CONTAINER_SELECTOR) as HTMLElement | null;
      setDropIndicator(null);
      if (!target) return;
      e.preventDefault();
      const targetId = target.getAttribute("data-block-id");
      if (!targetId) return;

      const { childIndex } = computeChildInsertion(target, e.clientX, e.clientY);

      const newBlockType = readNewBlockType(e);
      if (newBlockType) {
        window.parent.postMessage(
          { source: "marwa-preview", action: "request-insert-block-at-index", blockType: newBlockType, targetId, childIndex },
          "*"
        );
        return;
      }

      const draggedId = e.dataTransfer?.getData("text/plain");
      if (!draggedId || draggedId === targetId) return;
      window.parent.postMessage(
        { source: "marwa-preview", action: "request-reorder-at-index", nodeId: draggedId, targetId, childIndex },
        "*"
      );
    }


    function handleDragEnd() {
      setDraggingId(null);
      setDropIndicator(null);
    }

    function handleContextMenu(e: MouseEvent) {
      // The bottom-of-canvas "Drag widget here" banner isn't a real block —
      // no data-block-id to anchor to — but a right-click there to Paste a
      // previously-copied block at the end of the page is still a
      // reasonable thing to expect (Elementor/Webflow both support it), so
      // it gets a menu of its own instead of just falling through to no-op.
      const banner = (e.target as HTMLElement)?.closest("[data-canvas-bottom-banner]") as HTMLElement | null;
      if (banner) {
        e.preventDefault();
        setContextMenu({ blockId: null, blockType: "Section", x: e.clientX, y: e.clientY, hasClipboard: hasClipboardRef.current });
        return;
      }

      const target = (e.target as HTMLElement)?.closest("[data-block-id]") as HTMLElement | null;
      if (!target) return;
      e.preventDefault();
      const blockId = target.getAttribute("data-block-id")!;
      window.parent.postMessage({ source: "marwa-preview", action: "select", blockId }, "*");
      setContextMenu({
        blockId,
        blockType: target.getAttribute("data-block-type") ?? "Block",
        x: e.clientX,
        y: e.clientY,
        hasClipboard: hasClipboardRef.current,
      });
    }

    function closeContextMenu() {
      setContextMenu((c) => (c ? null : c));
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") closeContextMenu();
    }

    window.addEventListener("message", handleParentMessage);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseleave", handleLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);
    document.addEventListener("dragend", handleDragEnd);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", closeContextMenu);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", closeContextMenu, true);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    // Tells the admin parent this listener is actually attached and ready
    // to receive "restore-scroll"/"highlight-select" — the parent used to
    // fire those off the iframe's `onLoad` instead, but that DOM `load`
    // event (all sync resources fetched) can and does resolve before this
    // effect has run, especially right after a Save-triggered remount with
    // a cold Turbopack/dev-server compile in the mix. A message sent before
    // this listener exists is just dropped, silently discarding the saved
    // scroll position — which is exactly the "Save jumps back to the top"
    // symptom. Posting a "ready" signal here instead of relying on onLoad
    // timing removes the race entirely.
    window.parent.postMessage({ source: "marwa-preview", action: "ready" }, "*");

    return () => {
      window.removeEventListener("message", handleParentMessage);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseleave", handleLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
      document.removeEventListener("dragend", handleDragEnd);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", closeContextMenu);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", closeContextMenu, true);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isBuilderPreview]);

  // `isBuilderPreview` is the real gate (decided server-side, see above);
  // `embedded` additionally confirms this specific render is actually inside
  // an iframe before showing any interactive chrome.
  if (!isBuilderPreview || !embedded) return null;

  return (
    <>
      {/* Only ever rendered inside the admin builder's iframe (this whole
          component returns null otherwise) — this is what actually makes
          .exr-empty-dropzone visible, overriding its `display:none` default
          in globals.css. Never reaches a real page render. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
.exr-empty-dropzone {
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 100px;
  width: 100%;
  border: 2px dashed rgba(200, 161, 101, 0.4);
  background: rgba(245, 245, 250, 0.03);
  box-sizing: border-box;
  padding: 16px;
}
.exr-empty-dropzone-btn {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: none;
  background: rgba(200, 161, 101, 0.15);
  color: #2563ff;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.exr-empty-dropzone-btn:hover {
  background: #2563ff;
  color: #000;
}
.exr-empty-dropzone-label {
  font-size: 12px;
  color: #a1a1aa;
  font-style: italic;
  pointer-events: none;
}

.exr-canvas-add-banner {
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 140px;
  width: 100%;
  box-sizing: border-box;
  border: 2px dashed rgba(180, 180, 200, 0.4);
  background: rgba(245, 245, 250, 0.05);
  margin-top: 24px;
}
.exr-canvas-add-banner-row {
  display: flex;
  gap: 10px;
  position: relative;
  z-index: 5;
}
.exr-canvas-add-banner-btn {
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  border: none;
  background: rgba(200, 161, 101, 0.15);
  color: #2563ff;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  pointer-events: auto;
  cursor: pointer;
}
.exr-canvas-add-banner-btn:not(:disabled):hover {
  background: #2563ff;
  color: #000;
}
.exr-canvas-add-banner-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.exr-canvas-add-banner-label {
  font-size: 13px;
  font-style: italic;
  color: #8a8a8a;
}`,
        }}
      />

      {(hover || (selectedRect && CONTAINER_TYPES.has(selectedRect.blockType))) && (
        <div
          data-preview-toolbar
          title="Drag to reorder or nest this container"
          draggable
          onDragStart={(e) => {
            const id = hover?.blockId ?? selectedRect!.blockId;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", id);
            setDraggingId(id);
          }}
          style={{
            position: "absolute",
            top: (hover?.topEdge ?? selectedRect!.top) - 9,
            left: (hover?.leftEdge ?? selectedRect!.left) - 9,
            zIndex: 9999,
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#2563ff",
            borderRadius: "4px",
            color: "#000",
            cursor: "grab",
            boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </div>
      )}

      {hover && (
        <div
          data-preview-toolbar
          style={{
            position: "absolute",
            top: hover.topEdge - 13,
            left: hover.leftEdge + hover.width / 2,
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "3px",
            background: "#2563ff",
            borderRadius: "6px 6px 0 0",
            padding: "2px 6px",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.3)",
          }}
        >
          <button
            type="button"
            title="Add section above"
            onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-insert", beforeBlockId: hover.blockId }, "*")}
            style={{ width: 22, height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: "#000", cursor: "pointer", fontSize: 15, fontWeight: "bold", lineHeight: 1 }}
          >
            +
          </button>
          <button
            type="button"
            title="Drag to move section"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", hover.blockId);
              setDraggingId(hover.blockId);
            }}
            style={{
              width: 22,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              color: "#000",
              cursor: "grab",
              fontSize: 13,
              lineHeight: 1,
            }}
          >
            ⠿
          </button>
          <button
            type="button"
            title="Delete section"
            onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-delete", blockId: hover.blockId }, "*")}
            style={{ width: 22, height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", color: "#000", cursor: "pointer", fontSize: 13, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}


      {dropIndicator && (
        <div
          style={{
            position: "absolute",
            top: dropIndicator.top,
            left: dropIndicator.left,
            width: dropIndicator.width,
            // `horizontal` (see computeChildInsertion) is a precomputed
            // exact-position bar — its width/height already carry the real
            // 3px-thin/full-length split directly, unlike the plain
            // before/after/into cases below which derive height from the
            // *whole hovered element's* rect instead of an exact boundary.
            height: dropIndicator.horizontal ? dropIndicator.height : dropIndicator.zone === "into" ? dropIndicator.height : 3,
            marginTop: dropIndicator.zone === "after" ? dropIndicator.height - 3 : 0,
            zIndex: 9998,
            pointerEvents: "none",
            background: dropIndicator.zone === "into" ? "rgba(200,161,101,0.15)" : "#2563ff",
            outline: dropIndicator.zone === "into" ? "2px solid #2563ff" : "none",
            outlineOffset: "-2px",
          }}
        />
      )}

      {draggingId && (
        <style dangerouslySetInnerHTML={{ __html: `[data-block-id="${draggingId}"] { opacity: 0.4; }` }} />
      )}

      {selectedBlockId && (
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-block-id="${selectedBlockId}"] { outline: 2px solid #2563ff !important; outline-offset: -2px; }`,
          }}
        />
      )}

      {selectedRect && (
        <button
          type="button"
          title="Editing this block"
          onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "select", blockId: selectedRect.blockId }, "*")}
          style={{
            position: "absolute",
            top: selectedRect.top + selectedRect.height / 2,
            left: selectedRect.left + selectedRect.width,
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#2563ff",
            border: "none",
            borderRadius: "50%",
            color: "#000",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      )}

      {contextMenu && (
        <div
          data-preview-toolbar
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 10000,
            minWidth: 180,
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            padding: 4,
            fontSize: 13,
            color: "#e4e4e7",
          }}
        >
          {contextMenu.blockId === null ? (
            // The end-of-page banner, not a real block — none of
            // Edit/Duplicate/Copy/Reset Style/Delete have anything to act
            // on, only Paste (append the clipboard block at the end).
            <ContextMenuItem
              label="Paste"
              disabled={!contextMenu.hasClipboard}
              onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-paste", blockId: null }, "*")}
            />
          ) : (
            <>
          <ContextMenuItem
            label={`Edit ${contextMenu.blockType}`}
            onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "select", blockId: contextMenu.blockId }, "*")}
          />
          <ContextMenuItem
            label="Duplicate"
            onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-duplicate", blockId: contextMenu.blockId }, "*")}
          />
          <ContextMenuItem
            label="Copy"
            onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-copy", blockId: contextMenu.blockId }, "*")}
          />
          <ContextMenuItem
            label="Paste"
            disabled={!contextMenu.hasClipboard}
            onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-paste", blockId: contextMenu.blockId }, "*")}
          />
          <ContextMenuItem
            label="Paste Style"
            disabled={!contextMenu.hasClipboard}
            onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-paste-style", blockId: contextMenu.blockId }, "*")}
          />
          <div style={{ height: 1, background: "#3f3f46", margin: "4px 2px" }} />
          <ContextMenuItem
            label="Reset Style"
            onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-reset-style", blockId: contextMenu.blockId }, "*")}
          />
          <div style={{ height: 1, background: "#3f3f46", margin: "4px 2px" }} />
          <ContextMenuItem
            danger
            label="Delete"
            onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-delete", blockId: contextMenu.blockId }, "*")}
          />
            </>
          )}
        </div>
      )}
    </>
  );
}

function ContextMenuItem({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "6px 10px",
        background: "transparent",
        border: "none",
        borderRadius: 5,
        color: disabled ? "#52525b" : danger ? "#f87171" : "#e4e4e7",
        cursor: disabled ? "default" : "pointer",
        fontSize: 13,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "#27272a";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}
