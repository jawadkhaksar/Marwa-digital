import type { ZodError } from "zod";

// zod's own .flatten()/.message are structured objects/JSON, not something
// safe to hand straight to a client as `{ error: ... }` — the admin (and
// public) API clients treat `error` as a plain string, so a raw flatten()
// object renders as the unhelpful "[object Object]".
export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => (issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message))
    .join("; ");
}
