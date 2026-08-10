"use client";

import { useRef } from "react";
import { isDynamicToken, extractDynamicTagKey, getDynamicTagLabel } from "@marwa/builder";
import { ImagePicker } from "@/components/ImagePicker";
import { DynamicTagButton } from "@/components/builder/DynamicTagButton";

const DEFAULT_INPUT_CLASS = "w-full min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs focus:border-amber-400 focus:outline-none";

/** A plain text `<input>` with the Global Dynamic Tags trigger attached —
 *  the same wrapper PropField's default "text" branch uses, factored out so
 *  every bespoke (non-PropField) block editor (SimpleRepeaterEditor,
 *  SlidesEditor, ServiceItemsEditor, IconListEditor, StringListEditor, ...)
 *  gets identical behavior without re-implementing the ref/cursor-insert
 *  wiring each time. */
export function DynamicTextInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className ?? DEFAULT_INPUT_CLASS}
      />
      <DynamicTagButton inputRef={ref} currentValue={value} onInsert={(next) => onChange(next)} />
    </div>
  );
}

/** Textarea counterpart to DynamicTextInput. */
export function DynamicTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="flex items-start gap-1.5">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={className ?? DEFAULT_INPUT_CLASS}
      />
      <DynamicTagButton inputRef={ref} currentValue={value} onInsert={(next) => onChange(next)} />
    </div>
  );
}

/** Image-field counterpart — whole-value-only (see dynamicTags.ts): once the
 *  value IS a token, ImagePicker's gallery UI is replaced by a small
 *  "Dynamic: {label}" chip (it has no free-text entry and would otherwise
 *  try to render the literal token string as a broken <img> src). */
export function DynamicImagePicker({
  value,
  onChange,
  category,
}: {
  value: string;
  onChange: (v: string) => void;
  category: string;
}) {
  if (isDynamicToken(value)) {
    const tagKey = extractDynamicTagKey(value) ?? "";
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-amber-400/40 bg-amber-400/5 px-2 py-1.5 text-xs text-amber-300">
        <span className="truncate">Dynamic: {getDynamicTagLabel(tagKey)}</span>
        <button type="button" onClick={() => onChange("")} className="shrink-0 rounded px-2 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
          Clear
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-1.5">
      <div className="min-w-0 flex-1">
        <ImagePicker images={value ? [value] : []} onChange={(images) => onChange(images[images.length - 1] ?? "")} category={category} />
      </div>
      <DynamicTagButton currentValue={value} onInsert={(next) => onChange(next)} filter={(tag) => Boolean(tag.isImage)} />
    </div>
  );
}
