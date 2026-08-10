import type { BlockTimeline, LayoutDocument, LayoutNode, LayoutNodeStyle } from "@marwa/builder";

export function generateNodeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createNode(type: string, props: Record<string, unknown>): LayoutNode {
  return { id: generateNodeId(), type, props };
}

interface Located {
  node: LayoutNode;
  siblings: LayoutNode[];
  index: number;
  parentId: string | null;
}

/** Depth-first search for a node by id, returning it alongside its sibling array/index for in-place-style edits. */
export function findNode(doc: LayoutDocument, nodeId: string): Located | null {
  function walk(nodes: LayoutNode[], parentId: string | null): Located | null {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === nodeId) return { node: nodes[i], siblings: nodes, index: i, parentId };
      const child = nodes[i].children;
      if (child) {
        const found = walk(child, nodes[i].id);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(doc.nodes, null);
}

function mapTree(nodes: LayoutNode[], fn: (node: LayoutNode) => LayoutNode | null): LayoutNode[] {
  const result: LayoutNode[] = [];
  for (const node of nodes) {
    const mapped = fn(node);
    if (mapped === null) continue; // dropped (removeNode)
    result.push(mapped.children ? { ...mapped, children: mapTree(mapped.children, fn) } : mapped);
  }
  return result;
}

export function updateNodeProps(doc: LayoutDocument, nodeId: string, props: Record<string, unknown>): LayoutDocument {
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => (n.id === nodeId ? { ...n, props: { ...n.props, ...props } } : n)),
  };
}

export function updateNodeStyle(doc: LayoutDocument, nodeId: string, style: LayoutNodeStyle): LayoutDocument {
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => (n.id === nodeId ? { ...n, style: { ...n.style, ...style } } : n)),
  };
}

export function updateNodeClassIds(doc: LayoutDocument, nodeId: string, classIds: string[]): LayoutDocument {
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => (n.id === nodeId ? { ...n, classIds } : n)),
  };
}

export function updateNodeName(doc: LayoutDocument, nodeId: string, name: string): LayoutDocument {
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => (n.id === nodeId ? { ...n, name: name || undefined } : n)),
  };
}

/** Clears every Style-tab/Advanced-tab override on a node back to defaults — a full replace, not the usual merge-patch `updateNodeStyle` does. */
export function resetNodeStyle(doc: LayoutDocument, nodeId: string): LayoutDocument {
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => {
      if (n.id !== nodeId) return n;
      const rest: LayoutNode = { ...n };
      delete rest.style;
      return rest;
    }),
  };
}

/** Replaces a node's whole `timelines` array (the property panel always sends the full list back, not a per-entry patch) — see PropertyPanel's Animation tab, which builds each entry as a 2-keyframe BlockTimeline per the schema reconciliation (a "simple" tween is just a 2-keyframe timeline; there's no separate NodeAnimationConfig system anymore). */
export function updateNodeAnimations(doc: LayoutDocument, nodeId: string, timelines: BlockTimeline[]): LayoutDocument {
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => (n.id === nodeId ? { ...n, timelines } : n)),
  };
}

/** See AnimationTimelineEditor.tsx / BlockTimeline. The Timeline drawer can
 *  edit any entry of a node's `timelines` array (navigable via the drawer's
 *  timeline switcher — see handleOpenTimelineDrawer/handleSwitchTimeline in
 *  builder/[pageId]/page.tsx) — replaces just the given `index`, leaving
 *  every other entry (e.g. a separate onHover animation authored via the
 *  Animation tab, or another onScroll timeline on the same node) untouched,
 *  rather than overwriting the whole array. `index` defaults to 0 for the
 *  common single-timeline case. */
export function updateNodeTimeline(doc: LayoutDocument, nodeId: string, timeline: BlockTimeline, index = 0): LayoutDocument {
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => {
      if (n.id !== nodeId) return n;
      const existing = n.timelines ?? [];
      const next = existing.slice();
      next[index] = timeline;
      return { ...n, timelines: next };
    }),
  };
}

/** Removes one entry from a node's `timelines` array by index — used by the
 *  drawer's timeline switcher to delete the currently-open entry. Leaves
 *  every other entry's relative order untouched. */
