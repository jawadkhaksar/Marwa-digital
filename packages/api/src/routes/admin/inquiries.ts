import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

export const adminInquiriesRouter = Router();

adminInquiriesRouter.get("/", async (_req, res) => {
  const inquiries = await prisma.contactInquiry.findMany({ orderBy: { createdAt: "desc" } });
  res.json(inquiries);
});

const statusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CLOSED"]),
});

adminInquiriesRouter.patch("/:id", async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const inquiry = await prisma.contactInquiry.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(inquiry);
});

const bulkDeleteSchema = z.object({ ids: z.array(z.string()).min(1) });

// Nothing has a foreign key pointing INTO ContactInquiry (it only points
// outward, at VisitorSession/Contact) — deleteMany can't hit a constraint here.
adminInquiriesRouter.post("/bulk-delete", async (req, res) => {
  const parsed = bulkDeleteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const result = await prisma.contactInquiry.deleteMany({ where: { id: { in: parsed.data.ids } } });
  res.json({ deleted: result.count });
});

adminInquiriesRouter.delete("/:id", async (req, res) => {
  await prisma.contactInquiry.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
