import { sendMail } from "./mailer";

/**
 * Same SMTP setup as contactNotifications.ts's sendContactInquiryEmail —
 * "From" stays fixed to the site's own configured mailbox (an
 * admin-editable arbitrary From Email would get rejected/spam-filtered by
 * most SMTP hosts, which only allow sending as an address they own), but
 * everything a Form block's admin actually configures (To, Subject,
 * Message, From Name, Reply-To, Cc, Bcc) is honored.
 */
export async function sendFormSubmissionEmail(params: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  replyTo?: string;
  cc?: string;
  bcc?: string;
}): Promise<{ status: "ok" | "skipped" | "failed"; detail?: string }> {
  return sendMail(params);
}
