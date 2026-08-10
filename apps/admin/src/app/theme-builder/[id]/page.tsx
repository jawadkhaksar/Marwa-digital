"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { BlockPalette } from "@/components/builder/BlockPalette";
import { OutlineTree, type OutlineTreeActions } from "@/components/builder/OutlineTree";
import { PropertyPanel, BreakpointIcon } from "@/components/builder/PropertyPanel";
import { InsertStructureModal } from "@/components/builder/InsertStructureModal";
import {
  createNode,
  duplicateNode,
  findNode,
  insertNode,
  insertNodeAfter,
  insertNodeAt,
  insertNodeAtIndex,
  pasteNodeAfter,
  reorderNode,
  reorderNodeAtIndex,
  removeNode,
  resetNodeStyle,
  updateNodeAnimations,
  updateNodeProps,
  updateNodeStyle,
  updateNodeName,
} from "@/lib/builder/tree";

import { getBlockDefinition, type LayoutDocument, type LayoutNode, type SiteTemplateType } from "@marwa/builder";
import { api, type SiteTemplate } from "@/lib/api";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
const EMPTY_LAYOUT: LayoutDocument = { version: 1, nodes: [] };

// Kept in sync with theme-builder/page.tsx's PARTS labels — that list is
// "use client" UI state (create buttons, descriptions), this is just the
// short label this editor's own header shows. A hardcoded header/footer
// ternary here used to show the wrong (or blank) text for every other type.
const TEMPLATE_TYPE_LABELS: Record<SiteTemplateType, string> = {
  header: "Header",
  footer: "Footer",
  blog_archive_extra: "Blog Archive — Extra Section",
  blog_post_cta: "Blog Post — CTA Banner",
  blog_single: "Blog — Single Post",
  blog_loop_item: "Blog — Loop Item (Card)",
};

const PREVIEW_WIDTHS: Record<"desktop" | "tablet" | "mobile", string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

// Only for blog_loop_item templates (see the "Card" toggle below, shown
// only for that type) — a single card at roughly its real in-grid width,
// instead of the full-bleed page-width iframe every other template type
// gets. Deliberately NOT folded into PREVIEW_WIDTHS/previewBreakpoint —
// that state is shared with PropertyPanel's own Tablet/Mobile *style*
// breakpoint selector (an unrelated concept: which responsive override is
// being edited, not how wide the live-preview iframe is), so this is a
// fully independent toggle instead of a 4th breakpoint value. There's no
// way to preview actual grid repetition here (that depends on whichever
// Posts block ends up using this card, not the card design itself), but
// seeing it alone at real proportions is still far more useful for
// reviewing spacing/sizing than a full-width iframe would be.
const CARD_PREVIEW_WIDTH = "380px";

const MAX_HISTORY = 50;
const UNDO_BURST_GROUP_MS = 800;

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

export default function ThemeTemplateEditorPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <TemplateEditorContent />
      </div>
    </AuthGuard>
  );
}

