"use client";

import { useState } from "react";
import type { VideoPlaylistItem } from "@marwa/builder";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

function toEmbedUrl(url: string): string {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return url;
}

export function VideoPlaylistBlock({
  items,
  itemTitleColor,
  activeTitleColor,
  itemBackground,
  activeBackground,
}: {
  items: VideoPlaylistItem[];
  itemTitleColor?: string;
  activeTitleColor?: string;
  itemBackground?: string;
  activeBackground?: string;
}) {
  const [active, setActive] = useState(0);
  if (!items || items.length === 0) return null;
  const current = items[active];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "16px" }} className="max-md:grid-cols-1">
      <div style={{ aspectRatio: "16/9", borderRadius: "12px", overflow: "hidden", background: "#000" }}>
        {current.videoUrl && <iframe title={current.title} src={toEmbedUrl(current.videoUrl)} className="h-full w-full border-0" allowFullScreen />}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "360px", overflowY: "auto" }}>
        {items.map((item, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              background: i === active ? `var(--exr-activeBackground, ${activeBackground || "rgba(37,99,255,0.12)"})` : `var(--exr-itemBackground, ${itemBackground || "transparent"})`,
            }}
          >
            {item.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveImageUrl(item.thumbnail)} alt="" style={{ width: "56px", height: "40px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} />
            )}
            <span style={{ fontSize: "13px", fontWeight: i === active ? 700 : 500, color: i === active ? `var(--exr-activeTitleColor, ${activeTitleColor || "#2563FF"})` : `var(--exr-itemTitleColor, ${itemTitleColor || "inherit"})` }}>
              {item.title}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
