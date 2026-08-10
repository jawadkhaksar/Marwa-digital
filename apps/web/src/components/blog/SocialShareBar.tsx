"use client";

import { useState } from "react";

export function SocialShareBar({ url, title, vertical = false }: { url: string; title: string; vertical?: boolean }) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (non-secure context, permissions) — silently no-op rather than throw.
    }
  }

  const links = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ];

  return (
    <div className={vertical ? "flex flex-col items-center gap-2" : "flex items-center gap-2"}>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-border text-xs font-semibold text-foreground/70 transition-colors hover:border-gold hover:text-gold"
          title={`Share on ${l.label}`}
        >
          {l.label[0]}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        title="Copy Link"
        className={
          vertical
            ? "flex h-9 w-9 items-center justify-center rounded-full border border-ink-border text-[10px] font-semibold text-foreground/70 transition-colors hover:border-gold hover:text-gold"
            : "flex h-9 items-center rounded-full border border-ink-border px-3 text-xs font-semibold text-foreground/70 transition-colors hover:border-gold hover:text-gold"
        }
      >
        {vertical ? (copied ? "✓" : "🔗") : copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
