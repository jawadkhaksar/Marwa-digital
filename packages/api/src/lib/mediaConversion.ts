import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { prisma, type MediaAsset } from "@marwa/db";
import { storeFile, readStoredFile, deleteStoredFile } from "./storage";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

// Left alone by "Convert to WebP": webp is already the target format, svg is
// vector (a raster re-encode would only make it worse), and pdf isn't an
// image at all — sharp has no meaningful "PDF -> WebP" operation.
const SKIP_EXTENSIONS = new Set(["webp", "svg", "pdf"]);

export function extensionOf(url: string): string {
  return path.extname(url).slice(1).toLowerCase();
}

export function mimeTypeForExtension(ext: string): string {
  return MIME_BY_EXTENSION[ext.toLowerCase()] ?? "application/octet-stream";
}

/** True for legacy raster assets (jpg/jpeg/png, or anything else not in SKIP_EXTENSIONS) uploaded before WebP conversion existed. */
export function needsWebpConversion(asset: Pick<MediaAsset, "url">): boolean {
  return !SKIP_EXTENSIONS.has(extensionOf(asset.url));
}

/**
 * Re-encodes `asset`'s file on disk to WebP (quality 82, capped at 1920px
 * wide — `withoutEnlargement` so smaller originals aren't upscaled),
 * deletes the original file, and updates the row's `url`/`mimeType` in
 * place. Callers should check `needsWebpConversion(asset)` first; this
 * throws for anything else that goes wrong (missing file on disk, a
 * corrupt/unreadable image, a disk write failure).
 */
export async function convertAssetToWebp(asset: MediaAsset): Promise<MediaAsset> {
  const newFilename = `${crypto.randomUUID()}.webp`;

  const original = await readStoredFile(asset.url);
  const webpBuffer = await sharp(original)
    .rotate() // auto-orient from EXIF (phone photos), then strip the tag, before resizing
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const newUrl = await storeFile(newFilename, webpBuffer, "image/webp");

  const updated = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { url: newUrl, mimeType: "image/webp" },
  });

  // Best-effort — the DB row already points at the new file either way, so a
  // failure here just leaves an orphaned file behind rather than breaking
  // anything a visitor or the admin can see.
  await deleteStoredFile(asset.url);

  return updated;
}
