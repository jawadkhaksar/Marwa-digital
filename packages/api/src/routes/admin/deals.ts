import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";
import { dispatchTrigger } from "../../services/workflowEngine";
import { dealStatusForStageType } from "../../lib/crm";

export const adminDealsRouter = Router();

const createDealSchema = z.object({
  title: z.string().min(1),
  value: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  stageId: z.string().min(1),
  contactId: z.string().optional().nullable(),
});

adminDealsRouter.post("/", async (req, res) => {
  const parsed = createDealSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { title, value, currency, stageId, contactId } = parsed.data;

  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
  if (!stage) return res.status(404).json({ error: "Pipeline stage not found" });

  const maxOrder = await prisma.deal.aggregate({ where: { stageId }, _max: { order: true } });
  const deal = await prisma.deal.create({
    data: {
      title,
      value: value ?? 0,
      currency: currency ?? "USD",
      stageId,
      contactId: contactId ?? undefined,
      order: (maxOrder._max.order ?? -1) + 1,
      // Automated Deal Stage Trigger — a deal created directly into a
      // WON/LOST stage reflects that status immediately rather than sitting
      // OPEN until its next move. See lib/crm.ts's dealStatusForStageType.
      status: dealStatusForStageType(stage.stageType),
    },
    include: { contact: true, stage: true },
  });

  if (contactId) {
    await prisma.contactActivity.create({
      data: {
        contactId,
        type: "DEAL_CREATED",
        title: `Deal "${title}" created in stage "${stage.name}"`,
        metadata: { dealId: deal.id, stageId, stageName: stage.name, value: deal.value, currency: deal.currency },
      },
    });
  }

  res.status(201).json(deal);
});

const updateDealSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  contactId: z.string().nullable().optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  stageId: z.string().min(1).optional(),
});

/**
 * Direct (non-drag) deal edits. When `stageId` is included and actually
 * changes, this runs the same Automated Deal Stage Trigger as
 * PATCH /:id/reorder below — the target stage's `stageType` overrides any
 * `status` passed in the same request, a fresh `order` is assigned at the
 * end of the destination stage, and a ContactActivity is logged — so a
 * "Move to stage" control reachable without a drag gesture can't drift out
 * of sync with the Kanban board's own drag-and-drop behavior.
 */
adminDealsRouter.patch("/:id", async (req, res) => {
  const parsed = updateDealSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { stageId: newStageId, ...rest } = parsed.data;

  const existing = await prisma.deal.findUnique({ where: { id: req.params.id }, include: { stage: true } });
  if (!existing) return res.status(404).json({ error: "Deal not found" });

  const movingStages = Boolean(newStageId && newStageId !== existing.stageId);
  let targetStage = existing.stage;

  const data: Record<string, unknown> = { ...rest, contactId: rest.contactId ?? undefined };

  if (movingStages && newStageId) {
    const stage = await prisma.pipelineStage.findUnique({ where: { id: newStageId } });
    if (!stage) return res.status(404).json({ error: "Target pipeline stage not found" });
    targetStage = stage;

    const maxOrder = await prisma.deal.aggregate({ where: { stageId: newStageId }, _max: { order: true } });
    data.stageId = newStageId;
    data.order = (maxOrder._max.order ?? -1) + 1;
    data.status = dealStatusForStageType(stage.stageType);
  }

  const deal = await prisma.deal.update({ where: { id: req.params.id }, data, include: { contact: true, stage: true } });

  if (movingStages && existing.contactId) {
    await prisma.contactActivity.create({
      data: {
        contactId: existing.contactId,
        type: "STAGE_CHANGED",
        title: `Deal "${deal.title}" moved from "${existing.stage.name}" to "${targetStage.name}"`,
        metadata: { dealId: deal.id, fromStageId: existing.stageId, toStageId: targetStage.id },
      },
    });
    dispatchTrigger("DEAL_STAGE_CHANGED", { contactId: existing.contactId, dealId: deal.id, toStageType: targetStage.stageType });
  }

  res.json(deal);
});

const reorderSchema = z.object({
  stageId: z.string().min(1),
  order: z.number().int().nonnegative(),
});

/**
 * Drag-and-drop endpoint: moves a deal to `order` within `stageId`, whether
 * that's the deal's current stage (a plain within-column reorder) or a
 * different one (a cross-column move). Every other deal sharing the
 * affected stage(s) has its own `order` shifted in the same transaction so
 * the whole board stays a dense, gap-free 0..n-1 sequence per stage —
 * exactly what the Kanban UI needs to just render `orderBy: order asc`.
 *
 * Automated Deal Stage Trigger: the destination stage's `stageType` always
 * decides the deal's `status` here (WON/LOST stage → matching status,
 * DEFAULT stage → OPEN) — see lib/crm.ts's dealStatusForStageType. This
 * recomputes on every reorder, including a same-stage move, which is a
 * harmless no-op there since the status can't have changed.
 */
adminDealsRouter.patch("/:id/reorder", async (req, res) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { stageId: newStageId, order: newOrder } = parsed.data;

  const deal = await prisma.deal.findUnique({ where: { id: req.params.id }, include: { stage: true } });
  if (!deal) return res.status(404).json({ error: "Deal not found" });

  const newStage = deal.stageId === newStageId ? deal.stage : await prisma.pipelineStage.findUnique({ where: { id: newStageId } });
  if (!newStage) return res.status(404).json({ error: "Target pipeline stage not found" });

  const oldStageId = deal.stageId;
  const oldOrder = deal.order;
  const movingStages = oldStageId !== newStageId;
  const newStatus = dealStatusForStageType(newStage.stageType);

  await prisma.$transaction(async (tx) => {
    if (movingStages) {
      await tx.deal.updateMany({ where: { stageId: oldStageId, order: { gt: oldOrder } }, data: { order: { decrement: 1 } } });
      await tx.deal.updateMany({ where: { stageId: newStageId, order: { gte: newOrder } }, data: { order: { increment: 1 } } });
    } else if (newOrder > oldOrder) {
      await tx.deal.updateMany({ where: { stageId: oldStageId, order: { gt: oldOrder, lte: newOrder } }, data: { order: { decrement: 1 } } });
    } else if (newOrder < oldOrder) {
      await tx.deal.updateMany({ where: { stageId: oldStageId, order: { gte: newOrder, lt: oldOrder } }, data: { order: { increment: 1 } } });
    }

    await tx.deal.update({ where: { id: deal.id }, data: { stageId: newStageId, order: newOrder, status: newStatus } });
  });

  if (movingStages && deal.contactId) {
    await prisma.contactActivity.create({
      data: {
        contactId: deal.contactId,
        type: "STAGE_CHANGED",
        title: `Deal "${deal.title}" moved from "${deal.stage.name}" to "${newStage.name}"`,
        metadata: { dealId: deal.id, fromStageId: oldStageId, toStageId: newStageId },
      },
    });
    dispatchTrigger("DEAL_STAGE_CHANGED", { contactId: deal.contactId, dealId: deal.id, toStageType: newStage.stageType });
  }

  const updated = await prisma.deal.findUnique({ where: { id: deal.id }, include: { contact: true, stage: true } });
  res.json(updated);
});

adminDealsRouter.delete("/:id", async (req, res) => {
  await prisma.deal.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
