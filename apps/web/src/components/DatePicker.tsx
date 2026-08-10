"use client";

import { useEffect, useRef, useState } from "react";
import { IconCalendar, IconChevron } from "./home/icons";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const today = startOfDay(new Date());
  const selected = value ? startOfDay(new Date(`${value}T00:00`)) : null;
  const [viewDate, setViewDate] = useState(() => selected ?? today);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goMonth(delta: number) {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  function selectDay(d: Date) {
    if (startOfDay(d) < today) return;
    onChange(toISODate(d));
    setOpen(false);
  }

  const formatted = selected
    ? selected.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-md"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
            <IconCalendar className="h-3.5 w-3.5" /> {label}
          </span>
          <span className="mt-1 block truncate text-sm font-medium text-foreground">{formatted || "Select date"}</span>
        </span>
        <IconChevron className={`h-4 w-4 shrink-0 text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-white/10 bg-[#1c1c1c] p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <IconChevron className="h-4 w-4 rotate-90" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <IconChevron className="h-4 w-4 -rotate-90" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-foreground/40">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const disabled = startOfDay(d) < today;
              const isSelected = selected !== null && toISODate(d) === toISODate(selected);
              const isToday = toISODate(d) === toISODate(today);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(d)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-gold text-white"
                      : disabled
                        ? "cursor-not-allowed text-foreground/20"
                        : isToday
                          ? "text-gold hover:bg-white/10"
                          : "text-foreground/80 hover:bg-white/10"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-foreground/50 hover:text-foreground"
            >
              Clear
            </button>
            <button type="button" onClick={() => selectDay(today)} className="text-gold hover:text-gold-dark">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
