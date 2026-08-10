"use client";

import { useEffect, useRef, useState } from "react";
import { IconClock, IconChevron } from "./home/icons";
import { toISODate } from "./DatePicker";

const SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

/** "14:00" -> "2:00 PM" — the stored/compared value stays 24h "HH:mm", only the label changes. */
function formatTime12h(slot: string): string {
  const [hStr, mStr] = slot.split(":");
  const h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${period}`;
}

export function TimePicker({
  label,
  value,
  onChange,
  date,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  date: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const now = new Date();
  const isToday = date === toISODate(now);
  const minMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  function isDisabled(slot: string) {
    if (!isToday) return false;
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m < minMinutes;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-md"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
            <IconClock className="h-3.5 w-3.5" /> {label}
          </span>
          <span className="mt-1 block truncate text-sm font-medium text-foreground">{value ? formatTime12h(value) : "Select time"}</span>
        </span>
        <IconChevron className={`h-4 w-4 shrink-0 text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#1c1c1c] p-2 shadow-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SLOTS.map((slot) => {
            const disabled = isDisabled(slot);
            return (
              <button
                key={slot}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(slot);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  slot === value
                    ? "bg-gold text-white"
                    : disabled
                      ? "cursor-not-allowed text-foreground/20"
                      : "text-foreground/80 hover:bg-white/10"
                }`}
              >
                {formatTime12h(slot)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
