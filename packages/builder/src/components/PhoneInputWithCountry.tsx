"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRY_DIAL_CODES } from "../countries";
import { isValidPhone } from "../phoneValidation";
import { FlagIcon } from "./FlagIcon";

// Longest dial code first so "+1" doesn't shadow a (hypothetical) longer
// code sharing the same prefix when splitting a stored "+43660…" value.
const SORTED_DIAL_CODES = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);

function splitValue(value: string, defaultIso2: string): { iso2: string; localDigits: string } {
  const trimmed = value.trim();
  const match = SORTED_DIAL_CODES.find((c) => trimmed.startsWith(c.dialCode));
  if (match) return { iso2: match.iso2, localDigits: trimmed.slice(match.dialCode.length).replace(/[^\d]/g, "") };
  const fallback = COUNTRY_DIAL_CODES.find((c) => c.iso2 === defaultIso2) ?? COUNTRY_DIAL_CODES[0];
  return { iso2: fallback.iso2, localDigits: trimmed.replace(/[^\d]/g, "") };
}

const DEFAULT_INPUT_CLASS =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none";
const DEFAULT_BUTTON_CLASS =
  "shrink-0 flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none";
const DEFAULT_DROPDOWN_CLASS = "border-zinc-700 bg-zinc-950 text-zinc-100";

export interface PhoneInputWithCountryProps {
  /** Full stored value, e.g. "+436601234567". Empty string when unset. */
  value: string;
  /** Fires with the full value in E.164 format (no spaces) on every keystroke/country change. */
  onChange: (value: string) => void;
  /** ISO2 to assume when `value` is empty or doesn't match a known dial code. Defaults to Austria. */
  defaultCountry?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** Show the country flag icon next to the dial code. Defaults to true; set false for denser admin UIs that just want the code. */
  showFlag?: boolean;
  /** Classes for both the country-select button and the number input — override per call site to match the surrounding form's theme. The button forces `width: fit-content` inline regardless, since every call site's class includes "w-full" for the input and Tailwind's cascade order can't be relied on to let a later "w-fit" class win over it. */
  inputClassName?: string;
  /** Classes for the dropdown panel background/border/text (light vs. dark theme). */
  dropdownClassName?: string;
  /** Hover-state class for each row in the dropdown — the default assumes a dark panel; pass e.g. "hover:bg-black/5" for a light one. */
  dropdownItemHoverClassName?: string;
  /** Background class applied to the currently-selected row (no `hover:` prefix) — pass e.g. "bg-black/5" for a light panel. */
  dropdownItemSelectedClassName?: string;
}

/**
 * Flag + searchable dial-code dropdown paired with a local-number input.
 * Generalizes the same UX already proven in the Form Block's "tel"
 * field (apps/web/src/components/builder/FormBlock.tsx) into a plain,
 * theme-agnostic component any form can drop in — that one stays as-is
 * since it threads the builder's own per-node Style tab colors, which
 * this component has no equivalent of.
 */
export function PhoneInputWithCountry({
  value,
  onChange,
  defaultCountry = "AT",
  placeholder,
  id,
  name,
  required,
  disabled,
  showFlag = true,
  inputClassName = DEFAULT_INPUT_CLASS,
  dropdownClassName = DEFAULT_DROPDOWN_CLASS,
  dropdownItemHoverClassName = "hover:bg-white/10",
  dropdownItemSelectedClassName = "bg-white/10",
}: PhoneInputWithCountryProps) {
  const { iso2, localDigits } = splitValue(value, defaultCountry);
  const selected = COUNTRY_DIAL_CODES.find((c) => c.iso2 === iso2) ?? COUNTRY_DIAL_CODES[0];

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [touched, setTouched] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Only flag as invalid after the visitor leaves the field, not while
  // they're still mid-digit — libphonenumber correctly reports an
  // in-progress number as invalid, so checking on every keystroke would
  // show red for the entire time someone is typing.
  const showInvalid = touched && localDigits.length > 0 && !isValidPhone(value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const filtered = COUNTRY_DIAL_CODES.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.dialCode.includes(search) || c.iso2.toLowerCase().includes(search.toLowerCase())
  );

  function selectCountry(nextIso2: string) {
    const dialCode = COUNTRY_DIAL_CODES.find((c) => c.iso2 === nextIso2)?.dialCode ?? selected.dialCode;
    onChange(localDigits ? `${dialCode}${localDigits}` : dialCode);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative flex gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={inputClassName ? `${inputClassName} shrink-0 flex items-center gap-1.5 whitespace-nowrap` : DEFAULT_BUTTON_CLASS}
        // Every call site's inputClassName includes "w-full" (needed on the
        // number input next to it) — Tailwind's generated stylesheet order
        // isn't something we control from className string order, so an
        // inline style is the only reliable way to force this button back
        // to content-sized instead of claiming the full row.
        style={{ width: "fit-content" }}
        aria-label="Country code"
        aria-expanded={open}
      >
        {showFlag && <FlagIcon iso2={selected.iso2} />}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span>{selected.dialCode}</span>
      </button>

      <input
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        type="tel"
        inputMode="tel"
        pattern="^[0-9]{3,15}$"
        title="Enter a valid phone number (digits only, no country code)"
        placeholder={placeholder}
        value={localDigits}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^\d]/g, "");
          onChange(digits ? `${selected.dialCode}${digits}` : "");
        }}
        onBlur={() => setTouched(true)}
        aria-invalid={showInvalid}
        className={`${inputClassName} min-w-0 flex-1 ${showInvalid ? "!border-red-500" : ""}`}
      />
      {showInvalid && <p className="absolute left-0 top-full mt-1 text-xs text-red-500">Enter a valid phone number</p>}

      {open && (
        <div className={`absolute left-0 top-[calc(100%+4px)] z-50 flex max-h-72 w-64 flex-col overflow-hidden rounded-lg border shadow-2xl ${dropdownClassName}`}>
          <div className="shrink-0 border-b border-inherit p-2">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full rounded border border-inherit bg-transparent px-2 py-1.5 text-sm outline-none"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && <p className="px-3 py-3 text-sm opacity-60">No matches</p>}
            {filtered.map((c) => (
              <button
                key={c.iso2}
                type="button"
                onClick={() => selectCountry(c.iso2)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${dropdownItemHoverClassName} ${c.iso2 === iso2 ? dropdownItemSelectedClassName : ""}`}
              >
                {showFlag && <FlagIcon iso2={c.iso2} />}
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="shrink-0 opacity-60">({c.dialCode})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
