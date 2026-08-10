import type { ContactInquiry } from "@marwa/db";
import { renderBrandedEmail, getBranding } from "./emailTemplates";
import { sendMail } from "./mailer";

/**
 * Notifies the site's own inbox that a visitor submitted the Contact form.
 * Goes through the CONTACT_INQUIRY template (Admin → Email Templates) so the
 * copy is admin-editable, and through EMAIL_SHELL so it carries the same
 * branded header/footer as everything else the site sends.
 */
export async function sendContactInquiryEmail(inquiry: ContactInquiry) {
  const { contactEmail } = await getBranding();
  const { subject, html, attachments } = await renderBrandedEmail("CONTACT_INQUIRY", {
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone ?? "—",
    message: inquiry.message ?? "—",
    receivedAt: inquiry.createdAt.toLocaleString(),
  });

  const result = await sendMail({
    to: process.env.INQUIRY_NOTIFY_EMAIL ?? contactEmail,
    replyTo: inquiry.email,
    subject,
    html,
    attachments,
  });
  if (result.status === "failed") {
    console.error("[notifications] Failed to send contact inquiry email:", result.detail);
  }
}
