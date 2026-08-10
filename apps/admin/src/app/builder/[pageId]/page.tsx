"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Plus } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { RevisionHistoryModal } from "@/components/RevisionHistoryModal";
import { AIAssistToolbar } from "@/components/builder/AIAssistToolbar";
import { PublishStatusControls } from "@/components/builder/PublishStatusControls";
import { BlockPalette } from "@/components/builder/BlockPalette";
import { OutlineTree, type OutlineTreeActions } from "@/components/builder/OutlineTree";
import { PropertyPanel, BreakpointIcon } from "@/components/builder/PropertyPanel";
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
  removeNodeTimelineAt,
  resetNodeStyle,
  updateNodeAnimations,
  updateNodeProps,
  updateNodeStyle,
  updateNodeClassIds,
  updateNodeName,
  updateNodeTimeline,
} from "@/lib/builder/tree";

import { getBlockDefinition, type LayoutDocument, type LayoutNode } from "@marwa/builder";
import { api, type Page } from "@/lib/api";
import { InsertStructureModal } from "@/components/builder/InsertStructureModal";
import { AnimationTimelineEditor, TOTAL_DURATION } from "@/components/builder/AnimationTimelineEditor";
import { ALL_PROPERTIES, type GsapEasing, type LayerTrack, type PropertyTrack } from "@/components/builder/timelineTypes";
import { blockTimelineToLayer, layerToBlockTimeline } from "@/components/builder/timelineUtils";

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
const EMPTY_LAYOUT: LayoutDocument = { version: 1, nodes: [] };

export default function BuilderPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-950 text-zinc-100">
        <BuilderContent />
      </div>
    </AuthGuard>
  );
}

function BuilderContent() {
  const params = useParams<{ pageId: string }>();
  const pageId = params.pageId;

  if (pageId === "new") return <CreatePageForm />;
  return <PageEditor pageId={pageId} />;
}

function slugifyTitle(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "page";
}

function CreatePageForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const finalSlug = slug.trim() || slugifyTitle(title);
      const page = await api.createPage({ title, slug: finalSlug, editorMode: "BUILDER", layout: EMPTY_LAYOUT });
      router.replace(`/builder/${page.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create page");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md p-8">
      <Link href="/pages" className="mb-4 inline-block text-xs text-zinc-500 hover:text-zinc-300">
        ← Back to Pages
      </Link>
      <h1 className="text-2xl font-semibold">New Builder Page</h1>
      <p className="mt-1 text-sm text-zinc-300">Block-based visual page — content is added on the next screen.</p>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Page Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">URL Slug</label>
          <input
            type="text"
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="Leave blank to generate from the title"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-zinc-500">{WEB_URL}/{slug.trim() || (title ? slugifyTitle(title) : "…")}</p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-fit rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create & Open Builder"}
        </button>
      </form>
    </div>
  );
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

const MAX_HISTORY = 50;
// Not an auto-save delay (auto-save was removed — the user explicitly asked
// for manual-Save-only, since a debounced persist was reloading the preview
// iframe mid-edit and resetting scroll position). Purely a grouping window
// for undo checkpoints: rapid edits to the same field within this window
// share one checkpoint, so Ctrl+Z reverts "the last thing you were doing"
// instead of one keystroke/slider-tick at a time.
const UNDO_BURST_GROUP_MS = 800;

function pkf(id: string, time: number, value: number, ease: GsapEasing) {
  return { id, time, value, easingOut: ease, easingIn: ease, interpolation: "smooth" as const };
}

function bindDocNodesToTimelineLayers(doc: LayoutDocument): LayerTrack[] {
  const flatNodes: LayoutNode[] = [];
  function collect(nodes: LayoutNode[]) {
    for (const node of nodes) {
      flatNodes.push(node);
      if (node.children && node.children.length > 0) {
        collect(node.children);
      }
    }
  }
  collect(doc.nodes);

  if (flatNodes.length === 0) return [];

  function dkf(time: number, value: number, ease: GsapEasing) {
    return { id: Math.random().toString(36).slice(2, 9), time, value, easingOut: ease, easingIn: ease, interpolation: "smooth" as const };
  }

  const colors = ["#2563ff", "#4ade80", "#60a5fa", "#fbbf24", "#f87171", "#a3e635", "#e879f9"];
  const emojis: Record<string, string> = {
    Heading: "🔤",
    Button: "🔘",
    Image: "🖼️",
    Section: "📦",
    RichText: "📝",
    CarouselContainer: "🎠",
    ImageCard: "🎴",
    Columns: "📊",
  };

  return flatNodes.slice(0, 6).map((node, index) => {
    const rawText = node.props.title || node.props.text || node.props.label || node.type;
    const nameStr = typeof rawText === "string" ? `${node.type}: ${rawText.slice(0, 20)}` : node.type;
    const color = colors[index % colors.length];
    const emoji = emojis[node.type] || "📦";

    let tracks: PropertyTrack[] = ALL_PROPERTIES.map((property) => ({
      id: Math.random().toString(36).slice(2, 9),
      property,
      keyframes: [],
    }));

    if (index === 0) {
      tracks = ALL_PROPERTIES.map((property) => ({
        id: Math.random().toString(36).slice(2, 9),
        property,
        keyframes:
          property === "opacity"
            ? [dkf(0, 0, "power2.inOut"), dkf(1.2, 1, "linear")]
            : property === "y"
              ? [dkf(0, 50, "power3.out"), dkf(1.8, 0, "linear")]
              : [],
      }));
    } else if (index === 1) {
      tracks = ALL_PROPERTIES.map((property) => ({
        id: Math.random().toString(36).slice(2, 9),
        property,
        keyframes:
          property === "x"
            ? [dkf(0.3, -70, "power2.inOut"), dkf(2.2, 0, "linear")]
            : property === "opacity"
              ? [dkf(0.3, 0, "linear"), dkf(1.5, 1, "linear")]
              : [],
      }));
    } else if (index === 2) {
      tracks = ALL_PROPERTIES.map((property) => ({
        id: Math.random().toString(36).slice(2, 9),
        property,
        keyframes:
          property === "scale"
            ? [dkf(0.6, 0.75, "back.out"), dkf(2.4, 1, "linear")]
            : [],
      }));
    } else if (index === 3) {
      tracks = ALL_PROPERTIES.map((property) => ({
        id: Math.random().toString(36).slice(2, 9),
        property,
        keyframes:
          property === "rotate"
            ? [dkf(0.8, -10, "power1.out"), dkf(2.6, 0, "bounce.out")]
            : [],
      }));
    }

    return {
      id: node.id,
      name: nameStr,
      color,
      emoji,
      visible: true,
      locked: false,
      expanded: index < 2,
      cssVarTracks: [],
      clipPathTracks: [],
      clips: [{ id: Math.random().toString(36).slice(2, 9), start: index * 0.3, end: index * 0.3 + 2.5, label: "Entrance Anim" }],
      tracks,
      trigger: { mode: "onMount" as const },
    };
  });
}

function createItineraryTemplateNode(): LayoutNode {
  const sectionDef = getBlockDefinition("Section");
  const richTextDef = getBlockDefinition("RichText");
  const carId = "car-layer";

  const headerNode = createNode("RichText", {
    ...(richTextDef?.defaultProps ?? {}),
    html: `
<div style="text-align: center; margin-bottom: 40px;">
  <div style="color: #2563ff; font-size: 13px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 10px;">A CLEAR PATH FROM FIRST CALL TO LAUNCH</div>
  <h2 style="font-size: 36px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff; margin: 0;">INTERACTIVE PROJECT TIMELINE</h2>
</div>
`,
  });

  const svgNode = createNode("RichText", {
    ...(richTextDef?.defaultProps ?? {}),
    html: `
<div style="position: relative; max-width: 900px; margin: 0 auto; min-height: 900px;">
  <!-- S-Road SVG with dashed center line -->
  <svg viewBox="0 0 500 1000" style="width:100%; height:auto; overflow:visible; display:block;">
    <!-- Road Surface -->
    <path id="road-path" d="M 240 40 C 240 40 460 40 460 180 C 460 320 100 350 100 480 C 100 610 460 640 460 770 C 460 900 180 920 180 1000" fill="none" stroke="#222222" stroke-width="64" stroke-linecap="round" />
    <!-- Dashed Center Line -->
    <path d="M 240 40 C 240 40 460 40 460 180 C 460 320 100 350 100 480 C 100 610 460 640 460 770 C 460 900 180 920 180 1000" fill="none" stroke="#ffffff" stroke-width="6" stroke-dasharray="16,14" stroke-linecap="round" opacity="0.8" />
    
    <!-- Top-Down Luxury Car Graphic -->
    <g id="car-element" data-block-id="${carId}">
      <rect x="-18" y="-36" width="36" height="72" rx="10" fill="#111111" />
      <rect x="-12" y="-28" width="24" height="16" rx="4" fill="rgba(255,255,255,0.1)" />
      <rect x="-12" y="14" width="24" height="12" rx="3" fill="rgba(255,255,255,0.08)" />
      <rect x="-11" y="-10" width="22" height="20" rx="3" fill="#1a1a1a" />
      <ellipse cx="-10" cy="-33" rx="4" ry="2.5" fill="#2563ff" opacity="0.9" />
      <ellipse cx="10" cy="-33" rx="4" ry="2.5" fill="#2563ff" opacity="0.9" />
      <rect x="-16" y="29" width="8" height="4" rx="1" fill="#ef4444" opacity="0.7" />
      <rect x="8" y="29" width="8" height="4" rx="1" fill="#ef4444" opacity="0.7" />
      <rect x="-22" y="-30" width="8" height="14" rx="3" fill="#1e1e1e" stroke="#333" stroke-width="1" />
      <rect x="14" y="-30" width="8" height="14" rx="3" fill="#1e1e1e" stroke="#333" stroke-width="1" />
      <rect x="-22" y="18" width="8" height="14" rx="3" fill="#1e1e1e" stroke="#333" stroke-width="1" />
      <rect x="14" y="18" width="8" height="14" rx="3" fill="#1e1e1e" stroke="#333" stroke-width="1" />
    </g>
  </svg>

  <!-- Stop 1 -->
  <div style="position: absolute; top: 8%; left: 0%; width: 260px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(37, 99, 255, 0.3); border-radius: 12px; padding: 16px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
    <div style="font-size: 12px; font-weight: 700; color: #2563ff; margin-bottom: 4px;">STEP 1 –</div>
    <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px; line-height: 1.3;">Kickoff Call</div>
    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); line-height: 1.5;">A working session to map your goals, audience, and scope.</div>
  </div>

  <!-- Stop 2 -->
  <div style="position: absolute; top: 26%; right: 0%; width: 260px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(37, 99, 255, 0.3); border-radius: 12px; padding: 16px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
    <div style="font-size: 12px; font-weight: 700; color: #2563ff; margin-bottom: 4px;">STEP 2 –</div>
    <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px; line-height: 1.3;">Discovery & Research</div>
    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); line-height: 1.5;">We dig into your market, your users, and what's already working (or not).</div>
  </div>

  <!-- Stop 3 -->
  <div style="position: absolute; top: 48%; left: 0%; width: 260px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(37, 99, 255, 0.3); border-radius: 12px; padding: 16px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
    <div style="font-size: 12px; font-weight: 700; color: #2563ff; margin-bottom: 4px;">STEP 3 –</div>
    <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px; line-height: 1.3;">Design & Prototype</div>
    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); line-height: 1.5;">Wireframes and visual design come together into a clickable prototype.</div>
  </div>

  <!-- Stop 4 -->
  <div style="position: absolute; top: 70%; right: 0%; width: 260px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(37, 99, 255, 0.3); border-radius: 12px; padding: 16px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
    <div style="font-size: 12px; font-weight: 700; color: #2563ff; margin-bottom: 4px;">STEP 4 –</div>
    <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px; line-height: 1.3;">Build & Review</div>
    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); line-height: 1.5;">Development turns the approved design into a real, working product.</div>
  </div>

  <!-- Stop 5 -->
  <div style="position: absolute; top: 88%; left: 0%; width: 260px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(37, 99, 255, 0.3); border-radius: 12px; padding: 16px; backdrop-filter: blur(10px); box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
    <div style="font-size: 12px; font-weight: 700; color: #2563ff; margin-bottom: 4px;">STEP 5 –</div>
    <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-bottom: 6px; line-height: 1.3;">Launch & Handoff</div>
    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.6); line-height: 1.5;">We ship, test in the wild, and hand off with everything you need to run it.</div>
  </div>
