"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function IconWhatsapp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.93C21.96 6.45 17.5 2 12.04 2zm5.8 14.14c-.24.68-1.42 1.3-1.96 1.38-.5.08-1.14.11-1.83-.12-.42-.14-.97-.32-1.66-.63-2.93-1.27-4.84-4.24-4.99-4.44-.15-.2-1.19-1.58-1.19-3.02 0-1.43.75-2.13 1.02-2.43.27-.29.58-.36.78-.36.19 0 .39 0 .55.01.18.01.42-.07.66.5.24.6.83 2.07.9 2.22.07.15.12.32.02.52-.1.2-.15.32-.29.49-.15.17-.31.39-.44.52-.15.15-.3.31-.13.6.17.29.75 1.23 1.61 1.99 1.11.98 2.04 1.29 2.34 1.43.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.71.81 2 .95.29.15.48.22.55.34.07.13.07.73-.17 1.4z" />
    </svg>
  );
}

/** Digits + optional leading `+` — wa.me only accepts a bare number. */
function toWhatsappDigits(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

export function FloatingWhatsApp() {
  const [number, setNumber] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((settings) => setNumber(settings.whatsappNumber))
      .catch(() => {});
  }, []);

  if (!number) return null;
  const digits = toWhatsappDigits(number);
  if (!digits) return null;

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-6 left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/40 transition-transform hover:-translate-y-0.5"
    >
      <IconWhatsapp className="h-6 w-6" />
    </a>
  );
}
