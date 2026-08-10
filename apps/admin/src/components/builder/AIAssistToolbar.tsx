"use client";

import { useState } from "react";
import { api, type AiRewriteInstruction } from "@/lib/api";

interface AIAssistToolbarProps {
  node: { type: string; props: Record<string, unknown> } | null;
  onApply: (nextProps: Record<string, unknown>) => void;
}

const INSTRUCTIONS: { value: AiRewriteInstruction; label: string }[] = [
  { value: "rewrite", label: "Rewrite" },
  { value: "professional", label: "Professional" },
  { value: "simplify", label: "Simplify" },
  { value: "summarize", label: "Summarize" },
  { value: "expand", label: "Expand" },
  { value: "translate", label: "Translate" },
];

function stripHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? div.innerText ?? "";
}

/**
 * Appears above the Style/Settings panel whenever the selected block has a
 * plain-text prop (Heading's `text`, a Button's `text`, …) or a rich-text
 * one (RichText's `html`, stripped to plain text for the AI call and
 * re-wrapped in a paragraph on the way back). Lives in apps/admin rather
 * than packages/builder — the visual canvas/property-panel plumbing
 * (selected node state, updateDoc) is all local to this app's builder page,
 * not the shared package.
 */
export function AIAssistToolbar({ node, onApply }: AIAssistToolbarProps) {
  const [instruction, setInstruction] = useState<AiRewriteInstruction>("rewrite");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!node) return null;
  const textKey = "text" in node.props ? "text" : "html" in node.props ? "html" : null;
  if (!textKey) return null;

  const rawValue = String(node.props[textKey] ?? "");
  const plainText = textKey === "html" ? stripHtml(rawValue) : rawValue;
  if (!plainText.trim()) return null;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.aiGenerateText({
        text: plainText,
        instruction,
        targetLanguage: instruction === "translate" ? targetLanguage : undefined,
      });
      const nextValue = textKey === "html" ? `<p>${result.text}</p>` : result.text;
      onApply({ [textKey as string]: nextValue });
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/5 p-3">
      <div className="mb-2 text-xs font-semibold text-amber-300">✨ AI Assist</div>
      <div className="flex flex-wrap gap-1.5">
        {INSTRUCTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setInstruction(opt.value)}
            className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
              instruction === opt.value ? "border-amber-400 bg-amber-400 text-white" : "border-zinc-700 text-zinc-400 hover:border-amber-400/50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {instruction === "translate" && (
        <input
          type="text"
          value={targetLanguage}
          onChange={(e) => setTargetLanguage(e.target.value)}
          placeholder="Target language"
          className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs focus:border-amber-400 focus:outline-none"
        />
      )}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="mt-2 w-full rounded-md bg-amber-400 px-2 py-1.5 text-xs font-semibold text-white hover:bg-amber-300 disabled:opacity-50"
      >
        {loading ? "Generating…" : "Generate"}
      </button>
      {error && <p className="mt-1.5 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
