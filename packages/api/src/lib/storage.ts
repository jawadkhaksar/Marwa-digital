import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { put, del } from "@vercel/blob";

// ── File Storage ──────────────────────────────────────────────────────────
// Same "env-first, gracefully-degrade" philosophy as mailer.ts/aiProvider.ts:
// when BLOB_READ_WRITE_TOKEN is set (Vercel deployments, where every request
// gets a fresh, empty filesystem — nothing written locally would survive
// past the request that wrote it), files go to Vercel Blob and every caller
// gets back a real public https:// URL. Locally, and on any traditional
// always-on host (Railway/Render/a VPS), it falls back to writing under
// process.cwd()/uploads, served by server.ts's express.static — exactly the
// pre-Blob behavior, unchanged.

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function ensureLocalDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** Stores a file and returns its public URL. */
export async function storeFile(filename: string, contents: Buffer, contentType: string): Promise<string> {
  if (isBlobConfigured()) {
    const blob = await put(filename, contents, { access: "public", contentType, addRandomSuffix: false });
    return blob.url;
  }
  ensureLocalDir();
  await fsp.writeFile(path.join(UPLOAD_DIR, filename), contents);
  return `/uploads/${filename}`;
}

/** Reads a previously-stored file's bytes back, whether `url` is a Blob URL or a local /uploads/** path. */
export async function readStoredFile(url: string): Promise<Buffer> {
  if (url.startsWith("http")) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch stored file (${res.status}): ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fsp.readFile(path.join(UPLOAD_DIR, path.basename(url)));
}

/** Deletes a previously-stored file — best-effort, mirrors the old fs.unlink(..., () => {}) callers (a delete that can't find its file shouldn't fail the request). */
export async function deleteStoredFile(url: string): Promise<void> {
  try {
    if (url.startsWith("http")) {
      await del(url);
    } else {
      await fsp.unlink(path.join(UPLOAD_DIR, path.basename(url)));
    }
  } catch {
    /* best-effort */
  }
}

/** The local uploads directory — still needed by server.ts's express.static (local/always-on hosting) and backupService.ts's local-mode zip. */
export function localUploadsDir(): string {
  return UPLOAD_DIR;
}
