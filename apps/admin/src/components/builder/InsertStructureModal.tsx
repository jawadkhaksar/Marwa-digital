"use client";

import { useState } from "react";

/**
 * Two-step "add new section" flow triggered by the hover "+" button in the
 * live preview (see apps/web/.../PreviewBridge.tsx) — mirrors Elementor's
 * "Which layout would you like to use? → Select your structure" prompt.
 * Step 1 picks the new Section's `layoutMode`; step 2 picks how many equal
 * column-children to seed it with.
 */
export function InsertStructureModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (layoutMode: "flex" | "grid", columnCount: number) => void;
}) {
  const [step, setStep] = useState<"layout" | "structure">("layout");
  const [layoutMode, setLayoutMode] = useState<"flex" | "grid" | null>(null);

  if (!open) return null;

  function reset() {
    setStep("layout");
    setLayoutMode(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function pickLayout(mode: "flex" | "grid") {
    setLayoutMode(mode);
    setStep("structure");
  }

  function pickStructure(columnCount: number) {
    if (!layoutMode) return;
    onConfirm(layoutMode, columnCount);
    reset();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[480px] rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
      >
        {step === "layout" ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-100">Which layout would you like to use?</h2>
              <button type="button" onClick={handleClose} className="text-zinc-500 hover:text-zinc-300">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => pickLayout("flex")}
                className="flex flex-col items-center gap-2 rounded-lg border border-zinc-700 p-5 text-center hover:border-amber-400 hover:bg-zinc-800"
              >
                <div className="flex h-10 w-16 gap-1">
                  <div className="flex-1 rounded-sm bg-amber-400/70" />
                  <div className="flex-1 rounded-sm bg-amber-400/70" />
                  <div className="flex-1 rounded-sm bg-amber-400/70" />
                </div>
                <span className="text-sm font-medium text-zinc-100">Flexbox</span>
                <span className="text-xs text-zinc-500">Rows &amp; columns that adjust and wrap automatically</span>
              </button>
              <button
                type="button"
                onClick={() => pickLayout("grid")}
                className="flex flex-col items-center gap-2 rounded-lg border border-zinc-700 p-5 text-center hover:border-amber-400 hover:bg-zinc-800"
              >
                <div className="grid h-10 w-16 grid-cols-3 gap-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-sm bg-amber-400/70" />
                  ))}
                </div>
                <span className="text-sm font-medium text-zinc-100">Grid</span>
                <span className="text-xs text-zinc-500">Rows &amp; columns of fixed, explicit tracks</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setStep("layout")} className="text-zinc-500 hover:text-zinc-300" title="Back">
                  ←
                </button>
                <h2 className="text-base font-semibold text-zinc-100">Select your structure</h2>
              </div>
              <button type="button" onClick={handleClose} className="text-zinc-500 hover:text-zinc-300">
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => pickStructure(count)}
                  className="flex flex-col items-center gap-2 rounded-lg border border-zinc-700 p-4 hover:border-amber-400 hover:bg-zinc-800"
                >
                  <div className="flex h-10 w-full gap-1">
                    {Array.from({ length: count }).map((_, i) => (
                      <div key={i} className="flex-1 rounded-sm bg-amber-400/70" />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-400">{count === 1 ? "1 column" : `${count} columns`}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