function TemplateEditorContent() {
  const params = useParams<{ id: string }>();
  const templateId = params.id;

  const [template, setTemplate] = useState<SiteTemplate | null>(null);
  const [doc, setDoc] = useState<LayoutDocument>(EMPTY_LAYOUT);
  const [title, setTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewBreakpoint, setPreviewBreakpoint] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [cardPreview, setCardPreview] = useState(true);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const [showOutline, setShowOutline] = useState(false);
  const [undoStack, setUndoStack] = useState<LayoutDocument[]>([]);
  const [redoStack, setRedoStack] = useState<LayoutDocument[]>([]);

  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const docRef = useRef(doc);
  const templateRef = useRef(template);
  const pendingScrollRef = useRef<number | null>(null);
  const burstResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstActiveRef = useRef(false);
  useEffect(() => {
    docRef.current = doc;
    templateRef.current = template;
  }, [doc, template]);

  useEffect(() => {
    api
      .getSiteTemplate(templateId)
      .then((t) => {
        setTemplate(t);
        setTitle(t.title);
        setDoc(t.layout ?? EMPTY_LAYOUT);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load template"));
  }, [templateId]);

  function persist(next: LayoutDocument, extra?: Partial<{ title: string }>) {
    const current = templateRef.current;
    if (!current) return;
    previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "request-scroll-report" }, WEB_URL);
    setSaving(true);
    api
      .updateSiteTemplate(current.id, { layout: next, ...extra })
      .then((updated) => {
        setTemplate(updated);
        setSaved(true);
        setPreviewNonce((n) => n + 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to save template"))
      .finally(() => setSaving(false));
  }

  // Same manual-save-only model as the main page builder
  // (apps/admin/src/app/builder/[pageId]/page.tsx) — Content/Style edits
  // only touch local state until Save is clicked; structural edits driven
  // from the canvas (insert/delete/duplicate/reorder/paste) persist right
  // away since the canvas is a separate app and can only show them once the
  // preview iframe reloads. Undo/redo history is recorded the same way too:
  // one checkpoint per burst of rapid related edits.
  function updateDoc(updater: (d: LayoutDocument) => LayoutDocument, opts?: { immediate?: boolean }) {
    const current = docRef.current;
    const next = updater(current);

    if (opts?.immediate || !burstActiveRef.current) {
      setUndoStack((stack) => [...stack.slice(-(MAX_HISTORY - 1)), current]);
      setRedoStack([]);
    }

    setDoc(next);
    setSaved(false);

    if (burstResetTimerRef.current) clearTimeout(burstResetTimerRef.current);
    if (opts?.immediate) {
      burstActiveRef.current = false;
      persist(next);
    } else {
      burstActiveRef.current = true;
      burstResetTimerRef.current = setTimeout(() => {
        burstActiveRef.current = false;
      }, UNDO_BURST_GROUP_MS);
    }
  }

  function handleUndo() {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setRedoStack((r) => [...r, docRef.current]);
      setDoc(previous);
      setSaved(false);
      if (burstResetTimerRef.current) clearTimeout(burstResetTimerRef.current);
      burstActiveRef.current = false;
      persist(previous);
      return stack.slice(0, -1);
    });
  }

  function handleRedo() {
    setRedoStack((stack) => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      setUndoStack((u) => [...u, docRef.current]);
      setDoc(next);
      setSaved(false);
      if (burstResetTimerRef.current) clearTimeout(burstResetTimerRef.current);
      burstActiveRef.current = false;
      persist(next);
      return stack.slice(0, -1);
    });
  }

  // Skipped while focus is in a text field so native text-undo keeps working
  // instead of being hijacked by the builder — same as the main page builder.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) handleRedo();
      else handleUndo();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSave() {
    if (burstResetTimerRef.current) clearTimeout(burstResetTimerRef.current);
    burstActiveRef.current = false;
    setError(null);
    persist(doc, { title });
  }

  useEffect(() => {
    previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "highlight-select", blockId: selectedId }, WEB_URL);
  }, [selectedId]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.origin !== WEB_URL) return;
      if (e.data?.source !== "marwa-preview") return;
      const { action } = e.data;
      if (action === "select" && typeof e.data.blockId === "string") {
        setSelectedId(e.data.blockId);
      } else if (action === "scroll-report" && typeof e.data.scrollY === "number") {
        pendingScrollRef.current = e.data.scrollY;
      } else if (action === "request-insert" && typeof e.data.afterBlockId === "string") {
        setInsertAfterId(e.data.afterBlockId);
      } else if (action === "request-delete" && typeof e.data.blockId === "string") {
        updateDoc((d) => removeNode(d, e.data.blockId), { immediate: true });
        setSelectedId((id) => (id === e.data.blockId ? null : id));
      } else if (action === "request-duplicate" && typeof e.data.blockId === "string") {
        updateDoc((d) => duplicateNode(d, e.data.blockId), { immediate: true });
      } else if (action === "request-reset-style" && typeof e.data.blockId === "string") {
        updateDoc((d) => resetNodeStyle(d, e.data.blockId), { immediate: true });
      } else if (action === "request-copy" && typeof e.data.blockId === "string") {
        const located = findNode(docRef.current, e.data.blockId);
        if (located) {
          try {
            localStorage.setItem("marwa-builder-clipboard", JSON.stringify(located.node));
            // The context menu that shows "Paste"/"Paste Style" lives inside
            // the preview iframe (PreviewBridge.tsx) — a different origin
            // (apps/web's own port) than this admin page, so its localStorage
            // is a completely separate store from the one just written above.
            // Tell it directly instead of letting it check its own (always
            // empty) localStorage — that mismatch is why Paste/Paste Style
            // stayed permanently disabled regardless of what was copied.
            previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "clipboard-state", hasClipboard: true }, WEB_URL);
          } catch {
            // localStorage can throw in private-browsing/storage-full edge cases.
          }
        }
      } else if (action === "request-paste" && typeof e.data.blockId === "string") {
        try {
          const raw = localStorage.getItem("marwa-builder-clipboard");
          if (raw) {
            const clipboardNode = JSON.parse(raw) as LayoutNode;
            updateDoc((d) => pasteNodeAfter(d, clipboardNode, e.data.blockId), { immediate: true });
          }
        } catch {
          // Malformed/foreign clipboard content — ignore rather than throw.
        }
      } else if (action === "request-paste-style" && typeof e.data.blockId === "string") {
        try {
          const raw = localStorage.getItem("marwa-builder-clipboard");
          if (raw) {
            const clipboardNode = JSON.parse(raw) as LayoutNode;
            if (clipboardNode.style) {
              const targetId = e.data.blockId;
              updateDoc((d) => updateNodeStyle(d, targetId, clipboardNode.style!), { immediate: true });
            }
          }
        } catch {
          // Malformed/foreign clipboard content — ignore rather than throw.
        }
      } else if (
        action === "request-reorder" &&
        typeof e.data.nodeId === "string" &&
        typeof e.data.targetId === "string" &&
        (e.data.position === "before" || e.data.position === "after" || e.data.position === "into")
      ) {
        updateDoc((d) => reorderNode(d, e.data.nodeId, e.data.targetId, e.data.position), { immediate: true });
      } else if (
        action === "request-reorder-at-index" &&
        typeof e.data.nodeId === "string" &&
        typeof e.data.targetId === "string" &&
        typeof e.data.childIndex === "number"
      ) {
        updateDoc((d) => reorderNodeAtIndex(d, e.data.nodeId, e.data.targetId, e.data.childIndex), { immediate: true });
      } else if (action === "request-insert-structure") {
        // Same column-preset picker the hover "+" opens (see
        // handleInsertStructure below) — "__root__" tells it to append at
        // the document root instead of inserting after a specific block.
        setInsertAfterId("__root__");
      } else if (
        action === "request-insert-block" &&
        typeof e.data.blockType === "string" &&
        typeof e.data.targetId === "string" &&
        (e.data.position === "before" || e.data.position === "after" || e.data.position === "into")
      ) {
        const definition = getBlockDefinition(e.data.blockType);
        if (definition) {
          const node = createNode(e.data.blockType, { ...definition.defaultProps });
          updateDoc((d) => insertNodeAt(d, node, e.data.targetId, e.data.position), { immediate: true });
          setSelectedId(node.id);
        }
      } else if (
        action === "request-insert-block-at-index" &&
        typeof e.data.blockType === "string" &&
        typeof e.data.targetId === "string" &&
        typeof e.data.childIndex === "number"
      ) {
        const definition = getBlockDefinition(e.data.blockType);
        if (definition) {
          const node = createNode(e.data.blockType, { ...definition.defaultProps });
          updateDoc((d) => insertNodeAtIndex(d, node, e.data.targetId, e.data.childIndex), { immediate: true });
          setSelectedId(node.id);
        }
      }
 else if (action === "request-insert-block-as-section" && typeof e.data.blockType === "string") {
        // The bottom-of-canvas banner's dropzone — the widget being dropped
        // isn't itself a container, so it needs a new Section to live in
        // (matching how every other top-level page block is a Section),
        // appended at the very end of the document.
        const definition = getBlockDefinition(e.data.blockType);
        const sectionDef = getBlockDefinition("Section");
        if (definition && sectionDef) {
          const widgetNode = createNode(e.data.blockType, { ...definition.defaultProps });
          const sectionNode = createNode("Section", { ...sectionDef.defaultProps, direction: "column", contentWidth: "boxed" });
          sectionNode.children = [widgetNode];
          updateDoc((d) => insertNode(d, sectionNode, null), { immediate: true });
          setSelectedId(widgetNode.id);
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (saved) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saved]);

  function handleInsertStructure(layoutMode: "flex" | "grid", columnCount: number) {
    if (!insertAfterId) return;
    const sectionDef = getBlockDefinition("Section");
    if (!sectionDef) return;

    // contentWidth:"full" is what makes each column equal-width/equal-share
    // in flex mode — Section's own render (blockComponents.tsx) turns that
    // into `flex:1 1 0` automatically, with no Custom CSS needed. Switching
    // a column to "boxed" + an explicit Width later (in the panel, at any
    // breakpoint) becomes that column's exact flex-basis the same way.
    const columns: LayoutNode[] = Array.from({ length: columnCount }, () =>
      createNode("Section", { ...sectionDef.defaultProps, direction: "column", contentWidth: "full", width: "100%" })
    );

    const parent = createNode("Section", {
      ...sectionDef.defaultProps,
      layoutMode,
      direction: layoutMode === "flex" ? "row" : "column",
      wrap: "wrap",
      gap: "20px",
      contentWidth: "boxed",
    });
    parent.children = columns;
    if (layoutMode === "grid") parent.style = { customCss: `selector { grid-template-columns: repeat(${columnCount}, minmax(0, 1fr)); }` };

    updateDoc((d) => (insertAfterId === "__root__" ? insertNode(d, parent, null) : insertNodeAfter(d, parent, insertAfterId)), { immediate: true });
    setSelectedId(parent.id);
    setInsertAfterId(null);
  }

  function insertBlock(blockType: string) {
    const definition = getBlockDefinition(blockType);
    if (!definition) return;
    const node = createNode(blockType, { ...definition.defaultProps });
    const selected = selectedId ? findNode(doc, selectedId) : null;
    const targetParentId = selected && getBlockDefinition(selected.node.type)?.isContainer ? selected.node.id : null;
    updateDoc((d) => insertNode(d, node, targetParentId), { immediate: true });
    setSelectedId(node.id);
  }

  const actions: OutlineTreeActions = {
    onSelect: setSelectedId,
    onReorder: (nodeId, targetId, position) => updateDoc((d) => reorderNode(d, nodeId, targetId, position), { immediate: true }),
    onDuplicate: (nodeId) => updateDoc((d) => duplicateNode(d, nodeId), { immediate: true }),
    onDelete: (nodeId) => {
      updateDoc((d) => removeNode(d, nodeId), { immediate: true });
      if (selectedId === nodeId) setSelectedId(null);
    },
    onCopy: (nodeId) => {
      const located = findNode(docRef.current, nodeId);
      if (!located) return;
      try {
        localStorage.setItem("marwa-builder-clipboard", JSON.stringify(located.node));
        previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "clipboard-state", hasClipboard: true }, WEB_URL);
      } catch {
        // localStorage can throw in private-browsing/storage-full edge cases.
      }
    },
    onPaste: (nodeId) => {
      try {
        const raw = localStorage.getItem("marwa-builder-clipboard");
        if (raw) {
          const clipboardNode = JSON.parse(raw) as LayoutNode;
          updateDoc((d) => pasteNodeAfter(d, clipboardNode, nodeId), { immediate: true });
        }
      } catch {
        // Malformed/foreign clipboard content — ignore rather than throw.
      }
    },
    onRename: (nodeId, name) => {
      updateDoc((d) => updateNodeName(d, nodeId, name), { immediate: true });
    },
    onSelectParent: (nodeId) => {
      const parentId = findNode(docRef.current, nodeId)?.parentId;
      if (parentId) setSelectedId(parentId);
    },
  };

  if (error && !template) return <p className="p-8 text-sm text-red-400">{error}</p>;
  if (!template) return <p className="p-8 text-sm text-zinc-500">Loading…</p>;

  const selectedNode = selectedId ? findNode(doc, selectedId)?.node ?? null : null;

  return (
    <div className="flex h-screen flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/theme-builder"
            title="Exit to Theme Builder"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            ←
          </Link>
          <div>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
              className="rounded-lg border border-transparent bg-transparent px-1 text-xl font-semibold hover:border-zinc-700 focus:border-zinc-700 focus:outline-none"
            />
            <p className="px-1 text-xs text-zinc-500">{TEMPLATE_TYPE_LABELS[template.type] ?? template.type} Template</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 rounded-lg border border-zinc-700 p-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Shift+Z)"
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ↷
            </button>
          </div>
          <div className="flex rounded-lg border border-zinc-700 p-0.5">
            {(["desktop", "tablet", "mobile"] as const).map((bp) => (
              <button
                key={bp}
                type="button"
                onClick={() => {
                  setPreviewBreakpoint(bp);
                  setCardPreview(false);
                }}
                title={bp}
                className={`flex items-center justify-center rounded px-2.5 py-1.5 text-xs ${!cardPreview && previewBreakpoint === bp ? "bg-amber-400 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                <BreakpointIcon value={bp} />
              </button>
            ))}
            {/* "Design one card" mode: a blog_loop_item's own real proportions
                (~380px) rather than a full-bleed page-width iframe — see
                CARD_PREVIEW_WIDTH's own comment for why this is a separate
                toggle instead of a 4th previewBreakpoint value. */}
            {template?.type === "blog_loop_item" && (
              <button
                type="button"
                onClick={() => setCardPreview(true)}
                title="Card (design-one-card preview)"
                className={`flex items-center justify-center rounded px-2.5 py-1.5 text-[11px] font-semibold ${cardPreview ? "bg-amber-400 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                Card
              </button>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOutline((s) => !s)}
              title="Structure"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border ${showOutline ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
            >
              <LayersIcon />
            </button>
            {showOutline && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 flex max-h-[70vh] w-72 flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
                    <LayersIcon /> Structure
                  </span>
                  <button type="button" onClick={() => setShowOutline(false)} className="text-zinc-400 hover:text-white">
                    ✕
                  </button>
                </div>
                <div className="overflow-y-auto overflow-x-hidden p-3">
                  <OutlineTree nodes={doc.nodes} selectedId={selectedId} actions={actions} />
                </div>
              </div>
            )}
          </div>
          {saved && <span className="text-xs text-emerald-400">Saved</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <a
            href={`${WEB_URL}/preview/template/${template.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            Open in New Tab
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-[260px_1fr_300px] gap-4 overflow-hidden">
        <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <BlockPalette onInsert={insertBlock} />
        </div>
        <div className="canvas-container no-scrollbar flex items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <iframe
            ref={previewFrameRef}
            key={previewNonce}
            // See the matching comment in apps/admin's page-builder — this
            // marker is what PreviewBridge requires before showing any
            // visible editor chrome, so a stray third-party iframe wrapper
            // can never trigger it.
            src={`${WEB_URL}/preview/template/${template.id}?__builder_preview=1`}
            title="Live preview"
            className="h-full rounded-lg border border-zinc-800 bg-white transition-[width] duration-200 no-scrollbar"
            style={{ width: template.type === "blog_loop_item" && cardPreview ? CARD_PREVIEW_WIDTH : PREVIEW_WIDTHS[previewBreakpoint], border: "none", outline: "none" }}

            onLoad={() => {
              previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "highlight-select", blockId: selectedId }, WEB_URL);
              if (pendingScrollRef.current !== null) {
                previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "restore-scroll", scrollY: pendingScrollRef.current }, WEB_URL);
                pendingScrollRef.current = null;
              }
              // Seeds the iframe's Paste/Paste Style enabled-state on every
              // fresh mount (a Save-triggered reload included) — without
              // this, copying a block then saving would strand the iframe
              // thinking the clipboard is empty until the next copy.
              let hasClipboard = false;
              try {
                hasClipboard = Boolean(localStorage.getItem("marwa-builder-clipboard"));
              } catch {
                // Private-browsing/storage-disabled — treat as "nothing to paste".
              }
              previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "clipboard-state", hasClipboard }, WEB_URL);
            }}
          />
        </div>
        <div className="overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <PropertyPanel
            node={selectedNode}
            breakpoint={previewBreakpoint}
            onBreakpointChange={setPreviewBreakpoint}
            onChangeProps={(props) => {
              if (!selectedId) return;
              updateDoc((d) => updateNodeProps(d, selectedId, props));
            }}
            onChangeStyle={(style) => {
              if (!selectedId) return;
              updateDoc((d) => updateNodeStyle(d, selectedId, style));
            }}
            onChangeAnimations={(animations) => {
              if (!selectedId) return;
              updateDoc((d) => updateNodeAnimations(d, selectedId, animations), { immediate: true });
            }}
          />
        </div>
      </div>

      <InsertStructureModal open={insertAfterId !== null} onClose={() => setInsertAfterId(null)} onConfirm={handleInsertStructure} />
    </div>
  );
}
