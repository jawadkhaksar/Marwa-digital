import { prisma, Prisma } from "@marwa/db";

/**
 * Best-effort name/email pulled out of a free-form fields/data object (Form
 * block field ids, or ContactInquiry-style plain fields) — field ids are
 * admin-chosen for the builder's Form block, so this matches on common
 * conventions (a field literally called/id'd "email", "name", etc.) rather
 * than a fixed schema. Shared by the contact auto-unification engine below
 * and the admin Analytics "Unified Leads" report, which needs the exact same
 * heuristic to display a name/email for raw FormSubmission rows.
 */
export function guessNameEmail(data: unknown): { name: string; email: string } {
  const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  let name = "";
  let email = "";
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== "string") continue;
    const k = key.toLowerCase();
    if (!email && (k.includes("email") || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) email = value;
    else if (!name && (k.includes("name") || k === "fullname" || k === "full_name")) name = value;
  }
  return { name: name || "—", email: email || "—" };
}

function splitName(name?: string): { firstName?: string; lastName?: string } {
  if (!name) return {};
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  const [firstName, ...rest] = parts;
  return { firstName, lastName: rest.length ? rest.join(" ") : undefined };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UnifyContactInput {
  email: string | undefined | null;
  name?: string;
  phone?: string;
  sessionId?: string;
  activityType: string;
  activityTitle: string;
  activityDescription?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * The contact auto-unification engine: intercepts a raw lead-producing
 * payload (POST /api/contact, POST /api/forms/submit) and resolves it onto a
 * single 360°-profile Contact row, matched by email. Creates one on first
 * contact, reuses it on every subsequent touch, and logs a ContactActivity
 * either way so the profile's timeline reflects every inbound event. Returns
 * null (doing nothing) when no usable email could be resolved — a lead
 * without an email still saves via its own table as before, it just isn't
 * linked into the CRM.
 */
export async function unifyContact(input: UnifyContactInput): Promise<string | null> {
  const email = input.email?.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return null;

  const { firstName, lastName } = splitName(input.name);
  const existing = await prisma.contact.findUnique({ where: { email } });

  const contact = existing
    ? await prisma.contact.update({
        where: { id: existing.id },
        data: {
          firstName: existing.firstName ?? firstName,
          lastName: existing.lastName ?? lastName,
          phone: existing.phone ?? input.phone,
        },
      })
    : await prisma.contact.create({
        data: { email, firstName, lastName, phone: input.phone },
      });

  await prisma.contactActivity.create({
    data: {
      contactId: contact.id,
      type: input.activityType,
      title: input.activityTitle,
      description: input.activityDescription,
      metadata: input.metadata,
    },
  });

  if (input.sessionId) {
    const session = await prisma.visitorSession.findUnique({ where: { sessionId: input.sessionId }, select: { contactId: true } });
    if (session && !session.contactId) {
      await prisma.visitorSession.update({ where: { sessionId: input.sessionId }, data: { contactId: contact.id } });
    }
  }

  return contact.id;
}

export type DealStatus = "OPEN" | "WON" | "LOST";

/**
 * Automated Deal Stage Trigger: derives the Deal.status a stage's
 * `stageType` implies — dragging (or otherwise moving) a Deal into a WON or
 * LOST stage flips its status to match, and moving it into any DEFAULT
 * stage (a stage's type defaults to this) resets it to OPEN. Called by both
 * PATCH /api/admin/crm/deals/:id and .../:id/reorder any time a Deal's
 * stageId actually changes, so the two entry points can't drift apart.
 */
export function dealStatusForStageType(stageType: string): DealStatus {
  if (stageType === "WON") return "WON";
  if (stageType === "LOST") return "LOST";
  return "OPEN";
}
