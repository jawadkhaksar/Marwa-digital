"use client";

import { useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { MediaLibraryModal, displayUrl } from "@/components/ImagePicker";
import { ColorField } from "@/components/builder/ColorField";
import { DynamicTagButton } from "@/components/builder/DynamicTagButton";

export function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const [sourceMode, setSourceMode] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      // inline: true (default is false) is the actual fix for images
      // stacking vertically instead of flowing with surrounding text — the
      // extension's default node schema is `group: 'block'`, so every
      // inserted image (e.g. 5 star icons typed inline in a sentence) was
      // forced onto its own paragraph-level line no matter what CSS the
      // rendered output used.
      Image.configure({ inline: true, allowBase64: false }),
      TextStyle,
      Color,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "tiptap-content min-h-[240px] px-3 py-2 text-sm text-zinc-200 focus:outline-none",
      },
    },
  });

  if (!editor) return null;

  function toggleSource() {
    if (!sourceMode) {
      setSourceMode(true);
    } else {
      editor?.commands.setContent(value, { emitUpdate: false });
      setSourceMode(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950">
      <Toolbar editor={editor} sourceMode={sourceMode} onToggleSource={toggleSource} onAddMedia={() => setMediaOpen(true)} />
      {sourceMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          className="w-full bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300 focus:outline-none"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      {mediaOpen && (
        <MediaLibraryModal
          category="builder"
          onSelect={(url) => {
            // MediaLibraryModal hands back the raw stored path (e.g.
            // "/uploads/xxx.png") — resolving against this admin app's own
            // origin (which doesn't serve /uploads) is exactly why the
            // inserted image showed as broken.
            editor.chain().focus().setImage({ src: displayUrl(url) }).run();
            setMediaOpen(false);
          }}
          onClose={() => setMediaOpen(false)}
        />
      )}
    </div>
  );
}

const FORMAT_OPTIONS = [
  { value: "p", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "blockquote", label: "Quote" },
] as const;

function currentFormat(editor: Editor): string {
  for (let level = 1; level <= 4; level++) {
    if (editor.isActive("heading", { level })) return `h${level}`;
  }
  if (editor.isActive("blockquote")) return "blockquote";
  return "p";
}

function Toolbar({
  editor,
  sourceMode,
  onToggleSource,
  onAddMedia,
}: {
  editor: Editor;
  sourceMode: boolean;
  onToggleSource: () => void;
  onAddMedia: () => void;
}) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function applyFormat(format: string) {
    if (format === "p") {
      editor.chain().focus().setParagraph().run();
    } else if (format === "blockquote") {
      editor.chain().focus().toggleBlockquote().run();
    } else {
      const level = Number(format.slice(1)) as 1 | 2 | 3 | 4;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  }

  const buttons: { label: string; onClick: () => void; active?: boolean }[] = [
    { label: "B", onClick: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { label: "I", onClick: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { label: "U", onClick: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline") },
    { label: "•", onClick: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { label: "1.", onClick: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
    { label: "⟵", onClick: () => editor.chain().focus().setTextAlign("left").run(), active: editor.isActive({ textAlign: "left" }) },
    { label: "↔", onClick: () => editor.chain().focus().setTextAlign("center").run(), active: editor.isActive({ textAlign: "center" }) },
    { label: "⟶", onClick: () => editor.chain().focus().setTextAlign("right").run(), active: editor.isActive({ textAlign: "right" }) },
    { label: "🔗", onClick: setLink, active: editor.isActive("link") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-700 bg-zinc-900 p-1.5">
      <select
        value={currentFormat(editor)}
        onChange={(e) => applyFormat(e.target.value)}
        disabled={sourceMode}
        className="mr-1 h-7 rounded border border-zinc-700 bg-zinc-950 px-1 text-xs text-zinc-300 disabled:opacity-30"
      >
        {FORMAT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          disabled={sourceMode}
          onClick={b.onClick}
          className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs font-semibold transition-colors disabled:opacity-30 ${
            b.active ? "bg-amber-400 text-white" : "text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {b.label}
        </button>
      ))}
      {!sourceMode && (
        <div className="w-20 shrink-0" title="Text color">
          <ColorField
            compact
            value={(editor.getAttributes("textStyle").color as string | undefined) ?? ""}
            onChange={(v) => {
              if (v) editor.chain().focus().setColor(v).run();
              else editor.chain().focus().unsetColor().run();
            }}
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={sourceMode}
        className="flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
      >
        ↺
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={sourceMode}
        className="flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
      >
        ↻
      </button>
      <button
        type="button"
        onClick={onAddMedia}
        disabled={sourceMode}
        className="flex h-7 items-center gap-1 rounded px-2 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-30"
      >
        🖼 Add Media
      </button>
      {!sourceMode && (
        <DynamicTagButton
          onSelectToken={(token) => {
            editor.chain().focus().insertContent(token).run();
          }}
        />
      )}
      <div className="ml-auto">
        <button
          type="button"
          onClick={onToggleSource}
          className={`rounded px-2 py-1 text-xs font-semibold ${
            sourceMode ? "bg-amber-400 text-white" : "text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          {"</>"} Source
        </button>
      </div>
    </div>
  );
}