</div>
`,
  });

  const parent = createNode("Section", {
    ...(sectionDef?.defaultProps ?? {}),
    contentWidth: "boxed",
    paddingTop: "60px",
    paddingBottom: "80px",
    background: "#0a0a0a",
  });
  parent.children = [headerNode, svgNode];
  return parent;
}

function PageEditor({ pageId }: { pageId: string }) {
  const [page, setPage] = useState<Page | null>(null);
  const [doc, setDoc] = useState<LayoutDocument>(EMPTY_LAYOUT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [leftPanelTab, setLeftPanelTab] = useState<"widgets" | "style">("widgets");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1280);


  function selectBlock(id: string | null) {
    setSelectedId(id);
    if (id) {
      setLeftPanelTab("style");
    }
  }

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setCanvasWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [page, leftPanelCollapsed]);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [converting, setConverting] = useState(false);
  const [previewBreakpoint, setPreviewBreakpoint] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewNonce, setPreviewNonce] = useState(0);
  const [insertAfterId, setInsertAfterId] = useState<string | null>(null);
  const [showOutline, setShowOutline] = useState(false);
  const outlinePanelRef = useRef<HTMLDivElement | null>(null);
  const [showTimelineDrawer, setShowTimelineDrawer] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);

  // Which entry of node.timelines[] is currently loaded into the drawer's
  // matching LayerTrack, per node — a node can legally hold multiple
  // BlockTimeline entries (e.g. an onMount entrance plus a separate onHover
  // lift authored on the same block), but the drawer only ever edits one at
  // a time. See buildLayerForNode/handleSwitchTimeline below.
  const [activeTimelineIndex, setActiveTimelineIndex] = useState<Record<string, number>>({});
  // Starts empty — real layers are appended lazily, one per node, via
  // handleOpenTimelineDrawer/buildLayerForNode below. This used to seed with
  // three hardcoded demo layers ("Hero Section"/"Jenny (Chauffeur)"/"Gold Ray
  // Badge", ids "block-hero"/"block-jenny"/"block-sun") left over from an
  // early prototype — none of those ids ever matched a real node, so clicking
  // one of those rows called onSelectLayer -> setSelectedId("block-hero"),
  // pointing the whole app's selection at a node that doesn't exist and
  // silently dropping whatever real block/section was actually selected.
  const [timelineLayers, setTimelineLayers] = useState<LayerTrack[]>([]);
  const [undoStack, setUndoStack] = useState<LayoutDocument[]>([]);
  const [redoStack, setRedoStack] = useState<LayoutDocument[]>([]);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const docRef = useRef(doc);
  const pageRef = useRef(page);
  const selectedIdRef = useRef(selectedId);
  const activeTimelineIndexRef = useRef(activeTimelineIndex);
  useEffect(() => {
    docRef.current = doc;
    pageRef.current = page;
    selectedIdRef.current = selectedId;
    activeTimelineIndexRef.current = activeTimelineIndex;
  }, [doc, page, selectedId, activeTimelineIndex]);
  const burstResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True while a burst of rapid, related edits (typing in a text field,
  // dragging a color/slider control) is in flight — only the *first* edit
  // of a burst gets its own undo checkpoint, so Ctrl+Z reverts "the last
  // thing you were doing" instead of one keystroke/slider-tick at a time.
  const burstActiveRef = useRef(false);
  // Scroll position captured from the preview iframe right before a save —
  // restored once the reloaded iframe finishes loading, so a Save (or a
  // structural edit like drag-reorder) doesn't visually yank the canvas back
  // to the top. See the `request-scroll-report`/`restore-scroll` messages in
  // apps/web/src/components/builder/PreviewBridge.tsx.
  const pendingScrollRef = useRef<number | null>(null);

  function persist(next: LayoutDocument) {
    const currentPage = pageRef.current;
    if (!currentPage) return;
    previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "request-scroll-report" }, WEB_URL);
    setSaving(true);
    api
      .updatePage(currentPage.id, { layout: next })
      .then(() => {
        setSaved(true);
        // Bumping the iframe's `key` remounts it, forcing a fresh fetch of
        // what was just saved — see the note above the iframe itself for
        // why this is the only way the preview ever reflects new content.
        setPreviewNonce((n) => n + 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to save layout"))
      .finally(() => setSaving(false));
  }

  /**
   * The single path every edit (props, style, animations, insert, delete,
   * duplicate, reorder) goes through, replacing what used to be 6+ separate
   * `setDoc(...); setSaved(false);` call sites scattered across this file.
   * Content/Style-tab edits (`opts?.immediate` unset) only update local state
   * — no auto-save, no preview reload — per explicit request: a debounced
   * auto-persist was reloading the live-preview iframe mid-edit and jumping
   * the canvas back to its first section. Structural edits driven directly
   * from the canvas (insert/delete/duplicate/reorder/paste, always passed
   * `{immediate:true}`) still persist right away, since those interactions
   * are only visible at all once the iframe (a separate app rendering the
   * saved page) reloads. The manual Save button is the only way Content/
   * Style edits reach the database and the live preview.
   */
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

  // Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z (or Ctrl+Y) — skipped while focus is in a
  // text field so native text-undo (or Tiptap's own undo in RichTextEditor)
  // keeps working as expected instead of being hijacked by the builder.
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

  // Now that Content/Style edits are manual-save-only (no more debounced
  // auto-persist), closing the tab or navigating away mid-edit would
  // silently discard unsaved work without this.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (saved) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saved]);

  // The Structure/Outline flyout (`showOutline`) is `position: absolute`
  // with no backdrop, floating over the canvas below its toolbar trigger —
  // it had no way to close itself except its own ✕ button, so leaving it
  // open while working silently ate any click that landed in the region of
  // the canvas/iframe it happened to be covering (reported as the Grid
  // Layout icon and canvas buttons being "unresponsive" — they were fine,
  // this panel was just sitting on top of them, invisible to the iframe's
  // own event handling since it's a separate document).
  useEffect(() => {
    if (!showOutline) return;
    function handleClickOutside(e: MouseEvent) {
      if (outlinePanelRef.current && !outlinePanelRef.current.contains(e.target as Node)) {
        setShowOutline(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setShowOutline(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showOutline]);

  // Tells the preview iframe which block is selected — whether the click
  // came from the canvas itself, the Structure panel, or the outline tree —
  // so PreviewBridge can scroll it into view and draw a persistent
  // selection outline. Without this, picking a block from the Structure
  // panel had no visible effect on the canvas at all when that block was
  // off-screen or nested deep. A reload (Save bumps previewNonce, swapping
  // in a whole new iframe via `key`) needs its *own* resend on `onLoad`
  // below — posting here immediately after the nonce changes would race the
  // fresh document's listener not being attached yet, silently dropping it.
  useEffect(() => {
    previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "highlight-select", blockId: selectedId }, WEB_URL);
  }, [selectedId]);

  useEffect(() => {
    api
      .getPage(pageId)
      .then((p) => {
        setPage(p);
        const loadedDoc = p.layout ?? EMPTY_LAYOUT;
        setDoc(loadedDoc);
        const boundLayers = bindDocNodesToTimelineLayers(loadedDoc);
        if (boundLayers.length > 0) {
          setTimelineLayers(boundLayers);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load page"));
  }, [pageId]);

  // The live preview iframe (apps/web) posts block interactions here — clicks
  // select the block in the outline, and the hover "⠿"/"+"/"✕" toolbar
  // requests a reorder, insert, or delete, and (new) the right-click context
  // menu requests duplicate/copy/paste/reset-style — see
  // apps/web/src/components/builder/PreviewBridge.tsx. Reads `docRef`/
  // `pageRef` instead of closing over `doc`/`page` directly so this listener
  // can be attached once on mount instead of re-subscribing on every edit.
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.origin !== WEB_URL) return;
      if (e.data?.source !== "marwa-preview") return;
      const { action } = e.data;
      if (action === "select" && (typeof e.data.blockId === "string" || e.data.blockId === null)) {
        // A null blockId deselects — insertBlock() already targets the
        // document root whenever nothing is selected, so this is also how a
        // "target the root" action would clear a stale selection.
        selectBlock(e.data.blockId);

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
            // empty) localStorage — that mismatch was why Paste/Paste Style
            // stayed permanently disabled regardless of what was copied.
            previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "clipboard-state", hasClipboard: true }, WEB_URL);
          } catch {
            // localStorage can throw in private-browsing/storage-full edge
            // cases — copy just silently fails rather than crashing the editor.
          }
        }
      } else if (action === "request-paste" && (typeof e.data.blockId === "string" || e.data.blockId === null)) {
        // blockId === null comes from the bottom-of-canvas banner's context
        // menu (PreviewBridge.tsx) — not a real block to paste after, it
        // means "append at the end of the page", which pasteNodeAfter
        // already does for a null/falsy anchor.
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
      }
      else if (
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
        // The sidebar palette's pointer-drag drop (see PreviewBridge.tsx's
        // computeChildInsertion) — a precise sibling position computed from
        // the target container's *existing children's* own bounding boxes,
        // not just "first/last child" like request-insert-block's
        // before/after/into above (which only ever resolves relative to the
        // whole container, so a drop anywhere in its middle always landed
        // at one end instead of between the two siblings it was actually
        // dropped between).
        const definition = getBlockDefinition(e.data.blockType);
        if (definition) {
          const node = createNode(e.data.blockType, { ...definition.defaultProps });
          updateDoc((d) => insertNodeAtIndex(d, node, e.data.targetId, e.data.childIndex), { immediate: true });
          setSelectedId(node.id);
        }
      } else if (action === "request-insert-block-as-section" && typeof e.data.blockType === "string") {
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
      } else if (action === "request-insert-structure") {
        // Same column-preset picker the hover "+" opens (see
        // handleInsertStructure below) — "__root__" tells it to append at
        // the document root instead of inserting after a specific block.
        setInsertAfterId("__root__");
      } else if (action === "ready") {
        // See the matching comment in PreviewBridge.tsx — this fires once
        // the iframe's own message listener is actually attached, which is
        // the only reliable moment to send it anything, unlike the iframe's
        // `onLoad` (fires on document load, which can resolve before React
        // has hydrated and PreviewBridge has mounted).
        previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "highlight-select", blockId: selectedIdRef.current }, WEB_URL);
        if (pendingScrollRef.current !== null) {
          previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "restore-scroll", scrollY: pendingScrollRef.current }, WEB_URL);
          pendingScrollRef.current = null;
        }
        // Seeds the iframe's Paste/Paste Style enabled-state on every fresh
        // mount (a Save-triggered reload included) — without this, copying a
        // block then saving would strand the iframe thinking the clipboard
        // is empty until the next copy.
        let hasClipboard = false;
        try {
          hasClipboard = Boolean(localStorage.getItem("marwa-builder-clipboard"));
        } catch {
          // Private-browsing/storage-disabled — treat as "nothing to paste".
        }
        previewFrameRef.current?.contentWindow?.postMessage({ source: "marwa-admin", action: "clipboard-state", hasClipboard }, WEB_URL);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      createNode("Section", {
        ...sectionDef.defaultProps,
        direction: "column",
        contentWidth: "full",
        width: "100%",
      })
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
    if (layoutMode === "grid") {
      parent.style = { customCss: `selector { grid-template-columns: repeat(${columnCount}, minmax(0, 1fr)); }` };
    }

    updateDoc((d) => (insertAfterId === "__root__" ? insertNode(d, parent, null) : insertNodeAfter(d, parent, insertAfterId)), { immediate: true });
    setSelectedId(parent.id);
    setInsertAfterId(null);
  }

  function handleInsertItineraryPreset() {
    const templateNode = createItineraryTemplateNode();
    updateDoc((d) => insertNode(d, templateNode, null), { immediate: true });
    setSelectedId(templateNode.id);
    setShowTimelineDrawer(true);
    setTimelineLayers((prev) => {
      if (prev.some((l) => l.id === "car-layer")) return prev;
      const carLayer: LayerTrack = {
        id: "car-layer",
        name: "Car Motion Path",
        color: "#2563ff",
        emoji: "🚗",
        visible: true,
        locked: false,
        expanded: true,
        cssVarTracks: [],
        clipPathTracks: [],
        trigger: { mode: "onMount" },
        clips: [{ id: Math.random().toString(36).slice(2, 9), start: 0, end: 5, label: "Scenic Tour (5s)" }],
        tracks: ALL_PROPERTIES.map((property) => ({
          id: Math.random().toString(36).slice(2, 9),
          property,
          keyframes:
            property === "opacity"
              ? [pkf("k-car-1", 0, 1, "linear"), pkf("k-car-2", 5, 1, "linear")]
              : [],
        })),
      };
      return [carLayer, ...prev];
    });
  }

  async function handleConvert() {
    if (!page) return;
    setConverting(true);
    try {
      const updated = await api.updatePage(page.id, { editorMode: "BUILDER", layout: EMPTY_LAYOUT });
      setPage(updated);
      setDoc(updated.layout ?? EMPTY_LAYOUT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert page");
    } finally {
      setConverting(false);
    }
  }

  function handleSave() {
    if (burstResetTimerRef.current) clearTimeout(burstResetTimerRef.current);
    burstActiveRef.current = false;
    setError(null);
    persist(doc);
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

  /**
   * Fires on every real edit inside the timeline drawer (not just a playhead
   * move — see onLayersChange's doc comment in AnimationTimelineEditor.tsx).
   * Writes each open layer's tracks straight onto its matching node's
   * `timeline` field, same as any other node-level edit in this app (props/
   * style/animations) — Save just persists whatever's already in `doc`, so
   * closing/reopening the timeline drawer or reloading the page no longer
   * discards keyframes the way it did before this existed.
   */
  function handleTimelineLayersChange(layers: LayerTrack[]) {
    setTimelineLayers(layers);
    updateDoc((d) =>
      layers.reduce(
        (acc, layer) =>
          findNode(acc, layer.id)
            ? updateNodeTimeline(acc, layer.id, layerToBlockTimeline(layer, TOTAL_DURATION), activeTimelineIndexRef.current[layer.id] ?? 0)
            : acc,
        d
      )
    );
  }

  function handleTimelineScrub(time: number, layers: LayerTrack[]) {
    setTimelineLayers(layers);
    previewFrameRef.current?.contentWindow?.postMessage(
      { source: "marwa-admin", action: "scrub-timeline", time, layers },
      WEB_URL
    );
  }

  function nodeDisplayName(nodeId: string): string {
    const located = findNode(docRef.current, nodeId);
    return located ? `${located.node.type} (${nodeId.slice(0, 6)})` : `Block (${nodeId.slice(0, 6)})`;
  }

  /** A fresh starter layer — same shape a brand-new timeline entry gets,
   *  whether that's the first timeline on a node or an additional one added
   *  via handleAddTimeline. */
  function blankTimelineLayer(nodeId: string, name: string): LayerTrack {
    return {
      id: nodeId,
      name,
      color: "#2563ff",
      emoji: "📦",
      visible: true,
      locked: false,
      expanded: true,
      cssVarTracks: [],
      clipPathTracks: [],
      trigger: { mode: "onMount" },
      clips: [{ id: Math.random().toString(36).slice(2, 9), start: 0, end: 2, label: "Animation" }],
      tracks: ALL_PROPERTIES.map((property) => ({
        id: Math.random().toString(36).slice(2, 9),
        property,
        keyframes: [],
      })),
    };
  }

  /** Builds the LayerTrack the drawer edits for `nodeId`'s `timelines[index]`
   *  — the real saved entry if it exists, else a blank starter layer. Only
   *  safe to call when `docRef.current` already reflects `index`'s intended
   *  source of truth (e.g. on open, or a plain switch between two entries
   *  that both already exist) — handleAddTimeline/handleDeleteTimeline build
   *  their target layer from a locally-computed array instead, since
   *  `docRef.current` isn't guaranteed to reflect an updateDoc() call made
   *  earlier in the same synchronous handler (it only updates on the next
   *  effect flush). */
  function buildLayerForNode(nodeId: string, index: number): LayerTrack {
    const located = findNode(docRef.current, nodeId);
    const name = nodeDisplayName(nodeId);
    const existing = located?.node.timelines?.[index];
    return existing ? blockTimelineToLayer(nodeId, name, existing, { color: "#2563ff", emoji: "📦" }) : blankTimelineLayer(nodeId, name);
  }

  function handleOpenTimelineDrawer(nodeId: string) {
    setShowTimelineDrawer(true);
    setTimelineLayers((prev) => {
      if (prev.some((l) => l.id === nodeId)) return prev;
      const index = activeTimelineIndexRef.current[nodeId] ?? 0;
      return [...prev, buildLayerForNode(nodeId, index)];
    });
    setSelectedId(nodeId);
  }

  /** Switches the drawer's view of `nodeId` to a different entry of its
   *  `timelines[]` array — reloads the matching LayerTrack from that entry's
   *  real saved data. Does not touch any other open layer. */
  function handleSwitchTimeline(nodeId: string, index: number) {
    setActiveTimelineIndex((prev) => ({ ...prev, [nodeId]: index }));
    setTimelineLayers((prev) => prev.map((l) => (l.id === nodeId ? buildLayerForNode(nodeId, index) : l)));
  }

  /** Appends a new blank BlockTimeline to nodeId's timelines[] and switches
   *  the drawer to it — e.g. adding a separate onHover lift alongside an
   *  existing onMount entrance on the same block. */
  function handleAddTimeline(nodeId: string) {
    const nextIndex = findNode(docRef.current, nodeId)?.node.timelines?.length ?? 0;
    const layer = blankTimelineLayer(nodeId, nodeDisplayName(nodeId));
    updateDoc((d) => updateNodeTimeline(d, nodeId, layerToBlockTimeline(layer, TOTAL_DURATION), nextIndex), { immediate: true });
    setActiveTimelineIndex((prev) => ({ ...prev, [nodeId]: nextIndex }));
    setTimelineLayers((prev) => prev.map((l) => (l.id === nodeId ? layer : l)));
  }

  /** Deletes the currently-active timeline entry for nodeId and switches the
   *  drawer to whichever entry now sits at the same (or previous) index —
   *  never leaves the drawer pointed at an index that no longer exists. The
   *  replacement layer is built from a locally-computed post-delete array
   *  rather than re-reading docRef.current (see buildLayerForNode's doc
   *  comment on why that would still show the just-deleted entry's data). */
  function handleDeleteTimeline(nodeId: string) {
    const timelines = findNode(docRef.current, nodeId)?.node.timelines ?? [];
    const index = activeTimelineIndexRef.current[nodeId] ?? 0;
    const remaining = timelines.filter((_, i) => i !== index);
    updateDoc((d) => removeNodeTimelineAt(d, nodeId, index), { immediate: true });
    const nextIndex = Math.min(index, Math.max(0, remaining.length - 1));
    const name = nodeDisplayName(nodeId);
    const nextLayer: LayerTrack = remaining[nextIndex]
      ? blockTimelineToLayer(nodeId, name, remaining[nextIndex], { color: "#2563ff", emoji: "📦" })
      : blankTimelineLayer(nodeId, name);
    setActiveTimelineIndex((prev) => ({ ...prev, [nodeId]: nextIndex }));
    setTimelineLayers((prev) => prev.map((l) => (l.id === nodeId ? nextLayer : l)));
  }

  const actions: OutlineTreeActions = {
    onSelect: setSelectedId,
    onReorder: (nodeId, targetId, position) => {
      updateDoc((d) => reorderNode(d, nodeId, targetId, position), { immediate: true });
    },
    onDuplicate: (nodeId) => {
      updateDoc((d) => duplicateNode(d, nodeId), { immediate: true });
    },
    onDelete: (nodeId) => {
      updateDoc((d) => removeNode(d, nodeId), { immediate: true });
      if (selectedId === nodeId) setSelectedId(null);
    },
    onCopy: (nodeId) => {
      const located = findNode(docRef.current, nodeId);
      if (!located) return;
      try {
        localStorage.setItem("marwa-builder-clipboard", JSON.stringify(located.node));
        // Same cross-origin notice as request-copy above — the canvas
        // iframe's own Paste/Paste Style state needs telling directly.
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

  if (error && !page) return <p className="p-8 text-sm text-red-400">{error}</p>;
  if (!page) return <p className="p-8 text-sm text-zinc-500">Loading…</p>;

  if (page.editorMode !== "BUILDER") {
    return (
      <div className="max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 m-8">
        <Link href="/pages" className="mb-4 inline-block text-xs text-zinc-500 hover:text-zinc-300">
          ← Back to Pages
        </Link>
        <h1 className="text-lg font-semibold">{page.title}</h1>
        <p className="mt-2 text-sm text-zinc-400">
          This page uses the classic rich-text editor. Convert it to the visual builder to edit it here — its
          existing HTML content will be kept but won&apos;t be represented on the canvas until you rebuild it with
          blocks.
        </p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          onClick={handleConvert}
          disabled={converting}
          className="mt-4 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
        >
          {converting ? "Converting…" : "Convert to Visual Builder"}
        </button>
      </div>
    );
  }

  const selectedNode = selectedId ? findNode(doc, selectedId)?.node ?? null : null;

  const availableCanvasWidth = Math.max(300, canvasWidth - 16);
  const targetIframeWidth =
    previewBreakpoint === "desktop"
      ? 1440
      : previewBreakpoint === "tablet"
        ? 1024
        : 375;

  const canvasScale = Math.min(1, availableCanvasWidth / targetIframeWidth);

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Bar Navigation */}
      <header className="glass-pill relative z-30 mx-3 mt-3 flex h-14 flex-shrink-0 items-center justify-between px-4 shadow-xl shadow-black/30">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <Link
            href="/pages"
            title="Exit Builder to Pages"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-amber-400 transition-all shadow-sm active:scale-95"
          >
            <LogOut className="h-4 w-4" />
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => {
              if (leftPanelCollapsed) setLeftPanelCollapsed(false);
              setLeftPanelTab("widgets");
            }}
            title="Add Element / Widgets Palette"
            className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all shadow-sm active:scale-95 ${
              leftPanelTab === "widgets" && !leftPanelCollapsed
                ? "border-amber-400 bg-amber-400 text-white shadow-md shadow-amber-400/20"
                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-amber-400/60 hover:bg-zinc-800 hover:text-amber-400"
            }`}
          >
            <Plus className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-800/40 p-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Shift+Z)"
              className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-30"
            >
              ↷
            </button>
          </div>
          <div className="relative" ref={outlinePanelRef}>
            <button
              type="button"
              onClick={() => setShowOutline((s) => !s)}
              title="Navigator / Structure"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all shadow-sm active:scale-95 ${
                showOutline
                  ? "border-amber-400 bg-amber-400 text-white shadow-md shadow-amber-400/20"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-amber-400/60 hover:bg-zinc-800 hover:text-amber-400"
              }`}
            >
              <LayersIcon />
            </button>
            {showOutline && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 flex max-h-[70vh] w-72 flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
                    <LayersIcon /> Navigator / Structure
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
          <button
            type="button"
            onClick={() => setShowTimelineDrawer((s) => !s)}
            title="Toggle Timeline Editor"
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${showTimelineDrawer
              ? "border-amber-400 bg-amber-400/10 text-amber-400"
              : "border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
          >
            🎬 Timeline
          </button>
          <button
            type="button"
            onClick={handleInsertItineraryPreset}
            title="Load Interactive Project Timeline Template"
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-400 hover:text-white transition-all shadow-md shadow-amber-500/10 active:scale-[0.98]"
          >
            ✨ Add Template
          </button>
        </div>

        {/* Center Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-200">{page.title}</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">/{page.slug}</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          {/* Responsive Viewport Switcher */}
          <div className="flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
            {(["desktop", "tablet", "mobile"] as const).map((bp) => (
              <button
                key={bp}
                type="button"
                onClick={() => setPreviewBreakpoint(bp)}
                title={`Switch to ${bp} view`}
                className={`flex h-8 w-8 items-center justify-center rounded-md text-xs transition-all ${
                  previewBreakpoint === bp
                    ? "bg-amber-400 text-white shadow-sm font-bold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                }`}
              >
                <BreakpointIcon value={bp} />
              </button>
            ))}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {saved && <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">✓ Saved</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
          <PublishStatusControls page={page} doc={doc} onPageUpdated={setPage} />
          <div className="h-4 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => setRevisionsOpen(true)}
            title="Revision History"
            className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            History
          </button>
          <a
            href={`${WEB_URL}/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800/40 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <span>View Live</span>
            <span>↗</span>
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-amber-400 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-300 disabled:opacity-50 shadow-md shadow-amber-400/20 active:scale-95 transition-all"
          >
            {saving ? "Publishing…" : "Publish / Save"}
          </button>
        </div>
      </header>

      {revisionsOpen && (
        <RevisionHistoryModal
          entityType="PAGE"
          entityId={pageId}
          onClose={() => setRevisionsOpen(false)}
          // A full reload rather than re-fetching into live state — this
          // editor's undo/redo stacks, timeline layer bindings, and the
          // preview iframe's own postMessage-synced document all assume they
          // were seeded from the page's initial load; splicing a restored
          // layout into that live state mid-session risks desyncing all
          // three, where a fresh mount trivially can't.
          onRestored={() => window.location.reload()}
        />
      )}

      {/* Main Builder Area: 2 Columns (Left Inspector + Scale-to-Fit Canvas) */}
      <div className="flex flex-1 gap-0 overflow-hidden p-0 relative">
        {/* Left Inspector Panel (Widgets / Elements & Style / Settings) */}
        <div
          className={`flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 flex-shrink-0 transition-all duration-200 relative ${leftPanelCollapsed ? "w-0 border-0 opacity-0 pointer-events-none p-0" : "w-[300px] opacity-100"
            }`}
        >
          <div className="flex border-b border-zinc-800 bg-zinc-900/80 p-1 gap-1">
            <button
              type="button"
              onClick={() => setLeftPanelTab("widgets")}
              className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition-all ${leftPanelTab === "widgets" ? "bg-amber-400 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
            >
              Widgets / Elements
            </button>
            <button
              type="button"
              onClick={() => setLeftPanelTab("style")}
              className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition-all ${leftPanelTab === "style" ? "bg-amber-400 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
            >
              Style / Settings
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 [scrollbar-width:thin] [scrollbar-color:#27272a_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            {leftPanelTab === "widgets" ? (
              <BlockPalette onInsert={insertBlock} previewFrameRef={previewFrameRef} canvasScale={canvasScale} />
            ) : (
              <>
                <AIAssistToolbar
                  node={selectedNode}
                  onApply={(props) => {
                    if (!selectedId) return;
                    updateDoc((d) => updateNodeProps(d, selectedId, props));
                  }}
                />
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
                onChangeClassIds={(classIds) => {
                  if (!selectedId) return;
                  updateDoc((d) => updateNodeClassIds(d, selectedId, classIds));
                }}
                onChangeAnimations={(animations) => {
                  if (!selectedId) return;
                  updateDoc((d) => updateNodeAnimations(d, selectedId, animations), { immediate: true });
                }}
                onOpenTimelineDrawer={handleOpenTimelineDrawer}
              />
              </>
            )}
          </div>
        </div>

        {/* Sidebar Collapse Toggle Handle */}
        <button
          type="button"
          onClick={() => setLeftPanelCollapsed((c) => !c)}
          title={leftPanelCollapsed ? "Expand Inspector Sidebar" : "Collapse Inspector Sidebar"}
          className="z-30 flex h-9 w-5 flex-shrink-0 items-center justify-center rounded-r-md border border-l-0 border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-amber-400 hover:text-white self-center transition-colors shadow-xl cursor-pointer"
        >
          {leftPanelCollapsed ? "›" : "‹"}
        </button>

        {/* Right Main Canvas (Scale-to-Fit Viewport) */}
        <div className="flex flex-col flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 relative">
          <div
            ref={canvasContainerRef}
            className="canvas-container no-scrollbar flex flex-1 items-start justify-center overflow-hidden relative p-0"
          >
            <div
              style={{
                width: `${targetIframeWidth}px`,
                minWidth: `${targetIframeWidth}px`,
                maxWidth: `${targetIframeWidth}px`,
                height: canvasScale < 1 ? `calc(100% / ${canvasScale})` : "100%",
                minHeight: canvasScale < 1 ? `calc(100% / ${canvasScale})` : "100%",
                transform: `scale(${canvasScale})`,
                transformOrigin: "top center",
                flexShrink: 0,
                transition: "transform 0.15s ease, width 0.15s ease",
              }}
              className="relative overflow-hidden flex-shrink-0 bg-white rounded-lg shadow-2xl border border-zinc-800"
            >
              <iframe
                ref={previewFrameRef}
                key={previewNonce}
                // __builder_preview=1 is a deterministic marker PreviewBridge
                // checks synchronously (see PreviewBridge.tsx) before ever
                // rendering the visible editor chrome — a plain "is this
                // page inside some iframe" check isn't enough, since a
                // browser extension or any other third-party frame trips
                // that the exact same way a real embed does. Only this
                // admin app's own iframe src ever sets this.
                src={`${WEB_URL}/${page.slug}?__builder_preview=1`}
                title="Live preview"
                className="h-full w-full border-0 bg-white no-scrollbar"
                style={{ border: "none", outline: "none" }}
              />
            </div>
          </div>



          {showTimelineDrawer && (
            <div className="h-72 w-full flex-shrink-0 border-t border-zinc-800 bg-zinc-950 p-2 overflow-hidden relative">
              <div className="flex items-center justify-between px-3 py-1 border-b border-zinc-800/80 mb-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    Timeline Editor
                  </span>
                  {selectedId && timelineLayers.some((l) => l.id === selectedId) && (() => {
                    const nodeId = selectedId;
                    const count = Math.max(1, findNode(doc, nodeId)?.node.timelines?.length ?? 1);
                    const idx = Math.min(activeTimelineIndex[nodeId] ?? 0, count - 1);
                    return (
                      <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-1 py-0.5">
                        <button
                          type="button"
                          onClick={() => handleSwitchTimeline(nodeId, Math.max(0, idx - 1))}
                          disabled={idx === 0}
                          title="Previous timeline on this block"
                          className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400"
                        >
                          ‹
                        </button>
                        <span className="text-[10px] font-mono text-zinc-400 min-w-[64px] text-center">Timeline {idx + 1}/{count}</span>
                        <button
                          type="button"
                          onClick={() => handleSwitchTimeline(nodeId, Math.min(count - 1, idx + 1))}
                          disabled={idx >= count - 1}
                          title="Next timeline on this block"
                          className="rounded px-1.5 py-0.5 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400"
                        >
                          ›
                        </button>
                        <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />
                        <button
                          type="button"
                          onClick={() => handleAddTimeline(nodeId)}
                          title="Add a new timeline to this block"
                          className="rounded px-1.5 py-0.5 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
                        >
                          + Add
                        </button>
                        {count > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTimeline(nodeId)}
                            title="Delete this timeline"
                            className="rounded px-1.5 py-0.5 text-xs font-bold text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setShowTimelineDrawer(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ✕ Close
                </button>
              </div>
              <AnimationTimelineEditor
                initialLayers={timelineLayers}
                onTimeUpdate={handleTimelineScrub}
                onLayersChange={handleTimelineLayersChange}
                selectedLayerId={selectedId}
                onSelectLayer={(layerId) => setSelectedId(layerId)}
                className="h-[calc(100%-28px)] rounded-lg border-0 bg-transparent shadow-none"
                style={{ minWidth: "100%" }}
              />
            </div>
          )}
        </div>
      </div>

      <InsertStructureModal
        open={insertAfterId !== null}
        onClose={() => setInsertAfterId(null)}
        onConfirm={handleInsertStructure}
      />
    </div>
  );

}
