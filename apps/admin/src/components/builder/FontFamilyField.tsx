"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SYSTEM_FONTS, GOOGLE_FONTS } from "@marwa/builder";

export function FontFamilyField({ label = "Family", value, onChange }: { label?: string; value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const q = query.trim().toLowerCase();
  const systemMatches = useMemo(() => (q ? SYSTEM_FONTS.filter((f) => f.toLowerCase().includes(q)) : SYSTEM_FONTS), [q]);
  const googleMatches = useMemo(() => (q ? GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(q)) : GOOGLE_FONTS), [q]);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1 block text-xs text-zinc-400">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-left text-sm"
      >
        <span style={{ fontFamily: value && value !== "inherit" ? value : undefined }}>{value && value !== "inherit" ? value : "Default"}</span>
        <span className="text-zinc-500">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-72 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          <div className="border-b border-zinc-800 p-2">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fonts…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => pick("inherit")}
              className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs ${value === "inherit" || !value ? "bg-amber-400/10 text-amber-300" : "text-zinc-300 hover:bg-zinc-800"}`}
            >
              Default
            </button>
            {systemMatches.length > 0 && (
              <>
                <p className="mt-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">System</p>
                {systemMatches.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => pick(f)}
                    style={{ fontFamily: f }}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs ${value === f ? "bg-amber-400/10 text-amber-300" : "text-zinc-300 hover:bg-zinc-800"}`}
                  >
                    {f}
                  </button>
                ))}
              </>
            )}
            {googleMatches.length > 0 && (
              <>
                <p className="mt-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Google</p>
                {googleMatches.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => pick(f)}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-xs ${value === f ? "bg-amber-400/10 text-amber-300" : "text-zinc-300 hover:bg-zinc-800"}`}
                  >
                    {f}
                  </button>
                ))}
              </>
            )}
            {systemMatches.length === 0 && googleMatches.length === 0 && <p className="px-2 py-2 text-xs text-zinc-500">No fonts match &quot;{query}&quot;.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
