import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getBlockDefinition, type LayoutNode } from "@marwa/builder";

export interface OutlineTreeActions {
  onSelect: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  /** Drag-and-drop reorder — see reorderNode in lib/builder/tree.ts. Covers move-up/down and indent/outdent too, via before/after/into drop zones. "into" only ever fires when dropping over a container row. */
  onReorder: (nodeId: string, targetId: string, position: "before" | "after" | "into") => void;
  /** Same clipboard the canvas's own right-click Copy/Paste already writes to/reads from (localStorage key "marwa-builder-clipboard", see the page's postMessage handler) — copying here can be pasted on the canvas and vice versa. */
  onCopy: (nodeId: string) => void;
  onPaste: (nodeId: string) => void;
  /** Sets LayoutNode.name — the Navigator's own display label override, never rendered on the live site. */
  onRename: (nodeId: string, name: string) => void;
  /** Selects nodeId's parent, or no-ops at the tree root — the page component resolves the parent id (it already owns the doc, findNode's parentId). */
  onSelectParent: (nodeId: string) => void;
}

// Same key the canvas's copy/paste (via PreviewBridge.tsx's postMessage
// handler in the page component) already reads/writes — read directly here
// rather than threading a `hasClipboard` prop through, so "Paste" reflects
// a copy made anywhere (canvas or another outline row) without needing the
// parent to re-render this tree.
const CLIPBOARD_KEY = "marwa-builder-clipboard";

type DropZone = "before" | "after" | "into";
interface DropTarget {
  id: string;
  zone: DropZone;
}

interface ContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

interface TreeState {
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  dropTarget: DropTarget | null;
  setDropTarget: (t: DropTarget | null) => void;
  collapsed: Set<string>;
  toggleCollapsed: (id: string) => void;
  contextMenu: ContextMenuState | null;
  setContextMenu: (m: ContextMenuState | null) => void;
}

const TreeContext = createContext<TreeState | null>(null);

