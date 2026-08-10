import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";
import type { TenantRequest } from "../../middleware/tenant";

export const adminPipelinesRouter = Router();

const DEFAULT_STAGES = [
  { name: "New Lead", color: "#94a3b8", stageType: "DEFAULT" },
  { name: "Contacted", color: "#60a5fa", stageType: "DEFAULT" },
  { name: "Proposal Sent", color: "#fbbf24", stageType: "DEFAULT" },
  { name: "Closed Won", color: "#34d399", stageType: "WON" },
  { name: "Closed Lost", color: "#f87171", stageType: "LOST" },
];

/** First-run convenience: the Kanban board has nothing to show against an empty workspace, so a default GHL-style pipeline is seeded once per workspace, the moment anyone first asks for that workspace's pipeline list. */
async function ensureDefaultPipeline(organizationId: string | undefined) {
  const count = await prisma.pipeline.count({ where: { organizationId: organizationId ?? null } });
  if (count > 0) return;
  await prisma.pipeline.create({
    data: {
      name: "Sales Pipeline",
      isDefault: true,
      organizationId,
      stages: { create: DEFAULT_STAGES.map((s, order) => ({ ...s, order })) },
    },
  });
}

// GET / — every pipeline with nested ordered stages and each stage's ordered
// deals (with a contact summary), which is everything the Kanban board needs
// in a single round trip. See adminPagesRouter's GET / for the
// no-header/global-view rule.
adminPipelinesRouter.get("/", async (req: TenantRequest, res) => {
  await ensureDefaultPipeline(req.organizationId);
  const pipelines = await prisma.pipeline.findMany({
    where: req.organizationId ? { organizationId: req.organizationId } : {},
    orderBy: { createdAt: "asc" },
    include: {
      stages: {
        orderBy: { order: "asc" },
        include: {
          deals: {
            orderBy: { order: "asc" },
            include: { contact: { select: { id: true, firstName: true, lastName: true, email: true, company: true } } },
          },
        },
      },
    },
  });
  res.json(pipelines);
});

const STAGE_TYPES = ["DEFAULT", "WON", "LOST"] as const;

const stageInputSchema = z.object({
  name: z.string().min(1),
  color: z.string().optional(),
  stageType: z.enum(STAGE_TYPES).optional(),
});

const createPipelineSchema = z.object({
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
  stages: z.array(stageInputSchema).optional(),
});

adminPipelinesRouter.post("/", async (req: TenantRequest, res) => {
  const parsed = createPipelineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { name, isDefault, stages } = parsed.data;
  const stageData = (stages && stages.length > 0 ? stages : DEFAULT_STAGES).map((s, order) => ({ ...s, order }));

  const pipeline = await prisma.pipeline.create({
    data: { name, isDefault: isDefault ?? false, organizationId: req.organizationId, stages: { create: stageData } },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  res.status(201).json(pipeline);
});

const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
  isDefault: z.boolean().optional(),
});

adminPipelinesRouter.patch("/:id", async (req, res) => {
  const parsed = updatePipelineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const pipeline = await prisma.pipeline.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(pipeline);
});

adminPipelinesRouter.delete("/:id", async (req, res) => {
  await prisma.pipeline.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

adminPipelinesRouter.post("/:id/stages", async (req, res) => {
  const parsed = stageInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const maxOrder = await prisma.pipelineStage.aggregate({ where: { pipelineId: req.params.id }, _max: { order: true } });
  const stage = await prisma.pipelineStage.create({
    data: {
      pipelineId: req.params.id,
      name: parsed.data.name,
      color: parsed.data.color,
      stageType: parsed.data.stageType ?? "DEFAULT",
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  res.status(201).json(stage);
});

const updateStageSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().nullable().optional(),
  order: z.number().int().nonnegative().optional(),
  stageType: z.enum(STAGE_TYPES).optional(),
});

adminPipelinesRouter.patch("/stages/:id", async (req, res) => {
  const parsed = updateStageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const stage = await prisma.pipelineStage.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(stage);
});

adminPipelinesRouter.delete("/stages/:id", async (req, res) => {
  await prisma.pipelineStage.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