export function removeNodeTimelineAt(doc: LayoutDocument, nodeId: string, index: number): LayoutDocument {
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => {
      if (n.id !== nodeId) return n;
      return { ...n, timelines: (n.timelines ?? []).filter((_, i) => i !== index) };
    }),
  };
}

export function removeNode(doc: LayoutDocument, nodeId: string): LayoutDocument {
  return { ...doc, nodes: mapTree(doc.nodes, (n) => (n.id === nodeId ? null : n)) };
}

export function duplicateNode(doc: LayoutDocument, nodeId: string): LayoutDocument {
  const located = findNode(doc, nodeId);
  if (!located) return doc;

  function cloneWithNewIds(node: LayoutNode): LayoutNode {
    return {
      ...node,
      id: generateNodeId(),
      children: node.children ? node.children.map(cloneWithNewIds) : undefined,
    };
  }
  const clone = cloneWithNewIds(located.node);

  if (located.parentId === null) {
    const index = doc.nodes.findIndex((n) => n.id === nodeId);
    const nodes = [...doc.nodes];
    nodes.splice(index + 1, 0, clone);
    return { ...doc, nodes };
  }
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => {
      if (n.id !== located.parentId || !n.children) return n;
      const index = n.children.findIndex((c) => c.id === nodeId);
      const children = [...n.children];
      children.splice(index + 1, 0, clone);
      return { ...n, children };
    }),
  };
}

/** Deep-clones an arbitrary node (e.g. one pulled out of the clipboard, possibly copied from a different page entirely) with fresh ids throughout, then inserts it as the next sibling after `afterId`. Falls back to appending at root if `afterId` isn't found on this page — copy/paste across pages via localStorage means the "after" anchor may not exist here. */
export function pasteNodeAfter(doc: LayoutDocument, node: LayoutNode, afterId: string | null): LayoutDocument {
  function cloneWithNewIds(n: LayoutNode): LayoutNode {
    return { ...n, id: generateNodeId(), children: n.children ? n.children.map(cloneWithNewIds) : undefined };
  }
  const clone = cloneWithNewIds(node);
  if (afterId) {
    const located = findNode(doc, afterId);
    if (located) return insertNodeAfter(doc, clone, afterId);
  }
  return { ...doc, nodes: [...doc.nodes, clone] };
}

/** Inserts `node` as the last child of `parentId`, or at the root if `parentId` is null. */
export function insertNode(doc: LayoutDocument, node: LayoutNode, parentId: string | null): LayoutDocument {
  if (parentId === null) return { ...doc, nodes: [...doc.nodes, node] };
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => (n.id === parentId ? { ...n, children: [...(n.children ?? []), node] } : n)),
  };
}

/**
 * Inserts `node` as the childIndex-th child of `parentId` (root list if
 * `parentId` is null) — a precise position computed from where the cursor
 * sits relative to the target's *existing children's* own bounding boxes
 * (see PreviewBridge.tsx's computeChildInsertion), not just "first/last
 * child of the container" like `insertNode` above. Index is clamped to a
 * valid range rather than assumed correct — a stale index from a container
 * whose child count changed between the last drag-move and the drop
 * shouldn't throw or silently drop the insert.
 */
export function insertNodeAtIndex(doc: LayoutDocument, node: LayoutNode, parentId: string | null, childIndex: number): LayoutDocument {
  if (parentId === null) {
    const nodes = [...doc.nodes];
    nodes.splice(Math.max(0, Math.min(childIndex, nodes.length)), 0, node);
    return { ...doc, nodes };
  }
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => {
      if (n.id !== parentId) return n;
      const children = [...(n.children ?? [])];
      children.splice(Math.max(0, Math.min(childIndex, children.length)), 0, node);
      return { ...n, children };
    }),
  };
}

/** Inserts `node` as the next sibling immediately after `afterId`, at whatever depth `afterId` lives. No-op if `afterId` isn't found. */
export function insertNodeAfter(doc: LayoutDocument, node: LayoutNode, afterId: string): LayoutDocument {
  const located = findNode(doc, afterId);
  if (!located) return doc;

  if (located.parentId === null) {
    const index = doc.nodes.findIndex((n) => n.id === afterId);
    const nodes = [...doc.nodes];
    nodes.splice(index + 1, 0, node);
    return { ...doc, nodes };
  }
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => {
      if (n.id !== located.parentId || !n.children) return n;
      const index = n.children.findIndex((c) => c.id === afterId);
      const children = [...n.children];
      children.splice(index + 1, 0, node);
      return { ...n, children };
    }),
  };
}

