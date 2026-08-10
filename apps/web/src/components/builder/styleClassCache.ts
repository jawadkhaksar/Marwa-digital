import { cache } from "react";
import type { StyleClassDefinition } from "@marwa/builder";
import { api } from "@/lib/api";

/**
 * Site-wide reusable StyleClass rows, fetched once per request (React's
 * `cache()` memoizes by argument-less call within one render pass, same as
 * how other site-wide data — settings, menus — is fetched once and reused
 * down the tree). Malformed rows (bad JSON shape) are dropped rather than
 * thrown, same defensive posture as parseLayoutDocumentSafe elsewhere.
 */
export const getStyleClassesMap = cache(async (): Promise<Map<string, StyleClassDefinition>> => {
  try {
    const rows = await api.getStyleClasses();
    const map = new Map<string, StyleClassDefinition>();
    for (const row of rows) {
      if (row.style && typeof row.style === "object") {
        map.set(row.id, { id: row.id, name: row.name, style: row.style as StyleClassDefinition["style"] });
      }
    }
    return map;
  } catch {
    // Style classes are a purely additive enhancement — if the API is
    // unreachable, every node just renders its own instance style as before
    // rather than failing the whole page.
    return new Map();
  }
});
