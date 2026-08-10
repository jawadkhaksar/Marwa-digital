import type { User } from "@marwa/db";
import { renderBrandedEmail } from "./emailTemplates";
import { sendMail } from "./mailer";

const ADMIN_URL = process.env.ADMIN_URL ?? "http://localhost:3001";

/** The admin app hosts /reset-password (not apps/web) — this is a staff-only flow for ADMIN/EDITOR accounts, not a public-visitor feature. */
export async function sendPasswordResetEmail(user: User, rawToken: string): Promise<void> {
  const resetUrl = `${ADMIN_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const { subject, html } = await renderBrandedEmail("PASSWORD_RESET", {
    name: user.name,
    resetUrl,
    expiresIn: "1 hour",
  });

  const result = await sendMail({ to: user.email, subject, html });
  if (result.status === "failed") {
    console.error("[notifications] Failed to send password reset email:", result.detail);
  }
}
