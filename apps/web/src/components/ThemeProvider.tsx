"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

import { DEFAULT_THEME, NO_FLASH_THEME_SCRIPT, STORAGE_KEY, type ResolvedTheme, type Theme } from "./themeConstants";

export { DEFAULT_THEME, NO_FLASH_THEME_SCRIPT, STORAGE_KEY };
export type { ResolvedTheme, Theme };

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

// Re-exported from ./themeConstants so callers already importing these from
// this module keep working; both build the exact same
// localStorage key without duplicating the literal string.

// The site ships light. Declared once so the client hook, the server render
// and the no-flash inline script below can never disagree — a mismatch there
// shows up as a visible theme flash on first paint.
const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

// Both stored theme and OS preference are read via useSyncExternalStore
// rather than a useState+useEffect pair — getServerSnapshot is what SSR and
// the client's first render both see, so hydration never mismatches, and it
// re-renders with the real client value immediately after. Bonus: the OS
// preference's "change" subscription replaces what used to be a second,
// separate effect (see the old matchMedia listener this superseded).
function noSubscribe() {
  return () => {};
}
function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}
function getServerTheme(): Theme {
  return DEFAULT_THEME;
}
function subscribeSystemTheme(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getServerSystemTheme(): ResolvedTheme {
  return DEFAULT_THEME;
}

/**
 * Hand-rolled replacement for `next-themes`. The script source and the
 * shared defaults live in ./themeConstants (see the note there on why they
 * cannot live in this file); this module owns the React state and the DOM
 * sync only.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default is DEFAULT_THEME, not "system" — resolving an unset preference
  // from the OS means a visitor's first paint depends on their machine, and
  // the site's sections are authored against one ground. The toggle can still
  // switch a visitor to the other theme; this only fixes the unset,
  // first-visit default. Read from the shared constant rather than repeating
  // a literal, so this can't drift out of step with the no-flash script.
  const storedTheme = useSyncExternalStore(noSubscribe, getStoredTheme, getServerTheme);
  const systemPreference = useSyncExternalStore(subscribeSystemTheme, systemTheme, getServerSystemTheme);
  const [themeOverride, setThemeOverride] = useState<Theme | null>(null);
  const theme = themeOverride ?? storedTheme;
  const resolvedTheme = theme === "system" ? systemPreference : theme;

  // Keeps the DOM class in sync whenever the resolved theme changes for any
  // reason (stored/system value settling in after mount, an OS preference
  // change, or a manual setTheme() below) — a real DOM-sync effect, not a
  // React state update, so it isn't subject to the same rule.
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeOverride(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
  }, []);

  return <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/** Inlined into the root layout's own plain `<script>` tag — see the doc comment above. */
