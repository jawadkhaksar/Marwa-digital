import { api } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

/**
 * Form Field Analytics: reports one "interaction" the first time each field
 * is focused, and — only if the visitor leaves without a successful submit
 * — one "abandonment" for whichever field they were last in. One tracker
 * per mounted form (ContactForm, each FormBlock instance); create it once
 * per form mount and call `destroy()` on unmount.
 */
export interface FormFieldTracker {
  onFieldFocus: (fieldId: string, fieldName: string) => void;
  onSubmitSuccess: () => void;
  destroy: () => void;
}

export function createFormFieldTracker(formId: string): FormFieldTracker {
  let lastField: { fieldId: string; fieldName: string } | null = null;
  let submitted = false;
  const reportedInteractions = new Set<string>();

  function reportAbandonment() {
    if (submitted || !lastField || typeof navigator === "undefined" || !navigator.sendBeacon) return;
    const body = JSON.stringify({ formId, fieldId: lastField.fieldId, fieldName: lastField.fieldName, event: "abandonment" });
    navigator.sendBeacon(`${API_URL}/api/analytics/forms/field-event`, new Blob([body], { type: "application/json" }));
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") reportAbandonment();
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", reportAbandonment);
  }

  return {
    onFieldFocus(fieldId, fieldName) {
      lastField = { fieldId, fieldName };
      if (reportedInteractions.has(fieldId)) return;
      reportedInteractions.add(fieldId);
      api.recordFormFieldEvent({ formId, fieldId, fieldName, event: "interaction" }).catch(() => {});
    },
    onSubmitSuccess() {
      submitted = true;
    },
    destroy() {
      if (typeof document === "undefined") return;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", reportAbandonment);
    },
  };
}
