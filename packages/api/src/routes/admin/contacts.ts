import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";
import type { AuthedRequest } from "../../lib/auth";
import type { TenantRequest } from "../../middleware/tenant";
import { dispatchTrigger } from "../../services/workflowEngine";

export const adminContactsRouter = Router();

// GET / — paginated search with tag/status filters, for the Contacts list
// view. See adminPagesRouter's GET / for the no-header/global-view rule.
adminContactsRouter.get("/", async (req: TenantRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;

  const where: Prisma.ContactWhereInput = {
    ...(req.organizationId ? { organizationId: req.organizationId } : {}),
    ...(status ? { status } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        deals: { select: { id: true, value: true, currency: true, status: true } },
        _count: { select: { notes: true, activities: true } },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  res.json({ items, total, page, limit });
});

const createContactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

adminContactsRouter.post("/", async (req: TenantRequest, res) => {
  const parsed = createContactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const email = parsed.data.email.trim().toLowerCase();

  const existing = await prisma.contact.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "A contact with this email already exists" });

  const contact = await prisma.contact.create({ data: { ...parsed.data, email, organizationId: req.organizationId } });
  res.status(201).json(contact);
});

// GET /:id — full 360° profile: contact fields, deals (with pipeline/stage),
// notes, raw inquiries/submissions, linked sessions (with pageviews +
// recording), and a merged chronological `timeline` combining
// ContactActivity rows with every PageView across this contact's sessions —
// pages viewed, forms submitted, and stage changes in one feed.
adminContactsRouter.get("/:id", async (req, res) => {
  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
    include: {
      deals: { include: { stage: { include: { pipeline: true } } }, orderBy: { createdAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      inquiries: { orderBy: { createdAt: "desc" } },
      submissions: { orderBy: { createdAt: "desc" } },
      sessions: {
        orderBy: { createdAt: "desc" },
        include: { pageViews: { orderBy: { createdAt: "asc" } }, recording: true },
      },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!contact) return res.status(404).json({ error: "Contact not found" });

  const pageViewEvents = contact.sessions.flatMap((s) =>
    s.pageViews.map((pv) => ({
      type: "PAGE_VIEW" as const,
      title: pv.title || pv.path,
      description: pv.path,
      createdAt: pv.createdAt,
      metadata: { path: pv.path, sessionId: s.sessionId } as Prisma.JsonValue,
    }))
  );
  const activityEvents = contact.activities.map((a) => ({
    type: a.type,
    title: a.title,
    description: a.description,
    createdAt: a.createdAt,
    metadata: a.metadata,
  }));
  const timeline = [...activityEvents, ...pageViewEvents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ ...contact, timeline });
});

const updateContactSchema = z.object({
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  status: z.enum(["LEAD", "OPPORTUNITY", "CUSTOMER", "ARCHIVED"]).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).nullable().optional(),
  assignedUserId: z.string().nullable().optional(),
});

adminContactsRouter.patch("/:id", async (req, res) => {
  const parsed = updateContactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const existing = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Contact not found" });

  const contact = await prisma.contact.update({
    where: { id: req.params.id },
    data: parsed.data as Prisma.ContactUpdateInput,
  });

  if (parsed.data.status && parsed.data.status !== existing.status) {
    await prisma.contactActivity.create({
      data: { contactId: contact.id, type: "STAGE_CHANGED", title: `Status changed from ${existing.status} to ${contact.status}` },
    });
  }

  if (parsed.data.tags) {
    const newlyAdded = parsed.data.tags.filter((tag) => !existing.tags.includes(tag));
    for (const tag of newlyAdded) dispatchTrigger("TAG_ADDED", { contactId: contact.id, tag });
  }

  res.json(contact);
});

adminContactsRouter.delete("/:id", async (req, res) => {
  await prisma.contact.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

const bulkDeleteSchema = z.object({ ids: z.array(z.string()).min(1) });

// Safe against FK constraints: every relation pointing at Contact is either
// onDelete: Cascade (ContactActivity, ContactNote — genuinely belong to the
// contact) or onDelete: SetNull (ContactInquiry/FormSubmission/VisitorSession/
// Deal.contactId — raw events that should survive contact deletion), both
// enforced at the database level, so deleteMany needs no manual cleanup pass.
adminContactsRouter.post("/bulk-delete", async (req, res) => {
  const parsed = bulkDeleteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const result = await prisma.contact.deleteMany({ where: { id: { in: parsed.data.ids } } });
  res.json({ deleted: result.count });
});

const noteSchema = z.object({ content: z.string().min(1) });

adminContactsRouter.post("/:id/notes", async (req: AuthedRequest, res) => {
  const parsed = noteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const contact = await prisma.contact.findUnique({ where: { id: req.params.id } });
  if (!contact) return res.status(404).json({ error: "Contact not found" });

  const note = await prisma.contactNote.create({
    data: { contactId: contact.id, content: parsed.data.content, authorId: req.user?.id },
  });
  await prisma.contactActivity.create({
    data: { contactId: contact.id, type: "NOTE_ADDED", title: "Note added", description: parsed.data.content.slice(0, 200) },
  });

  res.status(201).json(note);
});
