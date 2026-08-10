"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type TimedAnimation } from "@/lib/api";

/**
 * Site-wide reusable Timed Animations list ("Start an animation" in the
 * Interactions tab) — mirrors useStyleClasses.ts's fetch/create/rename/
 * delete pattern for the same shared-resource shape.
 */
export function useTimedAnimations() {
  const [animations, setAnimations] = useState<TimedAnimation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAnimations(await api.getTimedAnimations());
    } catch {
      // Transient (e.g. the API dev server mid-restart) — leave whatever
      // animations are already loaded in place rather than crashing the
      // whole panel; see useStyleClasses.ts's identical fix.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // See useStyleClasses.ts's identical pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const createAnimation = useCallback(async (name: string) => {
    const created = await api.createTimedAnimation({ name });
    setAnimations((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const renameAnimation = useCallback(async (id: string, name: string) => {
    const updated = await api.updateTimedAnimation(id, { name });
    setAnimations((prev) => prev.map((a) => (a.id === id ? updated : a)).sort((a, b) => a.name.localeCompare(b.name)));
    return updated;
  }, []);

  const updateAnimationTimeline = useCallback(async (id: string, timeline: TimedAnimation["timeline"]) => {
    const updated = await api.updateTimedAnimation(id, { timeline });
    setAnimations((prev) => prev.map((a) => (a.id === id ? updated : a)));
    return updated;
  }, []);

  const deleteAnimation = useCallback(async (id: string) => {
    await api.deleteTimedAnimation(id);
    setAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { animations, loading, refresh, createAnimation, renameAnimation, updateAnimationTimeline, deleteAnimation };
}
