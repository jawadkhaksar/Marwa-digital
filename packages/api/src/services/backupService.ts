import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { prisma, type Prisma } from "@marwa/db";
import { isBlobConfigured, storeFile, readStoredFile, deleteStoredFile, localUploadsDir } from "../lib/storage";
import { mimeTypeForExtension } from "../lib/mediaConversion";

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
//
// The generated zip archive ITSELF also has to go through storage.ts's
// Blob-or-local abstraction, same as any other uploaded file — on Vercel,
// a zip written to a local "backups/" folder would vanish the moment this
// request ends, same reason media uploads moved to Blob.

const BACKUP_DIR = path.join(process.cwd(), "backups");
const UPLOADS_DIR = localUploadsDir();

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

/**
 * Bundles every MediaAsset's actual bytes into `uploads/<filename>` in the
 * zip. In Blob mode there's no local folder to just copy — MediaAsset rows
 * are the authoritative list of what's stored, so each one is fetched back
 * from its Blob URL individually (best-effort per file: one unreachable
 * asset shouldn't abort the whole backup).
 */
async function bundleUploads(zip: AdmZip): Promise<void> {
  if (isBlobConfigured()) {
    const assets = await prisma.mediaAsset.findMany({ select: { url: true } });
    for (const { url } of assets) {
      if (!url.startsWith("http")) continue;
      try {
        const bytes = await readStoredFile(url);
        zip.addFile(`uploads/${path.basename(new URL(url).pathname)}`, bytes);
      } catch {
        /* best-effort — a single missing/unreachable blob shouldn't abort the backup */
      }
    }
    return;
  }
  if (fs.existsSync(UPLOADS_DIR)) zip.addLocalFolder(UPLOADS_DIR, "uploads");
}

/**
 * Replays `uploads/*` zip entries back into storage — Blob (re-uploaded
 * under the exact same filename, so URLs referenced elsewhere in the
 * restored data.json/Page.layout/Post.content keep resolving correctly,
 * since storeFile() with a fixed filename is deterministic) or local disk.
 */
async function restoreUploads(zip: AdmZip): Promise<void> {
  const uploadEntries = zip.getEntries().filter((e) => e.entryName.startsWith("uploads/") && !e.isDirectory);
  for (const entry of uploadEntries) {
    const filename = entry.entryName.replace(/^uploads\//, "");
    const ext = path.extname(filename).slice(1);
    await storeFile(filename, entry.getData(), mimeTypeForExtension(ext));
  }
}

export interface BackupResult {
  filename: string;
  storagePath: string;
  fileSize: number;
}

export async function generateBackup(type: "FULL" | "DATABASE_ONLY" | "UPLOADS_ONLY", organizationId?: string): Promise<BackupResult> {
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

  if (type !== "DATABASE_ONLY") await bundleUploads(zip);

  const filename = `backup-${type.toLowerCase()}-${Date.now()}.zip`;
  const zipBuffer = zip.toBuffer();

  if (isBlobConfigured()) {
    const storagePath = await storeFile(filename, zipBuffer, "application/zip");
    return { filename, storagePath, fileSize: zipBuffer.length };
  }

  ensureBackupDir();
  const storagePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(storagePath, zipBuffer);
  return { filename, storagePath, fileSize: zipBuffer.length };
}

/** Reads a backup archive's bytes back, whether `storagePath` is a Blob URL or a local path. */
export async function readBackupFile(storagePath: string): Promise<Buffer> {
  return readStoredFile(storagePath);
}

/** True if the backup file still exists — a local path is checked on disk; a Blob URL is assumed to exist (its own fetch will surface a real error if not). */
export function backupFileExists(storagePath: string): boolean {
  return storagePath.startsWith("http") ? true : fs.existsSync(storagePath);
}

export async function deleteBackupFile(storagePath: string): Promise<void> {
  if (storagePath.startsWith("http")) {
    await deleteStoredFile(storagePath);
  } else if (fs.existsSync(storagePath)) {
    fs.unlinkSync(storagePath);
  }
}

export async function restoreBackup(storagePath: string): Promise<void> {
  const zipBuffer = await readStoredFile(storagePath);
  const zip = new AdmZip(zipBuffer);

  const dataEntry = zip.getEntry("data.json");
  if (dataEntry) {
    const parsed = JSON.parse(zip.readAsText(dataEntry)) as { models: Record<string, Record<string, unknown>[]> };
    await restoreModels(parsed.models);
  }

  await restoreUploads(zip);
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
