import type { LayoutDocument, LayoutNode } from "./types";
import { BLOCK_REGISTRY } from "./registry";

export interface LayoutTreeError {
  nodeId: string;
  nodeType: string;
  message: string;
}

/**
 * Semantic validation on top of `layoutDocumentSchema`'s structural check:
 * confirms every node's `type` exists in BLOCK_REGISTRY, its `props` match
 * that block's own Zod schema, and container-only nesting (`children`) is
 * only used on blocks marked `isContainer`. Intended for the write
 * boundary (reject a bad save immediately) — `LayoutRenderer` still falls
 * back gracefully for anything that gets into the DB some other way.
 */
export function validateLayoutTree(doc: LayoutDocument): LayoutTreeError[] {
  const errors: LayoutTreeError[] = [];

  function walk(node: LayoutNode) {
    const definition = BLOCK_REGISTRY[node.type];
    if (!definition) {
      errors.push({ nodeId: node.id, nodeType: node.type, message: `Unknown block type "${node.type}"` });
      return;
    }

    const result = definition.propsSchema.safeParse(node.props);
    if (!result.success) {
      errors.push({
        nodeId: node.id,
        nodeType: node.type,
        message: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      });
    }

    if (!definition.isContainer && node.children && node.children.length > 0) {
      errors.push({ nodeId: node.id, nodeType: node.type, message: "This block does not accept nested children" });
    }

    node.children?.forEach(walk);
  }

  doc.nodes.forEach(walk);
  return errors;
}
