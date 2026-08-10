import { Router } from "express";
import { z } from "zod";
import { prisma, Prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";
import type { TenantRequest } from "../../middleware/tenant";

export const adminWorkflowsRouter = Router();

const TRIGGER_TYPES = ["FORM_SUBMITTED", "TAG_ADDED", "DEAL_STAGE_CHANGED", "SESSION_RAGE_CLICK"] as const;

// See adminPagesRouter's GET / for the no-header/global-view rule.
adminWorkflowsRouter.get("/", async (req: TenantRequest, res) => {
  const workflows = await prisma.automationWorkflow.findMany({
    where: req.organizationId ? { organizationId: req.organizationId } : {},
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { logs: true } } },
  });
  res.json(workflows);
});

adminWorkflowsRouter.get("/:id", async (req, res) => {
  const workflow = await prisma.automationWorkflow.findUnique({ where: { id: req.params.id } });
  if (!workflow) return res.status(404).json({ error: "Workflow not found" });
  res.json(workflow);
});

const nodeSchema = z.object({ id: z.string(), type: z.string(), data: z.record(z.string(), z.unknown()).default({}) }).passthrough();
const edgeSchema = z.object({ id: z.string(), source: z.string(), target: z.string(), sourceHandle: z.string().nullable().optional() }).passthrough();

const workflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(false),
  triggerType: z.enum(TRIGGER_TYPES),
  triggerData: z.record(z.string(), z.unknown()).nullable().optional(),
  nodes: z.array(nodeSchema).default([]),
  edges: z.array(edgeSchema).default([]),
});

adminWorkflowsRouter.post("/", async (req: TenantRequest, res) => {
  const parsed = workflowSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { triggerData, nodes, edges, ...rest } = parsed.data;

  const workflow = await prisma.automationWorkflow.create({
    data: {
      ...rest,
      organizationId: req.organizationId,
      triggerData: (triggerData ?? undefined) as Prisma.InputJsonValue | undefined,
      nodes: nodes as Prisma.InputJsonValue,
      edges: edges as Prisma.InputJsonValue,
    },
  });
  res.status(201).json(workflow);
});

adminWorkflowsRouter.patch("/:id", async (req, res) => {
  const parsed = workflowSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { triggerData, nodes, edges, ...rest } = parsed.data;

  const workflow = await prisma.automationWorkflow.update({
    where: { id: req.params.id },
    data: {
      ...rest,
      ...(triggerData !== undefined ? { triggerData: (triggerData ?? Prisma.JsonNull) as Prisma.InputJsonValue } : {}),
      ...(nodes !== undefined ? { nodes: nodes as Prisma.InputJsonValue } : {}),
      ...(edges !== undefined ? { edges: edges as Prisma.InputJsonValue } : {}),
    },
  });
  res.json(workflow);
});

adminWorkflowsRouter.delete("/:id", async (req, res) => {
  await prisma.automationWorkflow.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// Execution history for a single workflow — what the editor's "Logs" panel reads.
adminWorkflowsRouter.get("/:id/logs", async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

  const where: Prisma.WorkflowExecutionLogWhereInput = { workflowId: req.params.id };
  const [items, total] = await Promise.all([
    prisma.workflowExecutionLog.findMany({ where, orderBy: { executedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.workflowExecutionLog.count({ where }),
  ]);
  res.json({ items, total, page, limit });
});
