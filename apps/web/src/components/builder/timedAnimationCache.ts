import { cache } from "react";
import type { TimedAnimationDefinition } from "@marwa/builder";
import { api } from "@/lib/api";

/**
 * Site-wide reusable Timed Animations, fetched once per request — same
 * pattern as styleClassCache.ts's getStyleClassesMap. A trigger that
 * references one by id resolves its real keyframe data from here at render
 * time (see resolveTimedAnimation in LayoutRenderer.tsx) instead of
 * carrying its own inline tracks.
 */
export const getTimedAnimationsMap = cache(async (): Promise<Map<string, TimedAnimationDefinition>> => {
  try {
    const rows = await api.getTimedAnimations();
    const map = new Map<string, TimedAnimationDefinition>();
    for (const row of rows) {
      if (row.timeline && typeof row.timeline === "object") {
        map.set(row.id, { id: row.id, name: row.name, timeline: row.timeline as TimedAnimationDefinition["timeline"] });
      }
    }
    return map;
  } catch {
    return new Map();
  }
});
