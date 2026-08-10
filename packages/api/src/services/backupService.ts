import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { prisma, type Prisma } from "@marwa/db";

// ── Backup & Disaster Recovery ──────────────────────────────────────────
// No `pg_dump` binary is assumed to be installed/on PATH wherever this API
// runs (it isn't on this project's own Windows dev box) — a Prisma-driven
// JSON export of the actual content/configuration models is used instead of
// shelling out to Postgres client tools, keeping backup/restore portable to
// any environment that can already run this API. High-volume, purely
// derived/log data (analytics events, audit logs, heatmap clicks, workflow
// execution logs, revisions, password reset tokens) is deliberately left
// out of the dump — a disaster-recovery restore needs the site's actual
// content and configuration back, not its historical traffic log.
//
// DUMP_MODELS lists every backed-up table in FK-safe dependency order
// (parents before children) — restoreBackup replays creates in this same
// order, and deletes in the reverse of it.

const BACKUP_DIR = path.join(process.cwd(), "backups");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

type ModelName =
  | "organization"
  | "orgMembership"
  | "user"
  | "siteSettings"
  | "category"
  | "tag"
  | "menu"
  | "menuItem"
  | "footerLink"
  | "faq"
  | "review"
  | "mediaAsset"
  | "collection"
  | "collectionField"
  | "collectionItem"
  | "siteTemplate"
  | "styleClass"
  | "timedAnimation"
  | "emailTemplate"
  | "automationEmailTemplate"
  | "page"
  | "post"
  | "pipeline"
  | "pipelineStage"
  | "contact"
  | "deal"
  | "contactActivity"
  | "contactNote"
  | "automationWorkflow";

const DUMP_MODELS: ModelName[] = [
  "organization",
  "orgMembership",
  "user",
  "siteSettings",
  "category",
  "tag",
  "menu",
  "menuItem",
  "footerLink",
  "faq",
  "review",
  "mediaAsset",
  "collection",
  "collectionField",
  "collectionItem",
  "siteTemplate",
  "styleClass",
  "timedAnimation",
  "emailTemplate",
  "automationEmailTemplate",
  "page",
  "post",
  "pipeline",
  "pipelineStage",
  "contact",
  "deal",
  "contactActivity",
  "contactNote",
  "automationWorkflow",
];

// Post has two implicit many-to-many relations (categories/tags) that
// findMany() doesn't return without an explicit include — captured here as
// plain id arrays alongside the row, and reconnected the same way on restore.
async function dumpPosts(organizationId?: string) {
  const posts = await prisma.post.findMany({
    where: organizationId ? { organizationId } : {},
    include: { categories: { select: { id: true } }, tags: { select: { id: true } } },
  });
  return posts.map((p) => ({ ...p, categoryIds: p.categories.map((c) => c.id), tagIds: p.tags.map((t) => t.id), categories: undefined, tags: undefined }));
}

export interface BackupResult {
  filename: string;
  storagePath: string;
  fileSize: number;
}

export async function generateBackup(type: "FULL" | "DATABASE_ONLY" | "UPLOADS_ONLY", organizationId?: string): Promise<BackupResult> {
  ensureBackupDir();
  const zip = new AdmZip();

  if (type !== "UPLOADS_ONLY") {
    const dump: Record<string, unknown[]> = {};
    for (const name of DUMP_MODELS) {
      if (name === "post") {
        dump.post = await dumpPosts(organizationId);
        continue;
      }
      // Scope tenant-aware models to the requesting workspace when one is
      // active; everything else (site-wide config, users, menus, etc.) has
      // no organizationId column and is always included in full.
      const scopable = new Set(["page", "pipeline", "contact", "automationWorkflow"]);
      const where = organizationId && scopable.has(name) ? { organizationId } : undefined;
       
      const rows = await (prisma[name as keyof typeof prisma] as any).findMany({ where });
      dump[name] = rows;
    }
    zip.addFile("data.json", Buffer.from(JSON.stringify({ createdAt: new Date().toISOString(), models: dump }, null, 2)));
  }

  if (type !== "DATABASE_ONLY" && fs.existsSync(UPLOADS_DIR)) {
    zip.addLocalFolder(UPLOADS_DIR, "uploads");
  }

  const filename = `backup-${type.toLowerCase()}-${Date.now()}.zip`;
  const storagePath = path.join(BACKUP_DIR, filename);
  zip.writeZip(storagePath);
  const fileSize = fs.statSync(storagePath).size;

  return { filename, storagePath, fileSize };
}

export function backupFilePath(storagePath: string): string {
  return storagePath;
}

export async function restoreBackup(storagePath: string): Promise<void> {
  if (!fs.existsSync(storagePath)) throw new Error("Backup file is missing from disk");
  const zip = new AdmZip(storagePath);

  const dataEntry = zip.getEntry("data.json");
  if (dataEntry) {
    const parsed = JSON.parse(zip.readAsText(dataEntry)) as { models: Record<string, Record<string, unknown>[]> };
    await restoreModels(parsed.models);
  }

  const uploadEntries = zip.getEntries().filter((e) => e.entryName.startsWith("uploads/") && !e.isDirectory);
  if (uploadEntries.length > 0) {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    for (const entry of uploadEntries) {
      const target = path.join(UPLOADS_DIR, entry.entryName.replace(/^uploads\//, ""));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, entry.getData());
    }
  }
}

async function restoreModels(models: Record<string, Record<string, unknown>[]>): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      // Delete in reverse dependency order so no FK constraint is ever violated.
      for (const name of [...DUMP_MODELS].reverse()) {
         
        await (tx[name as keyof typeof tx] as any).deleteMany({});
      }

      for (const name of DUMP_MODELS) {
        const rows = models[name] ?? [];
        if (rows.length === 0) continue;

        if (name === "post") {
          for (const row of rows) {
            const { categoryIds, tagIds, categories: _c, tags: _t, ...data } = row as Record<string, unknown> & { categoryIds?: string[]; tagIds?: string[] };
            await tx.post.create({
              data: {
                ...(data as Prisma.PostCreateInput),
                categories: { connect: (categoryIds ?? []).map((id) => ({ id })) },
                tags: { connect: (tagIds ?? []).map((id) => ({ id })) },
              },
            });
          }
          continue;
        }

        if (name === "menuItem") {
          // Two-pass insert: MenuItem.parentId is a self-relation, so every
          // row must exist before any parentId can point at it.
          for (const row of rows) {
            const { parentId: _p, ...data } = row as Record<string, unknown>;
             
            await (tx.menuItem as any).create({ data });
          }
          for (const row of rows) {
            const r = row as Record<string, unknown>;
            if (r.parentId) {
               
              await (tx.menuItem as any).update({ where: { id: r.id }, data: { parentId: r.parentId } });
            }
          }
          continue;
        }

         
        const model = tx[name as keyof typeof tx] as any;
        for (const row of rows) {
          await model.create({ data: row });
        }
      }
    },
    { timeout: 120_000 }
  );
}
