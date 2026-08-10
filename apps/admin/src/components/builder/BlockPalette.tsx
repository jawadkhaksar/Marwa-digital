"use client";

import React from "react";
import { BlockLibrarySidebar } from "./BlockLibrarySidebar";

export { BlockLibrarySidebar };

export function BlockPalette({
  onInsert,
  previewFrameRef,
  canvasScale,
}: {
  onInsert: (blockType: string) => void;
  previewFrameRef?: React.RefObject<HTMLIFrameElement | null>;
  canvasScale?: number;
}) {
  return <BlockLibrarySidebar onInsert={onInsert} className="h-full w-full" previewFrameRef={previewFrameRef} canvasScale={canvasScale} />;
}
