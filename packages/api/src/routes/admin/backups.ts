import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";
import { generateBackup, restoreBackup, backupFileExists, readBackupFile, deleteBackupFile } from "../../services/backupService";
import type { TenantRequest } from "../../middleware/tenant";

export const adminBackupsRouter = Router();

// GET / — paginated list for the Backups & Disaster Recovery screen's table
// + header metrics (total count, last backup date, storage used).
adminBackupsRouter.get("/", async (req: TenantRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const [items, total, aggregate] = await Promise.all([
    prisma.systemBackup.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.systemBackup.count(),
    prisma.systemBackup.aggregate({ _sum: { fileSize: true }, _max: { createdAt: true } }),
  ]);

  res.json({
    items,
    total,
    page,
    limit,
    totalStorageBytes: aggregate._sum.fileSize ?? 0,
    lastBackupAt: aggregate._max.createdAt,
  });
});

const generateSchema = z.object({ type: z.enum(["FULL", "DATABASE_ONLY", "UPLOADS_ONLY"]).default("FULL") });

// POST /generate — synchronous: a CMS-sized JSON dump + /uploads zip
// finishes in well under a request timeout, so there's no need for a
// PENDING-row-plus-poller pattern here (unlike the workflow/publish
// schedulers, which wait on real wall-clock time).
adminBackupsRouter.post("/generate", async (req: TenantRequest, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  try {
    const result = await generateBackup(parsed.data.type, req.organizationId);
    const backup = await prisma.systemBackup.create({
      data: {
        organizationId: req.organizationId,
        filename: result.filename,
        fileSize: result.fileSize,
        type: parsed.data.type,
        storagePath: result.storagePath,
        status: "COMPLETED",
      },
    });
    res.status(201).json(backup);
  } catch (err) {
    await prisma.systemBackup.create({
      data: {
        organizationId: req.organizationId,
        filename: "failed",
        fileSize: 0,
        type: parsed.data.type,
        storagePath: "",
        status: "FAILED",
      },
    });
    throw err;
  }
});

adminBackupsRouter.get("/:id/download", async (req, res) => {
  const backup = await prisma.systemBackup.findUnique({ where: { id: req.params.id } });
  if (!backup) return res.status(404).json({ error: "Backup not found" });
  if (!backupFileExists(backup.storagePath)) return res.status(410).json({ error: "Backup file no longer exists" });

  // Proxied through the API (rather than a redirect straight to the Blob
  // URL) so the browser sees this admin-only download with the backup's
  // real filename regardless of where it's actually stored.
  const bytes = await readBackupFile(backup.storagePath);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${backup.filename}"`);
  res.send(bytes);
});

adminBackupsRouter.post("/:id/restore", async (req, res) => {
  const backup = await prisma.systemBackup.findUnique({ where: { id: req.params.id } });
  if (!backup) return res.status(404).json({ error: "Backup not found" });
  if (!backupFileExists(backup.storagePath)) return res.status(410).json({ error: "Backup file no longer exists" });

  await restoreBackup(backup.storagePath);
  res.json({ ok: true, restoredFrom: backup.filename });
});

adminBackupsRouter.delete("/:id", async (req, res) => {
  const backup = await prisma.systemBackup.findUnique({ where: { id: req.params.id } });
  if (!backup) return res.status(404).json({ error: "Backup not found" });

  await deleteBackupFile(backup.storagePath);
  await prisma.systemBackup.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