/**
 * Inserts a brand-new `node` at a specific position relative to `targetId`:
 * as the previous sibling ("before"), next sibling ("after"), or last child
 * ("into" — `targetId` must be a container). Same before/after/into vocabulary
 * as `reorderNode` below, but for a node that doesn't exist in the tree yet
 * (dragging a new block in from the palette) rather than relocating one that
 * does. No-op if `targetId` isn't found.
 */
export function insertNodeAt(doc: LayoutDocument, node: LayoutNode, targetId: string, position: "before" | "after" | "into"): LayoutDocument {
  if (position === "into") return insertNode(doc, node, targetId);
  if (position === "after") return insertNodeAfter(doc, node, targetId);

  const targetLocated = findNode(doc, targetId);
  if (!targetLocated) return doc;

  if (targetLocated.parentId === null) {
    const index = doc.nodes.findIndex((n) => n.id === targetId);
    const nodes = [...doc.nodes];
    nodes.splice(index, 0, node);
    return { ...doc, nodes };
  }
  return {
    ...doc,
    nodes: mapTree(doc.nodes, (n) => {
      if (n.id !== targetLocated.parentId || !n.children) return n;
      const index = n.children.findIndex((c) => c.id === targetId);
      const children = [...n.children];
      children.splice(index, 0, node);
      return { ...n, children };
    }),
  };
}

/**
 * Drag-and-drop reorder: moves `nodeId` to sit immediately before/after
 * `targetId` as a sibling, or — for "into" — as the last child of `targetId`
 * (which must be a container; the caller, OutlineTree, only offers "into" as
 * a drop zone over container rows). Works across different parents, not
 * just within the same sibling list.
 */
export function reorderNode(doc: LayoutDocument, nodeId: string, targetId: string, position: "before" | "after" | "into"): LayoutDocument {
  if (nodeId === targetId) return doc;
  const located = findNode(doc, nodeId);
  if (!located) return doc;

  // Dropping a node into (or before/after, which still requires locating it
  // inside) its own descendant would create a cycle — refuse silently.
  function isDescendant(node: LayoutNode, id: string): boolean {
    return node.children?.some((c) => c.id === id || isDescendant(c, id)) ?? false;
  }
  if (isDescendant(located.node, targetId)) return doc;

  const withoutNode = removeNode(doc, nodeId);

  if (position === "into") return insertNode(withoutNode, located.node, targetId);
  if (position === "after") return insertNodeAfter(withoutNode, located.node, targetId);

  // "before" — insertNodeAfter has no "before" counterpart, so splice directly.
  const targetLocated = findNode(withoutNode, targetId);
  if (!targetLocated) return doc;

  if (targetLocated.parentId === null) {
    const index = withoutNode.nodes.findIndex((n) => n.id === targetId);
    const nodes = [...withoutNode.nodes];
    nodes.splice(index, 0, located.node);
    return { ...withoutNode, nodes };
  }
  return {
    ...withoutNode,
    nodes: mapTree(withoutNode.nodes, (n) => {
      if (n.id !== targetLocated.parentId || !n.children) return n;
      const index = n.children.findIndex((c) => c.id === targetId);
      const children = [...n.children];
      children.splice(index, 0, located.node);
      return { ...n, children };
    }),
  };
}

/**
 * Moves an existing node to a specific index inside a target parent container's children array.
 */
export function reorderNodeAtIndex(doc: LayoutDocument, nodeId: string, targetParentId: string | null, childIndex: number): LayoutDocument {
  if (!nodeId) return doc;
  const located = findNode(doc, nodeId);
  if (!located) return doc;

  function isDescendant(node: LayoutNode, id: string): boolean {
    return node.children?.some((c) => c.id === id || isDescendant(c, id)) ?? false;
  }
  if (located.node.id === targetParentId || isDescendant(located.node, targetParentId ?? "")) return doc;

  let adjustedIndex = childIndex;
  if (located.parentId === targetParentId && located.index < childIndex) {
    adjustedIndex = childIndex - 1;
  }

  const withoutNode = removeNode(doc, nodeId);
  return insertNodeAtIndex(withoutNode, located.node, targetParentId, adjustedIndex);
}


