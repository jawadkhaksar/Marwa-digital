import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "@marwa/db";
import { getBlockDefinition, parseLayoutDocumentSafe, parseBlockProps, isValidPhone, type LayoutNode, type FormFieldDef } from "@marwa/builder";
import { sendFormSubmissionEmail } from "../lib/formNotifications";
import { formatZodError } from "../lib/zodError";
import { formsLimiter, looksLikeBot, isAllowedImageUpload, type AllowedUploadKind } from "../lib/security";
import { unifyContact, guessNameEmail } from "../lib/crm";
import { dispatchTrigger } from "../services/workflowEngine";

export const formsRouter = Router();

/**
 * Real Google siteverify call — not a stub. Both v2 (checkbox) and v3
 * (invisible, score-based) use the same verify endpoint; v3's response also
 * carries a `score` (0–1, higher = more human) the caller thresholds.
 * Gracefully no-ops (treated as "pass") when the matching secret key isn't
 * configured — same pattern as sendFormSubmissionEmail with RESEND_API_KEY,
 * so an admin can add a reCAPTCHA field before ops has set the env vars
 * without every submission silently failing in the meantime.
 */
async function verifyRecaptcha(token: string | undefined, secretKey: string | undefined, minScore = 0.5): Promise<{ ok: boolean; detail?: string }> {
  if (!secretKey) return { ok: true, detail: "reCAPTCHA secret key not configured — skipped" };
  if (!token) return { ok: false, detail: "No reCAPTCHA token submitted" };
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success: boolean; score?: number; "error-codes"?: string[] };
    if (!data.success) return { ok: false, detail: data["error-codes"]?.join(", ") || "Verification failed" };
    if (typeof data.score === "number" && data.score < minScore) return { ok: false, detail: `Score ${data.score} below threshold` };
    return { ok: true };
  } catch (err) {
    console.error("[forms] reCAPTCHA verification request failed:", err);
    // A network hiccup talking to Google shouldn't block a real visitor —
    // fail open here (unlike a failed/low-score verification, which fails closed above).
    return { ok: true, detail: "Verification request failed — allowed through" };
  }
}

interface FormNodeProps {
  fields: FormFieldDef[];
  actions: string[];
  formId: string;
  collectUserIp: boolean;
  collectUserAgent: boolean;
  emailTo?: string;
  emailSubject: string;
  emailMessage: string;
  emailFromName?: string;
  emailReplyTo?: string;
  emailCc?: string;
  emailBcc?: string;
  redirectUrl?: string;
  webhookUrl?: string;
}

