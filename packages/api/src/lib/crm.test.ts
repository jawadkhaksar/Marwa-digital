import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@marwa/db";
import { unifyContact, dealStatusForStageType } from "./crm";

const createdContactIds: string[] = [];
const createdSessionIds: string[] = [];

function uniqueEmail(label: string): string {
  return `vitest-crm-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
}

afterAll(async () => {
  // ContactActivity/VisitorSession.contactId cascade/null out via the
  // schema's own onDelete rules, so deleting the Contact rows is enough.
  await prisma.contact.deleteMany({ where: { id: { in: createdContactIds } } });
  await prisma.visitorSession.deleteMany({ where: { id: { in: createdSessionIds } } });
});

describe("dealStatusForStageType (Automated Deal Stage Trigger)", () => {
  it("maps a WON stage to WON status", () => {
    expect(dealStatusForStageType("WON")).toBe("WON");
  });

  it("maps a LOST stage to LOST status", () => {
    expect(dealStatusForStageType("LOST")).toBe("LOST");
  });

  it("maps a DEFAULT stage to OPEN status", () => {
    expect(dealStatusForStageType("DEFAULT")).toBe("OPEN");
  });

  it("falls back to OPEN for any unrecognized stage type", () => {
    expect(dealStatusForStageType("something-else")).toBe("OPEN");
  });
});

describe("unifyContact (contact auto-unification engine)", () => {
  it("creates a new Contact and logs a ContactActivity when no contact exists for the email", async () => {
    const email = uniqueEmail("new");
    const contactId = await unifyContact({
      email,
      name: "Ada Lovelace",
      phone: "+15551234567",
      activityType: "INQUIRY_SUBMITTED",
      activityTitle: "Submitted contact form",
    });
    expect(contactId).not.toBeNull();
    createdContactIds.push(contactId!);

    const contact = await prisma.contact.findUnique({ where: { id: contactId! }, include: { activities: true } });
    expect(contact?.email).toBe(email.toLowerCase());
    expect(contact?.firstName).toBe("Ada");
    expect(contact?.lastName).toBe("Lovelace");
    expect(contact?.activities).toHaveLength(1);
    expect(contact?.activities[0].type).toBe("INQUIRY_SUBMITTED");
  });

  it("reuses the existing Contact on a second touch with the same email instead of creating a duplicate", async () => {
    const email = uniqueEmail("repeat");
    const firstId = await unifyContact({ email, name: "Grace Hopper", activityType: "INQUIRY_SUBMITTED", activityTitle: "First touch" });
    createdContactIds.push(firstId!);

    const secondId = await unifyContact({ email: email.toUpperCase(), name: "Grace M. Hopper", activityType: "FORM_SUBMITTED", activityTitle: "Second touch" });

    expect(secondId).toBe(firstId);
    const contact = await prisma.contact.findUnique({ where: { id: firstId! }, include: { activities: true } });
    // Existing firstName/lastName win — a later touch's guessed name never overwrites it.
    expect(contact?.lastName).toBe("Hopper");
    expect(contact?.activities).toHaveLength(2);
  });

  it("returns null and does nothing when no usable email can be resolved", async () => {
    const result = await unifyContact({ email: "not-an-email", activityType: "FORM_SUBMITTED", activityTitle: "No email" });
    expect(result).toBeNull();
  });

  it("stamps lead attribution: links the visitor's VisitorSession to the resulting Contact", async () => {
    const sessionId = `vitest-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const session = await prisma.visitorSession.create({ data: { sessionId, landingPage: "/pricing" } });
    createdSessionIds.push(session.id);

    const email = uniqueEmail("attributed");
    const contactId = await unifyContact({ email, name: "Grace Attribution", sessionId, activityType: "FORM_SUBMITTED", activityTitle: "Attributed submission" });
    createdContactIds.push(contactId!);

    const updatedSession = await prisma.visitorSession.findUnique({ where: { sessionId } });
    expect(updatedSession?.contactId).toBe(contactId);
  });

  it("never overwrites a session's existing attribution to a different contact", async () => {
    const sessionId = `vitest-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const firstEmail = uniqueEmail("first-owner");
    const firstContactId = await unifyContact({ email: firstEmail, activityType: "FORM_SUBMITTED", activityTitle: "First owner" });
    createdContactIds.push(firstContactId!);

    const session = await prisma.visitorSession.create({ data: { sessionId, contactId: firstContactId } });
    createdSessionIds.push(session.id);

    const secondEmail = uniqueEmail("second-owner");
    const secondContactId = await unifyContact({ email: secondEmail, sessionId, activityType: "FORM_SUBMITTED", activityTitle: "Second owner" });
    createdContactIds.push(secondContactId!);

    const unchangedSession = await prisma.visitorSession.findUnique({ where: { sessionId } });
    expect(unchangedSession?.contactId).toBe(firstContactId);
    expect(unchangedSession?.contactId).not.toBe(secondContactId);
  });
});
