"use client";

/**
 * Rendered once, at the end of the page's top-level block list (see
 * LayoutRenderer.tsx) — but only when `isBuilderPreview` is explicitly true.
 * Same server-decided, prop-gated design as EmptyContainerDropzone: no CSS
 * hiding, no client-side detection — a real visitor's HTML never contains
 * this markup at all.
 */
export function CanvasAddSectionBanner({ isBuilderPreview }: { isBuilderPreview: boolean }) {
  if (!isBuilderPreview) return null;

  return (
    <div className="exr-canvas-add-banner" data-canvas-bottom-banner>
      <div className="exr-canvas-add-banner-row">
        <button
          type="button"
          title="Add a new section"
          className="exr-canvas-add-banner-btn"
          onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-insert-structure" }, "*")}
          onContextMenu={(e) => e.preventDefault()}
        >
          +
        </button>
        <button type="button" title="Template Library (coming soon)" className="exr-canvas-add-banner-btn" disabled>
          🗀
        </button>
        <button type="button" title="AI Generator (coming soon)" className="exr-canvas-add-banner-btn" disabled>
          ✦
        </button>
        <button
          type="button"
          title="Choose a layout structure"
          className="exr-canvas-add-banner-btn"
          onClick={() => window.parent.postMessage({ source: "marwa-preview", action: "request-insert-structure" }, "*")}
          onContextMenu={(e) => e.preventDefault()}
        >
          ◎
        </button>
      </div>
      <span className="exr-canvas-add-banner-label">Drag widget here</span>
    </div>
  );
}
