import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";

export const adminFormSubmissionsRouter = Router();

// No pagination — matches every other admin list endpoint in this app
// (bookings, inquiries, customers all return full arrays); filtering/search
// happens client-side against the fetched list.
adminFormSubmissionsRouter.get("/", async (_req, res) => {
  const submissions = await prisma.formSubmission.findMany({ orderBy: { createdAt: "desc" } });
  res.json(submissions);
});

adminFormSubmissionsRouter.get("/:id", async (req, res) => {
  const submission = await prisma.formSubmission.findUnique({ where: { id: req.params.id } });
  if (!submission) return res.status(404).json({ error: "Submission not found" });
  res.json(submission);
});

const patchSchema = z.object({ read: z.boolean() });

adminFormSubmissionsRouter.patch("/:id", async (req, res) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const submission = await prisma.formSubmission.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(submission);
});

adminFormSubmissionsRouter.delete("/:id", async (req, res) => {
  await prisma.formSubmission.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
