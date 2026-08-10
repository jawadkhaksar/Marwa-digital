"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

export interface DropdownPreviewItem {
  id: string;
  label: string;
  href: string;
  openInNewTab?: boolean;
  previewImage?: string | null;
}

/**
 * Generalized, data-driven version of MiniServicePreview (the site's
 * original hard-coded "Service" dropdown) — same visual language (dark
 * gradient panel, gold hover highlight, swap-on-hover image), but built
 * from a menu item's real `children` instead of a fixed 3-item list. Falls
 * back to a plain list (no image column) when none of the items have a
 * Preview Image set in Admin → Menus.
 */
export function MenuDropdownPreview({ items, className }: { items: DropdownPreviewItem[]; className?: string }) {
  const hasImages = items.some((i) => i.previewImage);
  const [active, setActive] = useState(0);
  const imgRef = useRef<HTMLDivElement | null>(null);
  const activeImage = items[active]?.previewImage;

  function select(index: number) {
    if (index === active) return;
    setActive(index);
    if (imgRef.current) {
      gsap.fromTo(imgRef.current, { opacity: 0.2 }, { opacity: 1, duration: 0.35, ease: "power2.out" });
    }
  }

  return (
    <div
      className={`flex items-stretch rounded-[6px] border-[0.5px] border-[#555555] p-2 gap-2 shadow-2xl backdrop-blur-md ${className ?? ""}`}
      style={{
        background:
          "radial-gradient(95.94% 265.84% at -7.89% 112.42%, rgba(255, 255, 255, 0.25) 0%, rgba(0, 0, 0, 0.25) 100%), radial-gradient(38.14% 268.59% at 17.37% 138.64%, rgba(37, 99, 255, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%)",
      }}
    >
      <ul className={`flex flex-col gap-2 ${hasImages ? "w-48" : "w-56"}`}>
        {items.map((item, i) => (
          <li key={item.id} className="flex-1">
            <a
              href={item.href}
              target={item.openInNewTab ? "_blank" : undefined}
              rel={item.openInNewTab ? "noopener noreferrer" : undefined}
              onMouseEnter={() => hasImages && select(i)}
              className={`flex h-full w-full items-center justify-start rounded-[6px] px-5 py-3 text-[15px] font-medium transition-all ${
                hasImages && active === i ? "text-gold border-[0.5px] border-[#555555]/50 shadow-inner" : "text-white/80 hover:text-white"
              }`}
              style={
                hasImages
                  ? {
                      background:
                        active === i
                          ? "radial-gradient(38.14% 268.59% at 17.37% 138.64%, rgba(37, 99, 255, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%)"
                          : "radial-gradient(93.22% 596.83% at -37.71% 120.45%, rgba(255, 255, 255, 0.5) 0%, rgba(0, 0, 0, 0.5) 100%)",
                    }
                  : undefined
              }
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      {hasImages && activeImage && (
        <div ref={imgRef} className="relative w-[280px] shrink-0 self-stretch overflow-hidden rounded-[4px]">
          {/* Admin-uploaded, cross-origin (served from the API's /uploads/
              route) — same reasoning as ImageBox/SiteLogo's own <img>: avoids
              depending on next/image's remote-optimizer config for content
              that isn't a same-origin /public asset like MiniServicePreview's. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveImageUrl(activeImage)} alt={items[active]?.label ?? ""} className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}
