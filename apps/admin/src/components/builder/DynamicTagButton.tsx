"use client";

import { useRef, useState, type ReactNode, type RefObject } from "react";
import { DYNAMIC_TAGS, DYNAMIC_TAG_CATEGORY_LABELS, type DynamicTagDef, type DynamicTagCategory } from "@marwa/builder";

// Same anchored-popover mechanism already proven for BorderWidthField/
// BorderRadiusField in PropertyPanel.tsx — duplicated here rather than
// exported from that (already very large) file, since it's small,
// self-contained, and has zero dependency on anything else in there.
function useAnchoredPopover<T extends HTMLElement>() {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<T>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function toggle() {
    if (!open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: Math.min(rect.left, window.innerWidth - 248) });
    }
    setOpen((v) => !v);
  }

  return { open, setOpen, anchorRef, pos, toggle };
}

function TagPopoverShell({ pos, onClose, children }: { pos: { top: number; left: number }; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 max-h-80 w-60 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-2 shadow-2xl" style={{ top: pos.top, left: pos.left }}>
        {children}
      </div>
    </>
  );
}

function DatabaseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  );
}

/**
 * Global Dynamic Tags trigger — the small icon that opens a categorized
 * `{{tag.key}}` picker (catalog: packages/builder/src/dynamicTags.ts).
 * Wired into PropertyPanel's generic text/textarea/image field rendering
 * (PropField), so it's automatically present on every plain string field
 * across all block types, current and future — no per-block registration.
 *
 * Two insertion modes:
 * - Text/textarea (`inputRef` provided): inserts the token at the field's
 *   last known cursor position — captured on icon click, *before* the
 *   popover steals focus from the input — so tokens can mix with static
 *   text ("Read {{post.title}} now"), not just replace the whole value.
 * - Image fields (`inputRef` omitted): image tokens are whole-value-only
 *   (a src can't sensibly be half-token), so `onInsert` always receives
 *   just the bare `{{tag.key}}` token — PropField's image branch treats
 *   that as a full replacement, not an insertion.
 */
export function DynamicTagButton({
  inputRef,
  currentValue,
  onInsert,
  onSelectToken,
  filter,
}: {
  inputRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  currentValue?: string;
  onInsert?: (nextValue: string, tagKey: string) => void;
  /** Escape hatch for consumers that can't be modeled as "splice a plain
   *  string value" — e.g. the Tiptap rich-text editor, which owns its own
   *  cursor/selection state internally and has its own insertContent
   *  command. When provided, this wins over inputRef/onInsert entirely: the
   *  button just reports which token was picked and lets the caller decide
   *  how to apply it. */
  onSelectToken?: (token: string, tagKey: string) => void;
  filter?: (tag: DynamicTagDef) => boolean;
}) {
  const { open, setOpen, anchorRef, pos, toggle } = useAnchoredPopover<HTMLButtonElement>();
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const tags = filter ? DYNAMIC_TAGS.filter(filter) : DYNAMIC_TAGS;
  const categories = Array.from(new Set(tags.map((t) => t.category))) as DynamicTagCategory[];

  function handleToggle() {
    if (inputRef?.current) {
      const len = currentValue?.length ?? 0;
      selectionRef.current = {
        start: inputRef.current.selectionStart ?? len,
        end: inputRef.current.selectionEnd ?? len,
      };
    }
    toggle();
  }

  function selectTag(tag: DynamicTagDef) {
    const token = `{{${tag.key}}}`;
    if (onSelectToken) {
      onSelectToken(token, tag.key);
    } else if (inputRef && selectionRef.current) {
      const value = currentValue ?? "";
      const { start, end } = selectionRef.current;
      onInsert?.(value.slice(0, start) + token + value.slice(end), tag.key);
    } else {
      onInsert?.(token, tag.key);
    }
    setOpen(false);
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={handleToggle}
        title="Insert dynamic tag"
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${
          open ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <DatabaseIcon />
      </button>
      {open && (
        <TagPopoverShell pos={pos} onClose={() => setOpen(false)}>
          {categories.map((category) => (
            <div key={category} className="mb-2 last:mb-0">
              <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{DYNAMIC_TAG_CATEGORY_LABELS[category]}</p>
              {tags
                .filter((t) => t.category === category)
                .map((tag) => (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => selectTag(tag)}
                    className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800"
                  >
                    {tag.label}
                  </button>
                ))}
            </div>
          ))}
        </TagPopoverShell>
      )}
    </>
  );
}
