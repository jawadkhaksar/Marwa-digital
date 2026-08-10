"use client";

import { useTheme } from "./ThemeProvider";
import { useMounted } from "@/lib/useMounted";

function IconSun({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Manual light/dark override on top of next-themes' `enableSystem` (which
 * already covers "Automatic Light/Dark Mode"). Only ever mounted inside
 * SiteHeader, which is permanently dark chrome by design (it overlays the
 * Hero photo, and its "solid" inner-page variant is a fixed dark bar too) —
 * so this intentionally uses hardcoded white/gold, matching the header's
 * own De/En language buttons, instead of the theme-flipping `foreground`
 * token which would go invisible against that always-dark background.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) return <div className={`h-8 w-8 ${className ?? ""}`} />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:text-gold ${className ?? ""}`}
    >
      {isDark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
    </button>
  );
}
