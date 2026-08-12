// Theme values shared between the client ThemeProvider and the server root
// layout.
//
// These deliberately live OUTSIDE ThemeProvider.tsx. That file carries a
// "use client" directive, which makes every one of its exports a client
// *reference* when a Server Component imports it — not the value itself. The
// root layout is a Server Component, so reading NO_FLASH_THEME_SCRIPT from
// there yielded a proxy rather than the script source, and interpolating it
// produced Next's "Attempted to call NO_FLASH_THEME_SCRIPT() from the server"
// text where the theme script should have been. A module with no directive is
// importable from both sides and gives each the real value.

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const STORAGE_KEY = "theme";

/**
 * The theme applied when a visitor has no stored preference.
 *
 * Single source of truth on purpose: the provider's initial state and the
 * no-flash script below must agree exactly. If they disagree, the script
 * paints one theme and React immediately flips to the other — which is the
 * visible flash the script exists to prevent.
 */
export const DEFAULT_THEME: ResolvedTheme = "light";

/**
 * Applies the stored theme to <html> before first paint.
 *
 * Runs as a plain parser-executed inline script in the root layout rather
 * than through next/script: with `strategy="beforeInteractive"` and inline
 * content, next/script does not emit the code inline at all — it emits a stub
 * that pushes onto `self.__next_s` for Next's runtime to drain later (see
 * node_modules/next/dist/client/script.js), which is well after first paint
 * and so defeats the entire purpose.
 */
export const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}")||"${DEFAULT_THEME}";var r=t==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.classList.add(r);}catch(e){}})();`;
