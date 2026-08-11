"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

// Exported (not just module-private) so the root layout's inline no-flash
// script — see NO_FLASH_THEME_SCRIPT below — can build the exact same
// localStorage key without duplicating the literal string.
export const STORAGE_KEY = "theme";

// The site ships light. Declared once so the client hook, the server render
// and the no-flash inline script below can never disagree — a mismatch there
// shows up as a visible theme flash on first paint.
const DEFAULT_THEME: ResolvedTheme = "light";
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
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "dark";
  } catch {
    return "dark";
  }
}
function getServerTheme(): Theme {
  return "dark";
}
function subscribeSystemTheme(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getServerSystemTheme(): ResolvedTheme {
  return "dark";
}

/**
 * Hand-rolled replacement for `next-themes`. Only the script *source* lives
 * here (NO_FLASH_THEME_SCRIPT below); the tag that carries it is authored as
 * a plain `<script>` in the root layout (apps/web/src/app/layout.tsx), whose
 * Server Component render is the whole point — React only warns "Scripts
 * inside React components are never executed" when it has to *create* a
 * script element during a client render, and a server-rendered tag is merely
 * hydrated.
 *
 * Two earlier approaches both hit that warning, for the same underlying
 * reason: rendering the tag from a component exported from this file (the
 * `"use client"` directive makes every export a Client Component no matter
 * where it's rendered from), and `next/script` with `strategy="beforeInteractive"`
 * (next/script is itself a Client Component, and its App Router branch
 * renders a real `<script>` that pushes onto Next's `self.__next_s` queue —
 * see node_modules/next/dist/client/script.js). The plain tag is also
 * *earlier* than beforeInteractive, which can't run until Next's runtime
 * drains that queue; here the browser executes it while parsing, before any
 * of the body paints.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default is "dark", not "system" — a visitor on a light-OS browser with
  // no stored preference used to resolve to the light theme, which broke
  // any section with a hardcoded dark background (its text pulls the
  // theme-flipping --foreground/--ink-muted tokens, which go near-black in
  // light mode and become nearly invisible against that fixed-dark section).
  // The toggle can still switch a visitor to light; this only changes the
  // unset, first-visit default.
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
export const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")||"light";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.classList.add(r);}catch(e){}})();`;