export function OutlineTree({
  nodes,
  selectedId,
  depth = 0,
  actions,
}: {
  nodes: LayoutNode[];
  selectedId: string | null;
  depth?: number;
  actions: OutlineTreeActions;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const isRoot = depth === 0;

  useEffect(() => {
    if (!contextMenu) return;
    function close() {
      setContextMenu(null);
    }
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  const list = (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <OutlineTreeRow key={node.id} node={node} depth={depth} selectedId={selectedId} actions={actions} />
      ))}
    </ul>
  );

  if (nodes.length === 0 && depth === 0) {
    return <p className="text-sm text-zinc-500">No blocks yet — insert one from the palette on the left.</p>;
  }

  // Only the outermost call creates the shared state — recursive calls for
  // `node.children` (see OutlineTreeRow below) reuse the same context via
  // useContext rather than starting a fresh one, so dragging/collapsing a
  // deeply nested row still shares state with top-level rows.
  if (!isRoot) return list;
  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return (
    <TreeContext.Provider value={{ draggingId, setDraggingId, dropTarget, setDropTarget, collapsed, toggleCollapsed, contextMenu, setContextMenu }}>
      {list}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 9999 }}
          className="w-40 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl"
        >
          <button
            type="button"
            onClick={() => {
              actions.onSelect(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Select
          </button>
          <button
            type="button"
            onClick={() => {
              actions.onDuplicate(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => {
              actions.onCopy(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Copy
          </button>
          <button
            type="button"
            disabled={!(typeof window !== "undefined" && localStorage.getItem(CLIPBOARD_KEY))}
            onClick={() => {
              actions.onPaste(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-600 disabled:hover:bg-transparent"
          >
            Paste
          </button>
          <button
            type="button"
            onClick={() => {
              actions.onSelectParent(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Select parent
          </button>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt("Rename element (Navigator label only — doesn't affect the live site):");
              if (name !== null) actions.onRename(contextMenu.nodeId, name.trim());
              setContextMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
          >
            Rename element
          </button>
          <div className="my-1 border-t border-zinc-800" />
          <button
            type="button"
            onClick={() => {
              actions.onDelete(contextMenu.nodeId);
              setContextMenu(null);
            }}
            className="block w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-zinc-800"
          >
            Delete
          </button>
        </div>
      )}
    </TreeContext.Provider>
  );
}

function OutlineTreeRow({
  node,
  depth,
  selectedId,
  actions,
}: {
  node: LayoutNode;
  depth: number;
  selectedId: string | null;
  actions: OutlineTreeActions;
}) {
  const definition = getBlockDefinition(node.type);
  const isSelected = node.id === selectedId;
  const tree = useContext(TreeContext);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const isDragging = tree?.draggingId === node.id;
  const isDropTarget = tree?.dropTarget?.id === node.id;
  const dropZone = isDropTarget ? tree!.dropTarget!.zone : null;
  const hasChildren = Boolean(node.children?.length);
  const isCollapsed = tree?.collapsed.has(node.id) ?? false;

  // Computed straight from the event's own geometry rather than trusting
  // React state to have caught up — a native drag session fires dragover in
  // rapid succession right after dragstart, often faster than a state
  // update from onDragStart re-renders and reaches this closure. Gating
  // preventDefault() on that state previously meant the browser silently
  // refused the drop whenever timing lost the race (reliably reproducible
  // under Playwright's near-instant synthetic drag, and possible on a fast
  // real drag too).
  function zoneFor(e: React.DragEvent): DropZone {
    const rect = rowRef.current?.getBoundingClientRect();
    const relY = rect ? (e.clientY - rect.top) / rect.height : 0.5;
    const canNestInto = Boolean(definition?.isContainer);
    if (canNestInto && relY > 0.25 && relY < 0.75) return "into";
    return relY <= 0.5 ? "before" : "after";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault(); // always allow the drop — must run unconditionally, see zoneFor's note
    e.dataTransfer.dropEffect = "move";
    tree?.setDropTarget({ id: node.id, zone: zoneFor(e) });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    // dataTransfer, not React state, is the reliable source for *which* node
    // is being dragged — it's set once in dragstart and read once here,
    // sidestepping the same state-timing issue.
    const draggedId = e.dataTransfer.getData("text/plain") || tree?.draggingId;
    if (!draggedId) return;
    actions.onReorder(draggedId, node.id, zoneFor(e));
    tree?.setDraggingId(null);
    tree?.setDropTarget(null);
  }

  return (
    <li>
      <div
        ref={rowRef}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", node.id);
          tree?.setDraggingId(node.id);
        }}
        onDragEnd={() => {
          tree?.setDraggingId(null);
          tree?.setDropTarget(null);
        }}
        onDragOver={handleDragOver}
        onDragLeave={() => {
          if (tree?.dropTarget?.id === node.id) tree.setDropTarget(null);
        }}
        onDrop={handleDrop}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          tree?.setContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY });
        }}
        style={{ marginLeft: depth * 12 }}
        className={`group relative flex h-7 cursor-grab items-center gap-1 rounded-md border px-1.5 text-xs active:cursor-grabbing ${
          isSelected ? "border-amber-400 bg-amber-400/10" : "border-transparent bg-zinc-900 hover:border-zinc-800"
        } ${isDragging ? "opacity-40" : ""} ${dropZone === "into" ? "border-emerald-400 bg-emerald-400/10" : ""}`}
      >
        {dropZone === "before" && <span className="absolute -top-0.5 left-0 right-0 h-0.5 rounded bg-amber-400" />}
        {dropZone === "after" && <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded bg-amber-400" />}

        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              tree?.toggleCollapsed(node.id);
            }}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-200"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? "▸" : "▾"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="shrink-0 text-zinc-600" title="Drag to reorder">
          ⠿
        </span>
        <button type="button" onClick={() => actions.onSelect(node.id)} className="min-w-0 flex-1 truncate text-left text-zinc-200">
          {node.name || definition?.label || node.type}
          {definition?.singleton && <span className="ml-1 text-[10px] text-zinc-500">(legacy)</span>}
        </button>

        {/* Overlaid, not laid out inline — revealed on hover so the row above stays a single compact line at rest. Move/Indent/Outdent lost their buttons here — drag-and-drop (the ⠿ handle, both in this tree and directly in the canvas) now covers all three. */}
        <div className="absolute right-0.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded bg-zinc-900 pl-1 shadow-lg group-hover:flex">
          <IconButton title="Duplicate" onClick={() => actions.onDuplicate(node.id)}>
            ⧉
          </IconButton>
          <IconButton title="Delete" onClick={() => actions.onDelete(node.id)} danger>
            ✕
          </IconButton>
        </div>
      </div>
      {hasChildren && !isCollapsed && <OutlineTree nodes={node.children!} selectedId={selectedId} depth={depth + 1} actions={actions} />}
    </li>
  );
}

function IconButton({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-zinc-800 ${danger ? "hover:text-red-400" : "hover:text-amber-400"}`}
    >
      {children}
    </button>
  );
}
