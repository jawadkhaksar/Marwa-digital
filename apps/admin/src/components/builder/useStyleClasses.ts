"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutNodeStyle } from "@marwa/builder";
import { api, type StyleClass } from "@/lib/api";

/**
 * Site-wide reusable StyleClass list for the Style tab's class chip/combobox
 * (Phase 2b) — fetched once per PropertyPanel mount and kept in sync with
 * local create/rename/delete so the UI doesn't need a full refetch after
 * every edit. Editing a class's own `style` (not exposed here — see
 * `updateStyle`) is what makes it "reusable": every node with that class
 * attached re-renders with the new style on next page load.
 */
export function useStyleClasses() {
  const [classes, setClasses] = useState<StyleClass[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.getStyleClasses();
      setClasses(rows);
    } catch {
      // Transient (e.g. the API dev server mid-restart) — leave whatever
      // classes are already loaded in place rather than crashing the whole
      // panel; the class chip/combobox just shows nothing new until the
      // next successful refresh() (e.g. reopening the panel).
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // refresh() flips setLoading(true) synchronously before its await —
    // same "spinner before the request resolves" pattern used throughout
    // this codebase's data-fetching effects.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const createClass = useCallback(async (name: string) => {
    const created = await api.createStyleClass({ name });
    setClasses((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created;
  }, []);

  const renameClass = useCallback(async (id: string, name: string) => {
    const updated = await api.updateStyleClass(id, { name });
    setClasses((prev) => prev.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name)));
    return updated;
  }, []);

  // Per-class request counter — guards the lost-update race below: every
  // commitStyle call in PropertyPanel merges its patch on top of
  // `activeClass.style` read from THIS hook's own `classes` state, so if
  // that state only updated once each PATCH's network round-trip finished,
  // rapidly editing several hover fields in a row (e.g. Text Color,
  // Background, Border Color, Box Shadow, one after another) would have
  // each new edit's request built from a stale pre-previous-edit snapshot,
  // silently dropping whichever edits lost the race — the class would end
  // up missing properties depending on response timing, which is exactly
  // "some hover styles don't apply" bug reports look like from the outside.
  const styleRequestSeq = useRef<Record<string, number>>({});

  const updateClassStyle = useCallback(async (id: string, style: LayoutNodeStyle) => {
    // Applied to local state immediately and synchronously (before the
    // network call), so the very next edit — even one fired before this
    // request resolves — reads the freshly-committed value instead of a
    // stale one.
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, style } : c)));
    const seq = (styleRequestSeq.current[id] ?? 0) + 1;
    styleRequestSeq.current[id] = seq;
    const updated = await api.updateStyleClass(id, { style });
    // Only reconcile with the server's response if no newer edit to this
    // same class has been made in the meantime — an out-of-order/slow
    // response for an older request must never clobber a newer optimistic
    // value still in flight.
    if (styleRequestSeq.current[id] === seq) {
      setClasses((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
    return updated;
  }, []);

  const deleteClass = useCallback(async (id: string) => {
    await api.deleteStyleClass(id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { classes, loading, refresh, createClass, renameClass, updateClassStyle, deleteClass };
}
