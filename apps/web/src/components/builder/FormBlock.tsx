"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { FormFieldDef } from "@marwa/builder";
import { COUNTRY_DIAL_CODES, flagEmoji } from "@marwa/builder";
import { api, ApiError } from "@/lib/api";
import { getAttributionPayload } from "@/lib/analytics";
import { createFormFieldTracker } from "@/lib/formAnalytics";
import { CORE_OVERRIDE_SLUGS } from "@/lib/coreLayoutOverride";
import { GoogleFontLink } from "@/components/builder/GoogleFontLink";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

declare global {
  interface Window {
    grecaptcha?: {
      render: (container: HTMLElement, params: { sitekey: string }) => number;
      getResponse: (widgetId?: number) => string;
      reset: (widgetId?: number) => void;
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

function loadScriptOnce(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
  document.body.appendChild(script);
}

const INPUT_SIZE_CLASSES: Record<string, string> = {
  xs: "px-2.5 py-1.5 text-xs",
  sm: "px-3 py-2 text-sm",
  md: "px-3.5 py-2.5 text-sm",
  lg: "px-4 py-3 text-base",
  xl: "px-5 py-3.5 text-base",
};

// Structural only — color/background/border/typography all come from the
// Style tab (fieldStyle below), applied inline so the defaults here are
// only the fallback when nothing's configured yet.
const FIELD_BASE_CLASS = "w-full rounded-lg border focus:outline-none focus:ring-1";

function hashString(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

// Digits with optional leading +, spaces, hyphens, and parentheses — loose
// enough for real-world formatting ("+43 664 123 45 67", "(043) 664-123") but
// still rejects letters, unlike a bare HTML5 `type="tel"` (which the spec
// deliberately leaves unvalidated).
const TEL_PATTERN = "^\\+?[0-9()\\-\\s]{6,20}$";
const TEL_LOCAL_PATTERN = "^[0-9()\\-\\s]{3,20}$";

// Longest dial code first so "+1" doesn't shadow a (hypothetical) longer
// code sharing the same prefix when splitting a stored "+43 664…" value.
const SORTED_DIAL_CODES = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);

function splitTelValue(value: string, defaultIso2?: string): { iso2: string; localNumber: string } {
  const trimmed = value.trim();
  const match = SORTED_DIAL_CODES.find((c) => trimmed.startsWith(c.dialCode));
  if (match) return { iso2: match.iso2, localNumber: trimmed.slice(match.dialCode.length).trim() };
  const fallback = COUNTRY_DIAL_CODES.find((c) => c.iso2 === defaultIso2) ?? COUNTRY_DIAL_CODES[0];
  return { iso2: fallback.iso2, localNumber: trimmed };
}

function getCurrentPageSlug(): string {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (path === "") return CORE_OVERRIDE_SLUGS.home;
  return path;
}

/**
 * Custom dropdown (flag + full country name + dial code, searchable) —
 * replaces a plain `<select>`, which renders with the browser's own
 * unstyled native list chrome (always white, ignores the form's dark Style
 * tab colors entirely) instead of matching the rest of the field.
 */
function CountryCodeSelect({
  iso2,
  onSelect,
  sizeClass,
  style,
}: {
  iso2: string;
  onSelect: (iso2: string) => void;
  sizeClass: string;
  style: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selected = COUNTRY_DIAL_CODES.find((c) => c.iso2 === iso2) ?? COUNTRY_DIAL_CODES[0];
  const panelBackground = style.background ?? "#18181b";
  const panelBorder = typeof style.borderColor === "string" ? style.borderColor : "#3f3f46";
  const textColor = style.color ?? "#e4e4e7";

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const filtered = COUNTRY_DIAL_CODES.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.dialCode.includes(search) || c.iso2.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${FIELD_BASE_CLASS} ${sizeClass} flex items-center gap-1.5 whitespace-nowrap`}
        style={style}
        aria-label="Country code"
        aria-expanded={open}
      >
        <span aria-hidden>{flagEmoji(selected.iso2)}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        <span>{selected.dialCode}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-[calc(100%+4px)] z-50 flex max-h-72 w-64 flex-col overflow-hidden rounded-lg border shadow-2xl"
          style={{ background: panelBackground, borderColor: panelBorder }}
        >
          <div className="shrink-0 border-b p-2" style={{ borderColor: panelBorder }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full rounded border bg-transparent px-2 py-1.5 text-sm outline-none"
              style={{ borderColor: panelBorder, color: textColor }}
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm opacity-60" style={{ color: textColor }}>
                No matches
              </p>
            )}
            {filtered.map((c) => (
              <button
                key={c.iso2}
                type="button"
                onClick={() => {
                  onSelect(c.iso2);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
                style={{ color: textColor, background: c.iso2 === iso2 ? "rgba(255,255,255,0.08)" : undefined }}
              >
                <span aria-hidden>{flagEmoji(c.iso2)}</span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="shrink-0 opacity-60">({c.dialCode})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldInput({
  field,
  sizeClass,
  style,
  value,
  onChange,
}: {
  field: FormFieldDef;
  sizeClass: string;
  style: CSSProperties;
  value: string;
  onChange: (v: string) => void;
}) {
  const common = {
    id: field.id,
    name: field.id,
    required: field.required,
    className: `${FIELD_BASE_CLASS} ${sizeClass}`,
    style,
  };

  switch (field.type) {
    case "tel": {
      if (!field.showCountryCode) {
        return (
          <input
            {...common}
            type="tel"
            inputMode="tel"
            pattern={TEL_PATTERN}
            title="Enter a valid phone number (digits, spaces, +, -, ( ) only)"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      }
      const { iso2, localNumber } = splitTelValue(value, field.defaultCountryCode);
      const selectedDialCode = COUNTRY_DIAL_CODES.find((c) => c.iso2 === iso2)?.dialCode ?? "+43";
      return (
        <div className="flex gap-2">
          <CountryCodeSelect
            iso2={iso2}
            onSelect={(nextIso2) => {
              const dialCode = COUNTRY_DIAL_CODES.find((c) => c.iso2 === nextIso2)?.dialCode ?? selectedDialCode;
              onChange(`${dialCode} ${localNumber}`.trim());
            }}
            sizeClass={sizeClass}
            style={style}
          />
          <input
            id={field.id}
            name={field.id}
            required={field.required}
            className={`${FIELD_BASE_CLASS} ${sizeClass} min-w-0 flex-1`}
            style={style}
            type="tel"
            inputMode="tel"
            pattern={TEL_LOCAL_PATTERN}
            title="Enter a valid phone number (digits, spaces, -, ( ) only)"
            placeholder={field.placeholder}
            value={localNumber}
            onChange={(e) => onChange(`${selectedDialCode} ${e.target.value}`.trim())}
          />
        </div>
      );
    }
    case "textarea":
      return <textarea {...common} placeholder={field.placeholder} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />;
    case "select":
      return (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            {field.placeholder || "Select…"}
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="radio"
                name={field.id}
                required={field.required}
                checked={value === opt.value}
                onChange={() => onChange(opt.value)}
                className="accent-gold"
              />
              {opt.label}
            </label>
          ))}
        </div>
      );
    case "checkbox": {
      const selected = value ? value.split(",") : [];
      return (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, opt.value] : selected.filter((v) => v !== opt.value);
                  onChange(next.join(","));
                }}
                className="accent-gold"
              />
              {opt.label}
            </label>
          ))}
        </div>
      );
    }
    case "acceptance":
      return (
        <label className="flex items-start gap-2 text-sm text-foreground/80">
          <input
            type="checkbox"
            required={field.required}
            checked={value === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "")}
            className="mt-0.5 accent-gold"
          />
          {field.label}
        </label>
      );
    case "hidden":
      return <input type="hidden" name={field.id} value={value} />;
    case "honeypot":
      // Off-screen, not display:none/visibility:hidden — some bots skip
      // fields hidden that way specifically to evade this exact trick.
      // Real visitors never see or reach it (tabIndex -1 + aria-hidden).
      return (
        <input
          type="text"
          name={field.id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", top: "-9999px", width: 1, height: 1, opacity: 0 }}
        />
      );
    default:
      return <input {...common} type={field.type} placeholder={field.placeholder} value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function FormBlock({
  fields,
  inputSize,
  showLabel,
  showRequiredMark,
  submitLabel,
  submitIconPosition,
  formId,
  columnsGap,
  rowsGap,
  labelSpacing,
  labelColor,
  labelFontFamily,
  labelFontSize,
  labelFontWeight,
  labelTextTransform,
  labelFontStyle,
  labelTextDecoration,
  labelLineHeight,
  labelLetterSpacing,
  labelWordSpacing,
  htmlFieldSpacing,
  htmlFieldColor,
  htmlFieldFontFamily,
  htmlFieldFontSize,
  htmlFieldFontWeight,
  htmlFieldTextTransform,
  htmlFieldFontStyle,
  htmlFieldTextDecoration,
  htmlFieldLineHeight,
  htmlFieldLetterSpacing,
  htmlFieldWordSpacing,
  fieldColor,
  fieldFontFamily,
  fieldFontSize,
  fieldFontWeight,
  fieldTextTransform,
  fieldFontStyle,
  fieldTextDecoration,
  fieldLineHeight,
  fieldLetterSpacing,
  fieldWordSpacing,
  fieldBackground,
  fieldBorderColor,
  fieldBorderWidthTop,
  fieldBorderWidthRight,
  fieldBorderWidthBottom,
  fieldBorderWidthLeft,
  fieldBorderRadiusTop,
  fieldBorderRadiusRight,
  fieldBorderRadiusBottom,
  fieldBorderRadiusLeft,
  fieldBoxShadow,
  formBoxShadow,
  buttonAlignment,
  buttonFontFamily,
  buttonFontSize,
  buttonFontWeight,
  buttonTextTransform,
  buttonFontStyle,
  buttonTextDecoration,
  buttonLineHeight,
  buttonLetterSpacing,
  buttonWordSpacing,
  buttonBorderStyle,
  buttonBorderWidth,
  buttonBorderWidthTop,
  buttonBorderWidthRight,
  buttonBorderWidthBottom,
  buttonBorderWidthLeft,
  buttonBorderColor,
  buttonBackground,
  buttonHoverBackground,
  buttonColor,
  buttonHoverColor,
  buttonBorderRadiusTop,
  buttonBorderRadiusRight,
  buttonBorderRadiusBottom,
  buttonBorderRadiusLeft,
  buttonPaddingTop,
  buttonPaddingRight,
  buttonPaddingBottom,
  buttonPaddingLeft,
  buttonBoxShadow,
  buttonHoverBoxShadow,
  messagesFontFamily,
  messagesFontSize,
  messagesFontWeight,
  messagesTextTransform,
  messagesFontStyle,
  messagesTextDecoration,
  messagesLineHeight,
  messagesLetterSpacing,
  messagesWordSpacing,
  successMessageColor,
  errorMessageColor,
}: {
  fields?: FormFieldDef[];
  inputSize?: string;
  showLabel?: boolean;
  showRequiredMark?: boolean;
  submitLabel?: string;
  submitIconPosition?: "none" | "before" | "after";
  formId?: string;
  columnsGap?: string;
  rowsGap?: string;
  labelSpacing?: string;
  labelColor?: string;
  labelFontFamily?: string;
  labelFontSize?: string;
  labelFontWeight?: string;
  labelTextTransform?: CSSProperties["textTransform"];
  labelFontStyle?: CSSProperties["fontStyle"];
  labelTextDecoration?: string;
  labelLineHeight?: string;
  labelLetterSpacing?: string;
  labelWordSpacing?: string;
  htmlFieldSpacing?: string;
  htmlFieldColor?: string;
  htmlFieldFontFamily?: string;
  htmlFieldFontSize?: string;
  htmlFieldFontWeight?: string;
  htmlFieldTextTransform?: CSSProperties["textTransform"];
  htmlFieldFontStyle?: CSSProperties["fontStyle"];
  htmlFieldTextDecoration?: string;
  htmlFieldLineHeight?: string;
  htmlFieldLetterSpacing?: string;
  htmlFieldWordSpacing?: string;
  fieldColor?: string;
  fieldFontFamily?: string;
  fieldFontSize?: string;
  fieldFontWeight?: string;
  fieldTextTransform?: CSSProperties["textTransform"];
  fieldFontStyle?: CSSProperties["fontStyle"];
  fieldTextDecoration?: string;
  fieldLineHeight?: string;
  fieldLetterSpacing?: string;
  fieldWordSpacing?: string;
  fieldBackground?: string;
  fieldBorderColor?: string;
  fieldBorderWidthTop?: string;
  fieldBorderWidthRight?: string;
  fieldBorderWidthBottom?: string;
  fieldBorderWidthLeft?: string;
  fieldBorderRadiusTop?: string;
  fieldBorderRadiusRight?: string;
  fieldBorderRadiusBottom?: string;
  fieldBorderRadiusLeft?: string;
  fieldBoxShadow?: string;
  formBoxShadow?: string;
  buttonAlignment?: "left" | "center" | "right" | "full-width";
  buttonFontFamily?: string;
  buttonFontSize?: string;
  buttonFontWeight?: string;
  buttonTextTransform?: CSSProperties["textTransform"];
  buttonFontStyle?: CSSProperties["fontStyle"];
  buttonTextDecoration?: string;
  buttonLineHeight?: string;
  buttonLetterSpacing?: string;
  buttonWordSpacing?: string;
  buttonBorderStyle?: "none" | "solid" | "dashed" | "dotted";
  buttonBorderWidth?: string;
  buttonBorderWidthTop?: string;
  buttonBorderWidthRight?: string;
  buttonBorderWidthBottom?: string;
  buttonBorderWidthLeft?: string;
  buttonBorderColor?: string;
  buttonBackground?: string;
  buttonHoverBackground?: string;
  buttonColor?: string;
  buttonHoverColor?: string;
  buttonBorderRadiusTop?: string;
  buttonBorderRadiusRight?: string;
  buttonBorderRadiusBottom?: string;
  buttonBorderRadiusLeft?: string;
  buttonPaddingTop?: string;
  buttonPaddingRight?: string;
  buttonPaddingBottom?: string;
  buttonPaddingLeft?: string;
  buttonBoxShadow?: string;
  buttonHoverBoxShadow?: string;
  messagesFontFamily?: string;
  messagesFontSize?: string;
  messagesFontWeight?: string;
  messagesTextTransform?: CSSProperties["textTransform"];
  messagesFontStyle?: CSSProperties["fontStyle"];
  messagesTextDecoration?: string;
  messagesLineHeight?: string;
  messagesLetterSpacing?: string;
  messagesWordSpacing?: string;
  successMessageColor?: string;
  errorMessageColor?: string;
}) {
  const list = fields ?? [];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(list.map((f) => [f.id, f.defaultValue ?? ""]))
  );
  const [files, setFiles] = useState<Record<string, File>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  // Bot defense: timestamp when this form mounted, so the server can reject
  // sub-2-second submits (see looksLikeBot() in packages/api/src/lib/security.ts).
  const [renderedAt] = useState(() => Date.now());

  // Form Field Analytics — one tracker per mount, reporting which field a
  // visitor was last in if they leave without submitting.
  const fieldTrackerRef = useRef(createFormFieldTracker(formId || "unconfigured-form"));
  useEffect(() => {
    const tracker = fieldTrackerRef.current;
    return () => tracker.destroy();
  }, []);

  const recaptchaV2Field = list.find((f) => f.type === "recaptcha");
  const recaptchaV3Field = list.find((f) => f.type === "recaptcha_v3");
  const recaptchaV2ContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaV2WidgetId = useRef<number | null>(null);

  // Site Keys are admin-managed (Settings → Integrations), not build-time
  // env vars — fetched once from the public settings endpoint (which
  // deliberately omits the matching Secret Keys; see packages/api/src/
  // routes/content.ts) rather than baked in at build time, so an admin can
  // add/change them without a redeploy.
  const [recaptchaV2SiteKey, setRecaptchaV2SiteKey] = useState<string | null>(null);
  const [recaptchaV3SiteKey, setRecaptchaV3SiteKey] = useState<string | null>(null);

  useEffect(() => {
    if (!recaptchaV2Field && !recaptchaV3Field) return;
    api
      .getSettings()
      .then((s) => {
        setRecaptchaV2SiteKey(s.recaptchaV2SiteKey);
        setRecaptchaV3SiteKey(s.recaptchaV3SiteKey);
      })
      .catch(() => {
        // No site keys available — the placeholder text in the render below covers this.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (recaptchaV2Field && recaptchaV2SiteKey) loadScriptOnce("recaptcha-v2-script", "https://www.google.com/recaptcha/api.js");
    if (recaptchaV3Field && recaptchaV3SiteKey) loadScriptOnce("recaptcha-v3-script", `https://www.google.com/recaptcha/api.js?render=${recaptchaV3SiteKey}`);
  }, [recaptchaV2Field, recaptchaV3Field, recaptchaV2SiteKey, recaptchaV3SiteKey]);

  // Explicit `grecaptcha.render` rather than relying on Google's script to
  // auto-detect a `.g-recaptcha` div — React owns this DOM subtree, and the
  // script tag may already have finished loading (e.g. a second Form block
  // on the same page) before this div even exists, so implicit detection
  // isn't reliable here. Polls briefly since the script may still be
  // fetching/parsing when this effect first runs.
  useEffect(() => {
    if (!recaptchaV2Field || !recaptchaV2SiteKey) return;
    const siteKey = recaptchaV2SiteKey;
    let cancelled = false;
    function tryRender() {
      if (cancelled || !recaptchaV2ContainerRef.current || recaptchaV2WidgetId.current !== null) return;
      if (window.grecaptcha?.render) {
        recaptchaV2WidgetId.current = window.grecaptcha.render(recaptchaV2ContainerRef.current, { sitekey: siteKey });
      } else {
        setTimeout(tryRender, 200);
      }
    }
    tryRender();
    return () => {
      cancelled = true;
    };
  }, [recaptchaV2Field, recaptchaV2SiteKey]);

  async function getRecaptchaV3Token(): Promise<string | null> {
    if (!recaptchaV3SiteKey || !window.grecaptcha) return null;
    return new Promise((resolve) => {
      window.grecaptcha!.ready(() => {
        window
          .grecaptcha!.execute(recaptchaV3SiteKey, { action: "submit" })
          .then(resolve)
          .catch(() => resolve(null));
      });
    });
  }

  const sizeClass = INPUT_SIZE_CLASSES[inputSize ?? "md"] ?? INPUT_SIZE_CLASSES.md;

  function setField(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formId) {
      setStatus("error");
      setErrorMessage("This form has no Form ID set (Content tab → Additional Options).");
      return;
    }

    if (recaptchaV2Field && recaptchaV2SiteKey) {
      const token = window.grecaptcha?.getResponse(recaptchaV2WidgetId.current ?? undefined);
      if (!token) {
        setStatus("error");
        setErrorMessage("Please complete the reCAPTCHA.");
        return;
      }
    }

    setStatus("submitting");
    setErrorMessage("");
    try {
      const payload = { ...values };

      const pageSlug = getCurrentPageSlug();

      // File Upload fields hold a raw `File` object in `files`, not a
      // string — upload each one first and swap in the resulting URL, so
      // the final submit payload stays the same flat Record<string,string>
      // shape every other field already uses.
      for (const field of list) {
        if (field.type !== "file") continue;
        const file = files[field.id];
        if (!file) continue;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("pageSlug", pageSlug);
        formData.append("formId", formId);
        formData.append("fieldId", field.id);
        const res = await fetch(`${API_URL}/api/forms/upload`, { method: "POST", body: formData });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiError(res.status, body.error ?? "File upload failed");
        payload[field.id] = body.url;
      }

      if (recaptchaV2Field && recaptchaV2SiteKey) {
        payload[recaptchaV2Field.id] = window.grecaptcha?.getResponse(recaptchaV2WidgetId.current ?? undefined) ?? "";
      }
      if (recaptchaV3Field && recaptchaV3SiteKey) {
        payload[recaptchaV3Field.id] = (await getRecaptchaV3Token()) ?? "";
      }

      const result = await api.submitForm({ pageSlug, formId, fields: payload, renderedAt, ...getAttributionPayload() });
      fieldTrackerRef.current.onSubmitSuccess();
      setStatus("success");
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      // A failed submit consumes the v2 token server-side — reset the
      // widget so retrying doesn't silently resend the same dead token.
      if (recaptchaV2Field) window.grecaptcha?.reset(recaptchaV2WidgetId.current ?? undefined);
    }
  }

  const messagesStyle: CSSProperties = {
    fontFamily: messagesFontFamily && messagesFontFamily !== "inherit" ? messagesFontFamily : undefined,
    fontSize: messagesFontSize || undefined,
    fontWeight: messagesFontWeight || undefined,
    textTransform: messagesTextTransform && messagesTextTransform !== "none" ? messagesTextTransform : undefined,
    fontStyle: messagesFontStyle && messagesFontStyle !== "normal" ? messagesFontStyle : undefined,
    textDecoration: messagesTextDecoration && messagesTextDecoration !== "none" ? messagesTextDecoration : undefined,
    lineHeight: messagesLineHeight || undefined,
    letterSpacing: messagesLetterSpacing || undefined,
    wordSpacing: messagesWordSpacing || undefined,
  };

  if (status === "success") {
    return (
      <>
        <GoogleFontLink family={messagesFontFamily} />
        <p
          className="rounded-lg border border-white/15 bg-white/5 px-4 py-6 text-center text-sm"
          style={{ color: successMessageColor || undefined, ...messagesStyle }}
        >
          Thanks — your submission was received.
        </p>
      </>
    );
  }

  const labelStyle: CSSProperties = {
    color: labelColor || undefined,
    fontFamily: labelFontFamily && labelFontFamily !== "inherit" ? labelFontFamily : undefined,
    fontSize: labelFontSize || undefined,
    fontWeight: labelFontWeight || undefined,
    textTransform: labelTextTransform && labelTextTransform !== "none" ? labelTextTransform : undefined,
    fontStyle: labelFontStyle && labelFontStyle !== "normal" ? labelFontStyle : undefined,
    textDecoration: labelTextDecoration && labelTextDecoration !== "none" ? labelTextDecoration : undefined,
    lineHeight: labelLineHeight || undefined,
    letterSpacing: labelLetterSpacing || undefined,
    wordSpacing: labelWordSpacing || undefined,
    marginBottom: labelSpacing || "6px",
    display: "block",
  };

  const htmlFieldStyle: CSSProperties = {
    color: htmlFieldColor || undefined,
    fontFamily: htmlFieldFontFamily && htmlFieldFontFamily !== "inherit" ? htmlFieldFontFamily : undefined,
    fontSize: htmlFieldFontSize || undefined,
    fontWeight: htmlFieldFontWeight || undefined,
    textTransform: htmlFieldTextTransform && htmlFieldTextTransform !== "none" ? htmlFieldTextTransform : undefined,
    fontStyle: htmlFieldFontStyle && htmlFieldFontStyle !== "normal" ? htmlFieldFontStyle : undefined,
    textDecoration: htmlFieldTextDecoration && htmlFieldTextDecoration !== "none" ? htmlFieldTextDecoration : undefined,
    lineHeight: htmlFieldLineHeight || undefined,
    letterSpacing: htmlFieldLetterSpacing || undefined,
    wordSpacing: htmlFieldWordSpacing || undefined,
    margin: htmlFieldSpacing || undefined,
  };

  // Field/button read through var(--exr-{key}, {desktop value}) — same
  // --exr-* bridge MultiButtons uses — so every one of these is genuinely
  // per-breakpoint responsive, not just a desktop-only literal like the
  // Label/HTML Field/Messages groups below still are (a scoped, disclosed
  // cut — "input/submit button" were the two pieces actually named).
  // Width/radius keep the exact same "unset sides default to 0 once ANY side
  // is set, otherwise fall back to the unified default" shape the old plain
  // join used, just with each side now individually wrapped in
  // var(--exr-{key}, …) so a Tablet/Mobile override on one side actually
  // takes effect instead of being silently discarded (a raw literal never
  // reads the --exr-* custom property resolveNodeStyle mints for these
  // fields).
  const fieldBorderWidthAnySet = Boolean(fieldBorderWidthTop || fieldBorderWidthRight || fieldBorderWidthBottom || fieldBorderWidthLeft);
  const fieldBorderRadiusAnySet = Boolean(fieldBorderRadiusTop || fieldBorderRadiusRight || fieldBorderRadiusBottom || fieldBorderRadiusLeft);
  const fieldStyle: CSSProperties = {
    color: `var(--exr-fieldColor, ${fieldColor || "var(--color-foreground)"})`,
    fontFamily: fieldFontFamily && fieldFontFamily !== "inherit" ? fieldFontFamily : undefined,
    fontSize: `var(--exr-fieldFontSize, ${fieldFontSize || "inherit"})`,
    fontWeight: `var(--exr-fieldFontWeight, ${fieldFontWeight || "inherit"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-fieldTextTransform, ${fieldTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: fieldFontStyle && fieldFontStyle !== "normal" ? fieldFontStyle : undefined,
    textDecoration: fieldTextDecoration && fieldTextDecoration !== "none" ? fieldTextDecoration : undefined,
    lineHeight: fieldLineHeight ? `var(--exr-fieldLineHeight, ${fieldLineHeight})` : undefined,
    letterSpacing: fieldLetterSpacing ? `var(--exr-fieldLetterSpacing, ${fieldLetterSpacing})` : undefined,
    wordSpacing: fieldWordSpacing || undefined,
    background: `var(--exr-fieldBackground, ${fieldBackground || "rgba(255,255,255,0.05)"})`,
    borderColor: `var(--exr-fieldBorderColor, ${fieldBorderColor || "rgba(255,255,255,0.15)"})`,
    borderTopWidth: `var(--exr-fieldBorderWidthTop, ${fieldBorderWidthTop || (fieldBorderWidthAnySet ? "0" : "1px")})`,
    borderRightWidth: `var(--exr-fieldBorderWidthRight, ${fieldBorderWidthRight || (fieldBorderWidthAnySet ? "0" : "1px")})`,
    borderBottomWidth: `var(--exr-fieldBorderWidthBottom, ${fieldBorderWidthBottom || (fieldBorderWidthAnySet ? "0" : "1px")})`,
    borderLeftWidth: `var(--exr-fieldBorderWidthLeft, ${fieldBorderWidthLeft || (fieldBorderWidthAnySet ? "0" : "1px")})`,
    borderRadius: fieldBorderRadiusAnySet
      ? `var(--exr-fieldBorderRadiusTop, ${fieldBorderRadiusTop || "0"}) var(--exr-fieldBorderRadiusRight, ${fieldBorderRadiusRight || "0"}) var(--exr-fieldBorderRadiusBottom, ${fieldBorderRadiusBottom || "0"}) var(--exr-fieldBorderRadiusLeft, ${fieldBorderRadiusLeft || "0"})`
      : undefined,
    boxShadow: fieldBoxShadow ? `var(--exr-fieldBoxShadow, ${fieldBoxShadow})` : undefined,
  };

  const hasButtonHover = buttonHoverBackground || buttonHoverColor || buttonHoverBoxShadow;
  const buttonHoverClass = hasButtonHover ? `form-btn-h${hashString(`${buttonHoverBackground ?? ""}|${buttonHoverColor ?? ""}|${buttonHoverBoxShadow ?? ""}`)}` : "";

  const buttonStyle: CSSProperties = {
    background: `var(--exr-buttonBackground, ${buttonBackground || "var(--color-gold)"})`,
    color: `var(--exr-buttonColor, ${buttonColor || "#000"})`,
    fontFamily: buttonFontFamily && buttonFontFamily !== "inherit" ? buttonFontFamily : undefined,
    fontSize: `var(--exr-buttonFontSize, ${buttonFontSize || "inherit"})`,
    fontWeight: `var(--exr-buttonFontWeight, ${buttonFontWeight || "inherit"})` as CSSProperties["fontWeight"],
    textTransform: `var(--exr-buttonTextTransform, ${buttonTextTransform || "none"})` as CSSProperties["textTransform"],
    fontStyle: buttonFontStyle && buttonFontStyle !== "normal" ? buttonFontStyle : undefined,
    textDecoration: buttonTextDecoration && buttonTextDecoration !== "none" ? buttonTextDecoration : undefined,
    lineHeight: buttonLineHeight ? `var(--exr-buttonLineHeight, ${buttonLineHeight})` : undefined,
    letterSpacing: buttonLetterSpacing ? `var(--exr-buttonLetterSpacing, ${buttonLetterSpacing})` : undefined,
    wordSpacing: buttonWordSpacing || undefined,
    borderStyle: buttonBorderStyle && buttonBorderStyle !== "none" ? buttonBorderStyle : undefined,
    borderTopWidth: buttonBorderStyle && buttonBorderStyle !== "none" ? `var(--exr-buttonBorderWidthTop, ${buttonBorderWidthTop || buttonBorderWidth || "1px"})` : undefined,
    borderRightWidth: buttonBorderStyle && buttonBorderStyle !== "none" ? `var(--exr-buttonBorderWidthRight, ${buttonBorderWidthRight || buttonBorderWidth || "1px"})` : undefined,
    borderBottomWidth: buttonBorderStyle && buttonBorderStyle !== "none" ? `var(--exr-buttonBorderWidthBottom, ${buttonBorderWidthBottom || buttonBorderWidth || "1px"})` : undefined,
    borderLeftWidth: buttonBorderStyle && buttonBorderStyle !== "none" ? `var(--exr-buttonBorderWidthLeft, ${buttonBorderWidthLeft || buttonBorderWidth || "1px"})` : undefined,
    borderColor: buttonBorderStyle && buttonBorderStyle !== "none" ? `var(--exr-buttonBorderColor, ${buttonBorderColor || "transparent"})` : undefined,
    borderRadius: buttonBorderRadiusTop || buttonBorderRadiusRight || buttonBorderRadiusBottom || buttonBorderRadiusLeft
      ? `var(--exr-buttonBorderRadiusTop, ${buttonBorderRadiusTop || "0"}) var(--exr-buttonBorderRadiusRight, ${buttonBorderRadiusRight || "0"}) var(--exr-buttonBorderRadiusBottom, ${buttonBorderRadiusBottom || "0"}) var(--exr-buttonBorderRadiusLeft, ${buttonBorderRadiusLeft || "0"})`
      : "8px",
    paddingTop: buttonPaddingTop || "12px",
    paddingRight: buttonPaddingRight || "24px",
    paddingBottom: buttonPaddingBottom || "12px",
    paddingLeft: buttonPaddingLeft || "24px",
    boxShadow: buttonBoxShadow ? `var(--exr-buttonBoxShadow, ${buttonBoxShadow})` : undefined,
    width: buttonAlignment === "full-width" ? "100%" : undefined,
    justifyContent: "center",
  };

  return (
    <form onSubmit={handleSubmit} noValidate={false} style={formBoxShadow ? { boxShadow: `var(--exr-formBoxShadow, ${formBoxShadow})` } : undefined}>
      <GoogleFontLink family={labelFontFamily} />
      <GoogleFontLink family={htmlFieldFontFamily} />
      <GoogleFontLink family={fieldFontFamily} />
      <GoogleFontLink family={buttonFontFamily} />
      {hasButtonHover && (
        <style
          dangerouslySetInnerHTML={{
            __html: `.${buttonHoverClass}:hover{${[
              buttonHoverBackground && `background:var(--exr-buttonHoverBackground, ${buttonHoverBackground}) !important;`,
              buttonHoverColor && `color:var(--exr-buttonHoverColor, ${buttonHoverColor}) !important;`,
              buttonHoverBoxShadow && `box-shadow:var(--exr-buttonHoverBoxShadow, ${buttonHoverBoxShadow}) !important;`,
            ]
              .filter(Boolean)
              .join("")}}`,
          }}
        />
      )}

      <div className="flex flex-wrap" style={{ rowGap: rowsGap || "16px", columnGap: columnsGap || "16px" }}>
        {list.map((field) => (
          <div
            key={field.id}
            style={{ width: `${field.columnWidth ?? "100"}%` }}
            className="px-0"
            onFocusCapture={() => fieldTrackerRef.current.onFieldFocus(field.id, field.label || field.id)}
          >
            {field.type === "html" ? (
              <div style={htmlFieldStyle} dangerouslySetInnerHTML={{ __html: field.htmlContent ?? "" }} />
            ) : field.type === "recaptcha" ? (
              recaptchaV2SiteKey ? (
                <div ref={recaptchaV2ContainerRef} />
              ) : (
                <p className="text-xs text-foreground/40">reCAPTCHA not configured (Settings → Integrations, admin dashboard).</p>
              )
            ) : field.type === "recaptcha_v3" ? (
              recaptchaV3SiteKey ? (
                <p className="text-[11px] text-foreground/40">
                  This site is protected by reCAPTCHA and the Google Privacy Policy and Terms of Service apply.
                </p>
              ) : (
                <p className="text-xs text-foreground/40">reCAPTCHA V3 not configured (Settings → Integrations, admin dashboard).</p>
              )
            ) : (
              <>
                {showLabel && field.type !== "acceptance" && field.type !== "hidden" && field.type !== "honeypot" && (
                  <label htmlFor={field.id} style={labelStyle}>
                    {field.label}
                    {showRequiredMark && field.required && <span className="ml-0.5 text-gold">*</span>}
                  </label>
                )}
                {field.type === "file" ? (
                  <div>
                    <input
                      id={field.id}
                      type="file"
                      required={field.required && !files[field.id]}
                      accept={field.allowedFileTypes ? field.allowedFileTypes.split(",").map((t) => `.${t.trim()}`).join(",") : undefined}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setFiles((prev) => {
                          const next = { ...prev };
                          if (file) next[field.id] = file;
                          else delete next[field.id];
                          return next;
                        });
                      }}
                      className={`${FIELD_BASE_CLASS} ${sizeClass} file:mr-3 file:rounded-md file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-white`}
                      style={fieldStyle}
                    />
                    {field.maxFileSizeMb && <p className="mt-1 text-[11px] text-foreground/40">Max {field.maxFileSizeMb}MB.</p>}
                  </div>
                ) : (
                  <FieldInput field={field} sizeClass={sizeClass} style={fieldStyle} value={values[field.id] ?? ""} onChange={(v) => setField(field.id, v)} />
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {status === "error" && errorMessage && (
        <p className="mt-3 text-sm" style={{ color: errorMessageColor || "#f87171", ...messagesStyle }}>
          {errorMessage}
        </p>
      )}

      <div style={{ textAlign: buttonAlignment === "full-width" ? undefined : buttonAlignment || "left" }}>
        <button
          type="submit"
          disabled={status === "submitting"}
          className={`mt-4 inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-90 disabled:opacity-50 ${buttonHoverClass}`}
          style={buttonStyle}
        >
          {submitIconPosition === "before" && <SubmitArrow />}
          {status === "submitting" ? "Sending…" : submitLabel || "Send"}
          {submitIconPosition === "after" && <SubmitArrow />}
        </button>
      </div>
    </form>
  );
}

function SubmitArrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
