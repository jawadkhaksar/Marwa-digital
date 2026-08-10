"use client";

import * as Flags from "country-flag-icons/react/3x2";
import type { ComponentType } from "react";

// Regional-indicator emoji flags (the previous approach) render as plain
// two-letter text ("AT") instead of an actual flag on Windows — none of its
// built-in fonts draw the flag glyph for that codepoint sequence, unlike
// macOS/iOS/Android. Real SVG flags render identically everywhere.
const FLAG_COMPONENTS = Flags as unknown as Record<string, ComponentType<{ className?: string; title?: string }>>;

export function FlagIcon({ iso2, className }: { iso2: string; className?: string }) {
  const Flag = FLAG_COMPONENTS[iso2.toUpperCase()];
  if (!Flag) return null;
  return <Flag title={iso2} className={className ?? "h-3.5 w-5 shrink-0 rounded-[2px] object-cover"} />;
}
