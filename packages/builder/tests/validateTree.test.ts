import { describe, it, expect } from "vitest";
import { validateLayoutTree, BLOCK_REGISTRY } from "../index";
import type { LayoutDocument, LayoutNode } from "../src/types";

function heading(id: string, overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    id,
    type: "Heading",
    props: { ...BLOCK_REGISTRY.Heading.defaultProps },
    ...overrides,
  };
}

function section(id: string, children: LayoutNode[] = [], overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    id,
    type: "Section",
    props: { ...BLOCK_REGISTRY.Section.defaultProps },
    children,
    ...overrides,
  };
}

describe("validateLayoutTree", () => {
  it("accepts a well-formed tree with valid props and no errors", () => {
    const doc: LayoutDocument = { version: 1, nodes: [section("root", [heading("h1")])] };
    expect(validateLayoutTree(doc)).toEqual([]);
  });

  it("flags an unknown block type", () => {
    const doc: LayoutDocument = { version: 1, nodes: [{ id: "n1", type: "TotallyMadeUpBlock", props: {} }] };
    const errors = validateLayoutTree(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ nodeId: "n1", nodeType: "TotallyMadeUpBlock" });
    expect(errors[0].message).toMatch(/Unknown block type/);
  });

  it("flags props that fail the block's own schema (Heading requires non-empty text)", () => {
    const doc: LayoutDocument = { version: 1, nodes: [heading("h1", { props: { ...BLOCK_REGISTRY.Heading.defaultProps, text: "" } })] };
    const errors = validateLayoutTree(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0].nodeId).toBe("h1");
  });

  it("flags children nested under a block that isn't a container", () => {
    const doc: LayoutDocument = {
      version: 1,
      nodes: [heading("h1", { children: [heading("h2")] })],
    };
    const errors = validateLayoutTree(doc);
    expect(errors.some((e) => e.nodeId === "h1" && /does not accept nested children/.test(e.message))).toBe(true);
  });

  it("walks nested children and reports errors at any depth", () => {
    const doc: LayoutDocument = {
      version: 1,
      nodes: [section("outer", [section("inner", [heading("deep", { props: { ...BLOCK_REGISTRY.Heading.defaultProps, text: "" } })])])],
    };
    const errors = validateLayoutTree(doc);
    expect(errors).toHaveLength(1);
    expect(errors[0].nodeId).toBe("deep");
  });

  it("allows a container block (Section) to hold children", () => {
    const doc: LayoutDocument = { version: 1, nodes: [section("root", [heading("h1"), heading("h2")])] };
    expect(validateLayoutTree(doc)).toEqual([]);
  });
});
