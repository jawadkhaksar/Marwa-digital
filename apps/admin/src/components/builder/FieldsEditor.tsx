"use client";

import { useState } from "react";
import type { FormFieldDef, FormFieldOption } from "@marwa/builder";
import { FORM_FIELD_TYPE_VALUES, FORM_COLUMN_WIDTH_VALUES, COUNTRY_DIAL_CODES, flagEmoji } from "@marwa/builder";

const TYPE_LABELS: Record<(typeof FORM_FIELD_TYPE_VALUES)[number], string> = {
  text: "Text",
  email: "Email",
  textarea: "Textarea",
  url: "URL",
  tel: "Tel",
  number: "Number",
  date: "Date",
  time: "Time",
  password: "Password",
  hidden: "Hidden",
  html: "HTML",
  radio: "Radio",
  select: "Select",
  checkbox: "Checkbox",
  acceptance: "Acceptance",
  honeypot: "Honeypot (spam trap)",
  file: "File Upload",
  recaptcha: "reCAPTCHA",
  recaptcha_v3: "reCAPTCHA V3",
};

// Types with their own options list (radio buttons / select dropdown / checkbox group).
const OPTION_TYPES = new Set(["radio", "select", "checkbox"]);
// Types that don't take a placeholder (nothing to type into, or it's not a text box).
const NO_PLACEHOLDER_TYPES = new Set(["radio", "select", "checkbox", "acceptance", "html", "hidden", "honeypot", "date", "time", "file", "recaptcha", "recaptcha_v3"]);
// Types with no meaningful "Required" toggle of their own (recaptcha is
// inherently required to pass verification; honeypot must stay optional so
// a real visitor leaving it blank — the whole point — doesn't block submission).
const NO_REQUIRED_TYPES = new Set(["acceptance", "honeypot", "recaptcha", "recaptcha_v3", "html"]);

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "field";
}

function uniqueId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

/**
 * Form fields are far richer than Slider's slides (15 different types, each
 * with its own subset of relevant sub-fields, some needing an Options list)
 * — same rationale as SlidesEditor for skipping the generic JSON-textarea
 * fallback the describePropsSchema/PropField system would otherwise give
 * an array-of-objects field.
 */
