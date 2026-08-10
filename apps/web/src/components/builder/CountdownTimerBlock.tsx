"use client";

import { useEffect, useState } from "react";

function timeLeft(target: number) {
  const diff = Math.max(0, target - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: diff <= 0,
  };
}

export function CountdownTimerBlock({
  targetDate,
  expiredMessage,
  dayLabel,
  hourLabel,
  minuteLabel,
  secondLabel,
  numberColor,
  numberBackground,
  numberFontSize,
  labelColor,
  labelFontSize,
  accentColor,
  unitGap,
}: {
  targetDate?: string;
  expiredMessage?: string;
  dayLabel?: string;
  hourLabel?: string;
  minuteLabel?: string;
  secondLabel?: string;
  numberColor?: string;
  numberBackground?: string;
  numberFontSize?: string;
  labelColor?: string;
  labelFontSize?: string;
  accentColor?: string;
  unitGap?: string;
}) {
  const target = targetDate ? new Date(targetDate).getTime() : NaN;
  const [now, setNow] = useState<ReturnType<typeof timeLeft> | null>(null);

  useEffect(() => {
    if (Number.isNaN(target)) return;
    // Sets the first value immediately (not waiting a full second for the
    // interval's first tick) — a real "sync from an external clock" effect,
    // just triggered directly rather than from inside setInterval's own
    // callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(timeLeft(target));
    const id = setInterval(() => setNow(timeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!targetDate || Number.isNaN(target)) return null;
  // Server-render + first client render both show nothing until mounted, to
  // avoid a hydration mismatch against the real (server-time-dependent)
  // countdown value.
  if (!now) return null;

  if (now.expired) {
    return <p style={{ color: accentColor || "#2563FF", fontWeight: 600 }}>{expiredMessage || "This offer has ended."}</p>;
  }

  const units = [
    { value: now.days, label: dayLabel || "Days" },
    { value: now.hours, label: hourLabel || "Hours" },
    { value: now.minutes, label: minuteLabel || "Minutes" },
    { value: now.seconds, label: secondLabel || "Seconds" },
  ];

  return (
    <div style={{ display: "flex", gap: unitGap || "16px" }}>
      {units.map((unit) => (
        <div key={unit.label} style={{ textAlign: "center" }}>
          <div
            style={{
              minWidth: "64px",
              padding: "12px 10px",
              borderRadius: "10px",
              background: `var(--exr-numberBackground, ${numberBackground || "rgba(37,99,255,0.1)"})`,
              color: `var(--exr-numberColor, ${numberColor || accentColor || "#2563FF"})`,
              fontSize: `var(--exr-numberFontSize, ${numberFontSize || "32px"})`,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {String(unit.value).padStart(2, "0")}
          </div>
          <div style={{ marginTop: "6px", color: `var(--exr-labelColor, ${labelColor || "inherit"})`, fontSize: `var(--exr-labelFontSize, ${labelFontSize || "11px"})`, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}
