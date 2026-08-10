import * as Fa6Icons from "react-icons/fa6";
import type { IconType } from "react-icons";
import type { ComponentType } from "react";
import {
  IconCar,
  IconPlane,
  IconCalendar,
  IconClock,
  IconMountain,
  IconPerson,
  IconLuggage,
  IconMail,
  IconPin,
  IconPhone,
  IconCheck,
  IconStar,
  IconInfo,
} from "@/components/home/icons";

const LIBRARY = Fa6Icons as unknown as Record<string, IconType>;

/** Resolves an admin-picked Icon Library key (e.g. "FaStar") to its component. Namespace import intentionally — see the note on IconLibraryPicker in apps/admin for why. */
export function resolveLibraryIcon(name: string): IconType | undefined {
  return LIBRARY[name];
}

/** The original ~13-icon hand-drawn set, from before the searchable react-icons/fa6 library existed — kept only so pages saved back then (whose `icon` value is one of these bare keys, e.g. "star") keep rendering. Never offered as a choice for new content; `resolveIconValue` falls back to it automatically. */
export const LEGACY_ICON_COMPONENTS: Record<string, ComponentType<{ className?: string }>> = {
  car: IconCar,
  plane: IconPlane,
  calendar: IconCalendar,
  clock: IconClock,
  mountain: IconMountain,
  person: IconPerson,
  luggage: IconLuggage,
  mail: IconMail,
  pin: IconPin,
  phone: IconPhone,
  check: IconCheck,
  star: IconStar,
  info: IconInfo,
};

export type ResolvedIcon =
  | { kind: "library"; Component: IconType }
  | { kind: "legacy"; Component: ComponentType<{ className?: string }> }
  | { kind: "inline"; markup: string }
  | { kind: "file"; url: string }
  | { kind: "none" };

/**
 * Single entry point for every icon-bearing block/field in the builder — an
 * `icon` prop's value can now be any of four shapes, all stored in the same
 * plain string field (no schema change needed, so every page saved before
 * this existed keeps rendering unchanged):
 *   1. A react-icons/fa6 component name picked from the searchable Icon
 *      Library (e.g. "FaStar") — the common case.
 *   2. One of the ~13 legacy hand-drawn keys (e.g. "star") from before that
 *      library existed.
 *   3. Raw `<svg>...</svg>` markup pasted directly into the picker.
 *   4. A URL (returned by the media-upload endpoint, which already accepts
 *      `image/svg+xml`) for an uploaded SVG *file*.
 * Order matters: shape is checked before any name lookup, since neither a
 * `<svg` prefix nor a URL could ever collide with a bare library/legacy key.
 */
export function resolveIconValue(value: string | undefined | null): ResolvedIcon {
  if (!value) return { kind: "none" };
  const trimmed = value.trim();
  if (!trimmed) return { kind: "none" };
  if (trimmed.startsWith("<svg")) return { kind: "inline", markup: trimmed };
  if (/^(https?:|data:|\/)/i.test(trimmed)) return { kind: "file", url: trimmed };
  const lib = LIBRARY[trimmed];
  if (lib) return { kind: "library", Component: lib };
  const legacy = LEGACY_ICON_COMPONENTS[trimmed];
  if (legacy) return { kind: "legacy", Component: legacy };
  return { kind: "none" };
}