export function FieldsEditor({ value, onChange }: { value: FormFieldDef[]; onChange: (fields: FormFieldDef[]) => void }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<"content" | "advanced">("content");

  function update(index: number, patch: Partial<FormFieldDef>) {
    onChange(value.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addField() {
    const existingIds = new Set(value.map((f) => f.id));
    const id = uniqueId("field", existingIds);
    const next = [...value, { id, type: "text" as const, label: "", placeholder: "", required: false, columnWidth: "100" as const }];
    onChange(next);
    setExpandedIndex(next.length - 1);
    setSubTab("content");
  }

  function duplicateField(index: number) {
    const existingIds = new Set(value.map((f) => f.id));
    const source = value[index];
    const id = uniqueId(`${source.id}_copy`, existingIds);
    const next = [...value.slice(0, index + 1), { ...source, id }, ...value.slice(index + 1)];
    onChange(next);
    setExpandedIndex(index + 1);
  }

  function removeField(index: number) {
    onChange(value.filter((_, i) => i !== index));
    setExpandedIndex(null);
  }

  function moveField(index: number, direction: "up" | "down") {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setExpandedIndex(target);
  }

  function updateOptions(index: number, options: FormFieldOption[]) {
    update(index, { options });
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-400">Form Fields</label>
      <div className="flex flex-col gap-2">
        {value.map((field, i) => (
          <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-950">
            <div className="flex items-center gap-2 p-2">
              <button
                type="button"
                onClick={() => {
                  setExpandedIndex(expandedIndex === i ? null : i);
                  setSubTab("content");
                }}
                className="min-w-0 flex-1 truncate text-left text-xs text-zinc-200"
              >
                {field.label || `Field ${i + 1}`}{" "}
                <span className="text-zinc-500">({TYPE_LABELS[field.type]})</span>
              </button>
              <div className="flex shrink-0 items-center gap-0.5 text-zinc-400">
                <button type="button" title="Move up" onClick={() => moveField(i, "up")} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">
                  ↑
                </button>
                <button type="button" title="Move down" onClick={() => moveField(i, "down")} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">
                  ↓
                </button>
                <button type="button" title="Duplicate" onClick={() => duplicateField(i)} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-amber-400">
                  ⧉
                </button>
                <button type="button" title="Delete" onClick={() => removeField(i)} className="flex h-6 w-6 items-center justify-center rounded hover:bg-zinc-800 hover:text-red-400">
                  ✕
                </button>
              </div>
            </div>

            {expandedIndex === i && (
              <div className="border-t border-zinc-800 p-2">
                <div className="mb-2 flex rounded-lg border border-zinc-700 p-0.5 text-[11px]">
                  {(["content", "advanced"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSubTab(t)}
                      className={`flex-1 rounded px-2 py-1 capitalize ${subTab === t ? "bg-amber-400 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {subTab === "content" ? (
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-zinc-500">Type</label>
                      <select
                        value={field.type}
                        onChange={(e) => update(i, { type: e.target.value as FormFieldDef["type"] })}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                      >
                        {FORM_FIELD_TYPE_VALUES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {field.type === "html" ? (
                      <div>
                        <label className="mb-1 block text-[11px] text-zinc-500">HTML Content</label>
                        <textarea
                          value={field.htmlContent ?? ""}
                          onChange={(e) => update(i, { htmlContent: e.target.value })}
                          rows={4}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-xs"
                        />
                      </div>
                    ) : field.type === "honeypot" ? (
                      <p className="text-[11px] text-zinc-500">
                        Invisible to real visitors. Bots that auto-fill every field trip this one, and the submission is silently rejected server-side.
                      </p>
                    ) : (
                      <>
                        {(field.type === "recaptcha" || field.type === "recaptcha_v3") && (
                          <p className="text-[11px] text-zinc-500">
                            {field.type === "recaptcha"
                              ? "Renders Google's \"I'm not a robot\" checkbox. Needs NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY (web) and RECAPTCHA_V2_SECRET_KEY (api) set — until then it's skipped server-side, same as unconfigured email."
                              : "Invisible, score-based — runs automatically on submit, no visible widget. Needs NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY (web) and RECAPTCHA_V3_SECRET_KEY (api) set."}
                          </p>
                        )}
                        {field.type !== "recaptcha" && field.type !== "recaptcha_v3" && (
                          <div>
                            <label className="mb-1 block text-[11px] text-zinc-500">
                              {field.type === "acceptance" ? "Acceptance Text" : "Label"}
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => update(i, { label: e.target.value })}
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                            />
                          </div>
                        )}
                        {!NO_PLACEHOLDER_TYPES.has(field.type) && (
                          <div>
                            <label className="mb-1 block text-[11px] text-zinc-500">Placeholder</label>
                            <input
                              type="text"
                              value={field.placeholder ?? ""}
                              onChange={(e) => update(i, { placeholder: e.target.value })}
                              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                            />
                          </div>
                        )}
                        {field.type === "file" && (
                          <>
                            <div>
                              <label className="mb-1 block text-[11px] text-zinc-500">Max File Size (MB)</label>
                              <input
                                type="number"
                                min={1}
                                placeholder="Server default (20MB)"
                                value={field.maxFileSizeMb ?? ""}
                                onChange={(e) => update(i, { maxFileSizeMb: e.target.value ? Number(e.target.value) : undefined })}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-zinc-500">Allowed File Types</label>
                              <input
                                type="text"
                                placeholder="jpg, png, pdf"
                                value={field.allowedFileTypes ?? ""}
                                onChange={(e) => update(i, { allowedFileTypes: e.target.value })}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                              />
                              <p className="mt-1 text-[10px] text-zinc-600">Comma-separated. Leave blank for the server default (jpg, png, webp, gif, pdf, doc, docx, xls, xlsx, txt).</p>
                            </div>
                          </>
                        )}
                        {field.type === "tel" && (
                          <>
                            <label className="flex items-center gap-2 text-xs text-zinc-300">
                              <input
                                type="checkbox"
                                checked={field.showCountryCode ?? false}
                                onChange={(e) => update(i, { showCountryCode: e.target.checked })}
                              />
                              Show Country Code
                            </label>
                            {field.showCountryCode && (
                              <div>
                                <label className="mb-1 block text-[11px] text-zinc-500">Default Country</label>
                                <select
                                  value={field.defaultCountryCode ?? "AT"}
                                  onChange={(e) => update(i, { defaultCountryCode: e.target.value })}
                                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                                >
                                  {COUNTRY_DIAL_CODES.map((c) => (
                                    <option key={c.iso2} value={c.iso2}>
                                      {flagEmoji(c.iso2)} {c.name} ({c.dialCode})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </>
                        )}
                        {!NO_REQUIRED_TYPES.has(field.type) && (
                          <label className="flex items-center gap-2 text-xs text-zinc-300">
                            <input type="checkbox" checked={field.required ?? false} onChange={(e) => update(i, { required: e.target.checked })} />
                            Required
                          </label>
                        )}
                        <div>
                          <label className="mb-1 block text-[11px] text-zinc-500">Column Width</label>
                          <select
                            value={field.columnWidth ?? "100"}
                            onChange={(e) => update(i, { columnWidth: e.target.value as FormFieldDef["columnWidth"] })}
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                          >
                            {FORM_COLUMN_WIDTH_VALUES.map((w) => (
                              <option key={w} value={w}>
                                {w}%
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}

                    {OPTION_TYPES.has(field.type) && (
                      <div>
                        <label className="mb-1 block text-[11px] text-zinc-500">Options</label>
                        <div className="flex flex-col gap-1.5">
                          {(field.options ?? []).map((opt, oi) => (
                            <div key={oi} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="Label"
                                value={opt.label}
                                onChange={(e) => {
                                  const options = [...(field.options ?? [])];
                                  options[oi] = { ...options[oi], label: e.target.value };
                                  updateOptions(i, options);
                                }}
                                className="w-full min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Value"
                                value={opt.value}
                                onChange={(e) => {
                                  const options = [...(field.options ?? [])];
                                  options[oi] = { ...options[oi], value: e.target.value };
                                  updateOptions(i, options);
                                }}
                                className="w-full min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => updateOptions(i, (field.options ?? []).filter((_, x) => x !== oi))}
                                className="shrink-0 text-red-400 hover:text-red-300"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => updateOptions(i, [...(field.options ?? []), { label: `Option ${(field.options?.length ?? 0) + 1}`, value: `option_${(field.options?.length ?? 0) + 1}` }])}
                            className="rounded-lg border border-dashed border-zinc-700 py-1 text-[11px] text-zinc-400 hover:border-amber-400 hover:text-amber-400"
                          >
                            + Add Option
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {field.type !== "html" && field.type !== "honeypot" && field.type !== "file" && field.type !== "recaptcha" && field.type !== "recaptcha_v3" && (
                      <div>
                        <label className="mb-1 block text-[11px] text-zinc-500">Default Value</label>
                        <input
                          type="text"
                          value={field.defaultValue ?? ""}
                          onChange={(e) => update(i, { defaultValue: e.target.value })}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                        />
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-[11px] text-zinc-500">ID</label>
                      <input
                        type="text"
                        value={field.id}
                        onChange={(e) => update(i, { id: slugify(e.target.value) })}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs"
                      />
                      <p className="mt-1 text-[10px] text-zinc-600">
                        Must be unique on this form — used as the submitted field&apos;s key (in Submissions, in the
                        email template&apos;s field data, etc).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={addField}
          className="rounded-lg border border-dashed border-zinc-700 py-2 text-xs text-zinc-400 hover:border-amber-400 hover:text-amber-400"
        >
          + Add Field
        </button>
      </div>
    </div>
  );
}
