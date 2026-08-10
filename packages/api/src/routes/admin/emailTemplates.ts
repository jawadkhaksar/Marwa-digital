import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { EMAIL_TEMPLATE_DEFS, KNOWN_EMAIL_TEMPLATE_KEYS, getEmailTemplateDef } from "../../lib/emailTemplates";
import { formatZodError } from "../../lib/zodError";

export const adminEmailTemplatesRouter = Router();

// List: every known trigger (Booking Confirmation, Driver Assigned x2, Review
// Request) always appears, customized or not, plus any custom/draft
// templates an admin has created for a future trigger.
adminEmailTemplatesRouter.get("/", async (_req, res) => {
  const rows = await prisma.emailTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  const rowByKey = new Map(rows.map((r) => [r.key, r]));

  const known = EMAIL_TEMPLATE_DEFS.map((def) => {
    const row = rowByKey.get(def.key);
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      isCustom: false,
      isOverridden: Boolean(row),
      active: row?.active ?? true,
      updatedAt: row?.updatedAt ?? null,
      isShell: Boolean(def.noSubject),
    };
  });

  const custom = rows
    .filter((r) => !KNOWN_EMAIL_TEMPLATE_KEYS.includes(r.key))
    .map((r) => ({
      key: r.key,
      name: r.name,
      description: "Custom — not yet linked to an automatic trigger. A developer needs to wire this key into a send function before it goes out to anyone.",
      isCustom: true,
      isOverridden: true,
      active: r.active,
      updatedAt: r.updatedAt,
      isShell: false,
    }));

  res.json([...known, ...custom]);
});

adminEmailTemplatesRouter.get("/:key", async (req, res) => {
  const { key } = req.params;
  const row = await prisma.emailTemplate.findUnique({ where: { key } });
  const def = getEmailTemplateDef(key);

  if (!row && !def) return res.status(404).json({ error: "Template not found" });

  res.json({
    key,
    name: row?.name ?? def?.name ?? key,
    description: def?.description ?? "Custom — not yet linked to an automatic trigger.",
    isCustom: !def,
    isShell: Boolean(def?.noSubject),
    variables: def?.variables ?? [],
    subject: row?.subject ?? def?.defaultSubject ?? "",
    bodyHtml: row?.bodyHtml ?? def?.defaultBody ?? "",
    active: row?.active ?? true,
    hasDefault: Boolean(def),
    updatedAt: row?.updatedAt ?? null,
  });
});

const upsertSchema = z.object({
  name: z.string().min(1).optional(), // required only when creating a new custom key — see handler
  // Empty only for EMAIL_SHELL, which has no subject of its own.
  subject: z.string(),
  bodyHtml: z.string().min(1),
  active: z.boolean().default(true),
});

adminEmailTemplatesRouter.put("/:key", async (req, res) => {
  const { key } = req.params;
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const def = getEmailTemplateDef(key);
  const existing = await prisma.emailTemplate.findUnique({ where: { key } });
  const name = parsed.data.name || def?.name || existing?.name;
  if (!name) return res.status(400).json({ error: "name is required when creating a new custom template" });

  const template = await prisma.emailTemplate.upsert({
    where: { key },
    update: { subject: parsed.data.subject, bodyHtml: parsed.data.bodyHtml, active: parsed.data.active, name },
    create: { key, name, subject: parsed.data.subject, bodyHtml: parsed.data.bodyHtml, active: parsed.data.active },
  });
  res.json(template);
});

// Deletes the DB override so a known template reverts to its hardcoded
// default — the def itself is the fallback, so there's nothing else to reset "to".
adminEmailTemplatesRouter.post("/:key/reset", async (req, res) => {
  const { key } = req.params;
  if (!getEmailTemplateDef(key)) return res.status(400).json({ error: "Only a known built-in template can be reset — a custom template has no default to revert to; delete it instead." });

  await prisma.emailTemplate.deleteMany({ where: { key } });
  res.status(204).send();
});

// Deleting a KNOWN key's row is equivalent to /reset (falls back to its
// default); deleting a custom key's row removes it entirely.
adminEmailTemplatesRouter.delete("/:key", async (req, res) => {
  await prisma.emailTemplate.deleteMany({ where: { key: req.params.key } });
  res.status(204).send();
});
