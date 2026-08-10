"use client";

/**
 * Rendered as a container block's `children` whenever it has none — but only
 * when `isBuilderPreview` is explicitly true. That flag is decided
 * server-side (see each page route reading `__builder_preview` from
 * `searchParams`) and threaded down through LayoutRenderer as a real React
 * prop, so this component's markup simply does not exist in a real
 * visitor's HTML at all — no CSS hiding, no client-side iframe/URL
 * detection deciding visibility after the fact.
 */
export function EmptyContainerDropzone({ blockId, isBuilderPreview }: { blockId: string; isBuilderPreview: boolean }) {
  if (!isBuilderPreview) return null;

  return (
    <div className="exr-empty-dropzone" data-empty-dropzone-for={blockId}>
      <button
        type="button"
        className="exr-empty-dropzone-btn"
        aria-label="Add a widget here"
        onClick={(e) => {
          e.stopPropagation();
          window.parent.postMessage({ source: "marwa-preview", action: "select", blockId }, "*");
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        +
      </button>
      <span className="exr-empty-dropzone-label">Drag widget here</span>
    </div>
  );
}
