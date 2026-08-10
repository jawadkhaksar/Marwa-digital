import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "@marwa/db";

/**
 * Sends outgoing mail through the site's own mailbox (Hostinger, A2Hosting,
 * or any other SMTP-capable host) instead of a third-party API like Resend —
 * no domain-verification step, works with whatever mailbox the site already
 * has. Admin-editable via Settings → Integrations (`SiteSettings.smtp*`);
 * falls back to `SMTP_*` env vars when the DB row hasn't been touched yet,
 * matching the same DB-first/env-fallback pattern already used for
 * reCAPTCHA. Gracefully no-ops (`{status:"skipped"}`) when neither source
 * has a host configured, so nothing crashes in an environment without email
 * set up yet.
 */

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromEmail: string;
  fromName?: string;
}

async function resolveSmtpConfig(): Promise<SmtpConfig | null> {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });

  const host = settings?.smtpHost || process.env.SMTP_HOST;
  if (!host) return null;

  const port = Number(settings?.smtpPort || process.env.SMTP_PORT) || 587;
  const secure = settings?.smtpHost ? settings.smtpSecure : (process.env.SMTP_SECURE ?? "true") !== "false";
  const user = settings?.smtpUser || process.env.SMTP_USER || undefined;
  const pass = settings?.smtpPassword || process.env.SMTP_PASS || undefined;
  const fromEmail = settings?.smtpFromEmail || process.env.SMTP_FROM_EMAIL || user || "no-reply@marwadigital.com";
  const fromName = settings?.smtpFromName || process.env.SMTP_FROM_NAME || undefined;

  return { host, port, secure, user, pass, fromEmail, fromName };
}

let cachedTransporter: { key: string; transporter: Transporter } | null = null;

function getTransporter(config: SmtpConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user ?? ""}`;
  if (cachedTransporter?.key === key) return cachedTransporter.transporter;

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });
  cachedTransporter = { key, transporter };
  return transporter;
}

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
  attachments?: { filename: string; content: Buffer; cid?: string }[];
}

export type SendMailResult = { status: "ok" } | { status: "skipped"; detail: string } | { status: "failed"; detail: string };

export async function sendMail(params: SendMailParams): Promise<SendMailResult> {
  const config = await resolveSmtpConfig();
  if (!config) {
    console.warn(`[mailer] SMTP not configured — skipping email to ${params.to}`);
    return { status: "skipped", detail: "SMTP not configured" };
  }

  try {
    const transporter = getTransporter(config);
    const fromName = params.fromName || config.fromName;
    await transporter.sendMail({
      from: fromName ? `${fromName} <${config.fromEmail}>` : config.fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo || undefined,
      cc: params.cc || undefined,
      bcc: params.bcc || undefined,
      attachments: params.attachments,
    });
    return { status: "ok" };
  } catch (err) {
    console.error("[mailer] Failed to send email:", err);
    return { status: "failed", detail: err instanceof Error ? err.message : "Unknown error" };
  }
}