// Matched by the admin-set "Form ID" prop, not the block's internal node.id
// — the client only knows the former (it's the identifier the Form block
// itself renders with), and requiring FieldsEditor/PropertyPanel to also
// thread node.id down through every Form instance would mean touching
// LayoutRenderer's shared, already-working rendering path for one block.
function findFormNodeByFormId(nodes: LayoutNode[], formId: string): LayoutNode | null {
  for (const n of nodes) {
    if (n.type === "Form" && n.props.formId === formId) return n;
    if (n.children) {
      const found = findFormNodeByFormId(n.children, formId);
      if (found) return found;
    }
  }
  return null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function formatAllFields(fields: FormFieldDef[], data: Record<string, string>): string {
  const rows = fields
    .filter((f) => f.type !== "hidden" && f.type !== "honeypot" && f.type !== "html")
    .map(
      (f) =>
        `<tr><td style="padding:6px 12px;font-weight:600;border-bottom:1px solid #e5e5e5;white-space:nowrap;">${escapeHtml(f.label || f.id)}</td><td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${escapeHtml(data[f.id] ?? "")}</td></tr>`
    )
    .join("");
  return `<table style="border-collapse:collapse;width:100%;max-width:480px;">${rows}</table>`;
}

const submitSchema = z.object({
  pageSlug: z.string().min(1),
  formId: z.string().min(1),
  fields: z.record(z.string(), z.string()),
  // Client-supplied "form rendered at" timestamp — bot defense, see
  // looksLikeBot() below. Optional so a client build that predates this
  // still submits successfully; it just skips the timing check.
  renderedAt: z.coerce.number().optional(),
  // Lead attribution — see the matching fields on POST /api/contact above.
  sessionId: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  landingPage: z.string().optional(),
  conversionPage: z.string().optional(),
});

/** Shared by /submit and /upload — re-fetches the page's own layout JSON and pulls out one Form node's trusted, admin-authored config. Never derived from anything the client sent. */
async function loadFormConfig(pageSlug: string, formId: string): Promise<{ node: LayoutNode; config: FormNodeProps } | { error: string; status: number }> {
  const page = await prisma.page.findUnique({ where: { slug: pageSlug } });
  if (!page || !page.published || page.editorMode !== "BUILDER" || !page.layout) {
    return { error: "Form not found", status: 404 };
  }

  const doc = parseLayoutDocumentSafe(page.layout);
  const node = findFormNodeByFormId(doc.nodes, formId);
  if (!node) return { error: "Form not found", status: 404 };

  const definition = getBlockDefinition("Form");
  if (!definition) return { error: "Form block is not registered", status: 500 };

  try {
    const config = parseBlockProps(definition.propsSchema, node.props) as unknown as FormNodeProps;
    return { node, config };
  } catch {
    return { error: "This form's configuration is invalid", status: 500 };
  }
}

/**
 * Public — no auth, since site visitors submit forms. Deliberately does NOT
 * trust the client for anything except the raw field values: which actions
 * run and where they send data (email address, webhook URL, redirect
 * target) all come from re-fetching the page's own `layout` JSON server-side
 * and reading that same Form node's props — content only an authenticated
 * admin could have set via the CMS. Without this, a client could submit
 * `{ emailTo: "attacker@evil.com", webhookUrl: "http://internal-service/..." }`
 * directly to this endpoint and turn it into an open relay / SSRF vector.
 */
formsRouter.post("/submit", formsLimiter, async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { pageSlug, formId, fields, renderedAt, sessionId, utmSource, utmMedium, utmCampaign, landingPage, conversionPage } = parsed.data;

  const loaded = await loadFormConfig(pageSlug, formId);
  if ("error" in loaded) return res.status(loaded.status).json({ error: loaded.error });
  const { node, config } = loaded;

  // Honeypot: real visitors never see this field (see FormBlock's rendering
  // — it's visually hidden, not just a disabled/readonly input). A bot that
  // blindly fills every input trips it. Respond as if the submission
  // succeeded so the bot doesn't learn to look elsewhere, but do nothing.
  const honeypotField = config.fields.find((f) => f.type === "honeypot");
  const honeypotFilled = Boolean(honeypotField && fields[honeypotField.id]);
  if (honeypotFilled || looksLikeBot(undefined, renderedAt)) {
    return res.json({ ok: true });
  }

  // Defense in depth: the client already enforces `required` via HTML5, but
  // a direct API call bypasses that entirely.
  const missing = config.fields.filter((f) => f.required && f.type !== "honeypot" && !fields[f.id]?.trim());
  if (missing.length > 0) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.map((f) => f.label || f.id).join(", ")}` });
  }

  // A "tel" field's own showCountryCode dropdown (see FormBlock.tsx)
  // constrains what a real visitor can type, but a direct API call bypasses
  // the client entirely — same defense-in-depth reasoning as the honeypot
  // and required-field checks above.
  const invalidPhone = config.fields.find((f) => f.type === "tel" && fields[f.id]?.trim() && !isValidPhone(fields[f.id]));
  if (invalidPhone) {
    return res.status(400).json({ error: `Enter a valid phone number for "${invalidPhone.label || invalidPhone.id}"` });
  }

  const recaptchaV2Field = config.fields.find((f) => f.type === "recaptcha");
  const recaptchaV3Field = config.fields.find((f) => f.type === "recaptcha_v3");
  if (recaptchaV2Field || recaptchaV3Field) {
    // Site-wide, admin-configurable via Settings → Integrations (falls back
    // to env vars if the DB row hasn't been touched yet) — not per-form.
    const siteSettings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    if (recaptchaV2Field) {
      const result = await verifyRecaptcha(fields[recaptchaV2Field.id], siteSettings?.recaptchaV2SecretKey ?? process.env.RECAPTCHA_V2_SECRET_KEY);
      if (!result.ok) return res.status(400).json({ error: `reCAPTCHA verification failed${result.detail ? `: ${result.detail}` : ""}` });
    }
    if (recaptchaV3Field) {
      const minScore = Number(siteSettings?.recaptchaV3ScoreThreshold ?? "0.5") || 0.5;
      const result = await verifyRecaptcha(fields[recaptchaV3Field.id], siteSettings?.recaptchaV3SecretKey ?? process.env.RECAPTCHA_V3_SECRET_KEY, minScore);
      if (!result.ok) return res.status(400).json({ error: `reCAPTCHA verification failed${result.detail ? `: ${result.detail}` : ""}` });
    }
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  const userIp = (typeof forwardedFor === "string" ? forwardedFor.split(",")[0]?.trim() : undefined) || req.socket.remoteAddress || undefined;
  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined;

  const actionsLog: { action: string; status: "ok" | "skipped" | "failed"; detail?: string }[] = [];

  if (config.actions.includes("email")) {
    if (config.emailTo) {
      const html = config.emailMessage.includes("{{all_fields}}")
        ? config.emailMessage.replace("{{all_fields}}", formatAllFields(config.fields, fields))
        : escapeHtml(config.emailMessage);
      const result = await sendFormSubmissionEmail({
        to: config.emailTo,
        subject: config.emailSubject,
        html,
        fromName: config.emailFromName,
        replyTo: config.emailReplyTo,
        cc: config.emailCc,
        bcc: config.emailBcc,
      });
      actionsLog.push({ action: "email", ...result });
    } else {
      actionsLog.push({ action: "email", status: "skipped", detail: "No 'Email To' address configured" });
    }
  }

  if (config.actions.includes("webhook")) {
    if (config.webhookUrl) {
      try {
        await fetch(config.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formId: config.formId, pageSlug, fields }),
          signal: AbortSignal.timeout(8000),
        });
        actionsLog.push({ action: "webhook", status: "ok" });
      } catch (err) {
        console.error("[forms] Webhook delivery failed:", err);
        actionsLog.push({ action: "webhook", status: "failed", detail: err instanceof Error ? err.message : "Unknown error" });
      }
    } else {
      actionsLog.push({ action: "webhook", status: "skipped", detail: "No Webhook URL configured" });
    }
  }

  if (config.actions.includes("redirect")) {
    actionsLog.push({ action: "redirect", status: config.redirectUrl ? "ok" : "skipped", detail: config.redirectUrl || "No Redirect URL configured" });
  }

  if (config.actions.includes("collectSubmissions")) {
    // Same "does this id still resolve to a real session" guard as
    // POST /api/contact — the FK is nullable for exactly this case.
    const validSessionId = sessionId && (await prisma.visitorSession.findUnique({ where: { sessionId }, select: { sessionId: true } })) ? sessionId : undefined;

    // Contact auto-unification: same engine as POST /api/contact — a form's
    // field ids are admin-chosen, so the email/name are best-effort guessed
    // out of the submitted values (see guessNameEmail).
    const { name, email } = guessNameEmail(fields);
    const contactId = await unifyContact({
      email,
      name,
      sessionId: validSessionId,
      activityType: "FORM_SUBMITTED",
      activityTitle: `Submitted form "${config.formId}" on ${pageSlug}`,
      metadata: { formId: config.formId, pageSlug, fields },
    });

    await prisma.formSubmission.create({
      data: {
        formId: config.formId,
        pageSlug,
        blockId: node.id,
        data: fields,
        actionsLog,
        userIp: config.collectUserIp ? userIp : undefined,
        userAgent: config.collectUserAgent ? userAgent : undefined,
        sessionId: validSessionId,
        utmSource,
        utmMedium,
        utmCampaign,
        landingPage,
        conversionPage,
        contactId,
      },
    });

    dispatchTrigger("FORM_SUBMITTED", { contactId, formId: config.formId });
  }

  res.json({ ok: true, redirectUrl: config.actions.includes("redirect") ? config.redirectUrl : undefined });
});

// ── File Upload field type ──────────────────────────────────────────────
// Same uploads/ dir + static serving as the admin's media library
// (packages/api/src/routes/admin/media.ts), but this endpoint is public —
// site visitors upload attachments through it — so it's deliberately more
// conservative: a hard global size cap and a safe-type allowlist apply
// *before* any per-field config is even looked up, and the admin's own
// Max File Size/Allowed File Types on the field (checked after upload,
// since multer's limits are fixed at construction time, not per-request)
// can only tighten those further, never loosen them.
const FORM_UPLOAD_DIR = path.join(process.cwd(), "uploads");
fs.mkdirSync(FORM_UPLOAD_DIR, { recursive: true });

const HARD_MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB ceiling regardless of field config
const DEFAULT_ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt"];

// Extensions whose real content can be verified by signature (see
// detectUploadKind in lib/security.ts). doc/docx/xls/xlsx are ZIP/OLE
// containers that share a signature with any other ZIP/OLE file, so they
// aren't meaningfully verifiable this way — those stay extension-checked
// only, same as before. txt has no signature at all by definition.
const VERIFIABLE_EXTENSIONS: Record<string, AllowedUploadKind> = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", gif: "gif", pdf: "pdf" };

// Buffered in memory so the actual bytes can be signature-checked before
// anything is written to disk (see admin/media.ts for the same pattern).
const formUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: HARD_MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (!DEFAULT_ALLOWED_EXTENSIONS.includes(ext)) {
      const err = new Error(`File type .${ext} isn't allowed`) as Error & { status?: number };
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

formsRouter.post(
  "/upload",
  (req, res, next) => {
    formUpload.single("file")(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        const message = err.code === "LIMIT_FILE_SIZE" ? `File must be under ${HARD_MAX_UPLOAD_BYTES / 1024 / 1024}MB` : err.message;
        return res.status(400).json({ error: message });
      }
      next(err);
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    function reject(message: string) {
      return res.status(400).json({ error: message });
    }

    const { pageSlug, formId, fieldId } = req.body as { pageSlug?: string; formId?: string; fieldId?: string };
    if (!pageSlug || !formId || !fieldId) return reject("Missing pageSlug/formId/fieldId");

    const loaded = await loadFormConfig(pageSlug, formId);
    if ("error" in loaded) return reject(loaded.error);

    const field = loaded.config.fields.find((f) => f.id === fieldId && f.type === "file");
    if (!field) return reject("This form has no matching File Upload field");

    if (field.maxFileSizeMb && req.file.size > field.maxFileSizeMb * 1024 * 1024) {
      return reject(`File must be under ${field.maxFileSizeMb}MB`);
    }
    const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
    if (field.allowedFileTypes) {
      const allowed = field.allowedFileTypes.split(",").map((t) => t.trim().toLowerCase().replace(".", ""));
      if (allowed.length > 0 && !allowed.includes(ext)) {
        return reject(`Allowed file types: ${field.allowedFileTypes}`);
      }
    }

    const expectedKind = VERIFIABLE_EXTENSIONS[ext];
    if (expectedKind && !isAllowedImageUpload(req.file.buffer, ext, [expectedKind])) {
      return reject("File content doesn't match its extension");
    }

    const filename = `form-${crypto.randomUUID()}.${ext}`;
    fs.writeFileSync(path.join(FORM_UPLOAD_DIR, filename), req.file.buffer);

    res.status(201).json({ url: `/uploads/${filename}`, filename: req.file.originalname });
  }
);
