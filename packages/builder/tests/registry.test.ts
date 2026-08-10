import { describe, it, expect } from "vitest";
import { BLOCK_REGISTRY, getBlockDefinition } from "../index";

const CORE_BLOCK_TYPES = ["Section", "Heading", "RichText", "Image", "CTAButton", "Divider", "Columns", "Form"] as const;

describe("Builder Registry", () => {
  it("registers every core block type", () => {
    for (const type of CORE_BLOCK_TYPES) {
      expect(BLOCK_REGISTRY[type], `${type} should be registered`).toBeDefined();
    }
  });

  it("every core block type's defaultProps parses successfully against its own propsSchema", () => {
    for (const type of CORE_BLOCK_TYPES) {
      const entry = BLOCK_REGISTRY[type];
      const result = entry.propsSchema.safeParse(entry.defaultProps);
      expect(result.success, `${type}.defaultProps should satisfy ${type}.propsSchema: ${!result.success ? JSON.stringify(result.error.issues) : ""}`).toBe(true);
    }
  });

  it("getBlockDefinition resolves a known block type and returns the same entry as the registry", () => {
    const def = getBlockDefinition("Heading");
    expect(def).toBe(BLOCK_REGISTRY.Heading);
  });

  it("getBlockDefinition returns undefined for an unknown block type", () => {
    expect(getBlockDefinition("TotallyMadeUpBlock")).toBeUndefined();
  });

  it("propsSchema rejects props that violate the block's own constraints (Heading requires non-empty text)", () => {
    const result = BLOCK_REGISTRY.Heading.propsSchema.safeParse({ ...BLOCK_REGISTRY.Heading.defaultProps, text: "" });
    expect(result.success).toBe(false);
  });

  it("every block declares a category used by the block library sidebar", () => {
    for (const [type, entry] of Object.entries(BLOCK_REGISTRY)) {
      expect(typeof entry.category, `${type} should declare a category`).toBe("string");
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });
});
