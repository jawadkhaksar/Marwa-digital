import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import { prisma } from "@marwa/db";
import { isAllowedImageUpload, sanitizeSvg, type AllowedUploadKind } from "../../lib/security";
import { convertAssetToWebp, mimeTypeForExtension, needsWebpConversion } from "../../lib/mediaConversion";
import { storeFile, deleteStoredFile, isBlobConfigured } from "../../lib/storage";

export const adminMediaRouter = Router();

const ALLOWED_KINDS: AllowedUploadKind[] = ["jpeg", "png", "webp", "svg", "pdf"];
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "svg", "pdf"]);

// Buffered in memory rather than streamed straight to disk — the upload
// isn't trusted (filename, extension, or declared MIME) until its actual
// bytes are checked against a known file signature below, and SVGs need
// their content rewritten (script/event-handler stripping) before they ever
// touch disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      const err = new Error("Only JPG, PNG, WEBP, SVG, or PDF files are allowed") as Error & { status?: number };
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

adminMediaRouter.get("/", async (_req, res) => {
  const media = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
  res.json(media);
});

// Reports where uploads will be written and whether that target is usable,
// without exposing the token itself. Exists because a failed upload in a
// serverless deployment is otherwise almost impossible to diagnose from the
// outside: local-disk mode "works" right up until the request ends and the
// file silently disappears with it.
adminMediaRouter.get("/storage-status", async (_req, res) => {
  const blob = isBlobConfigured();
  let writable: boolean | null = null;
  let error: string | null = null;
  if (blob) {
    try {
      const probe = await storeFile(`.storage-probe-${crypto.randomUUID()}.txt`, Buffer.from("ok", "utf8"), "text/plain");
      await deleteStoredFile(probe);
      writable = true;
    } catch (err) {
      writable = false;
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }
  res.json({
    mode: blob ? "vercel-blob" : "local-disk",
    tokenPresent: blob,
    writable,
    error,
    warning: blob ? null : "Uploads are being written to local disk. On a serverless host that filesystem is discarded after each request, so files will not persist.",
  });
});

adminMediaRouter.post(
  "/",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be under 8MB" : err.message;
        return res.status(400).json({ error: message });
      }
      next(err);
    });
  },
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
    // The declared extension passed fileFilter above, but that's just a
    // name — verify the actual bytes match a real file of an allowed kind
    // (blocks e.g. an .html/.svg-with-script mislabeled as a .jpg).
    if (!isAllowedImageUpload(req.file.buffer, ext, ALLOWED_KINDS)) {
      return res.status(400).json({ error: "File content doesn't match an allowed image/PDF format" });
    }

    const isSvg = ext === "svg";
    const contents = isSvg ? Buffer.from(sanitizeSvg(req.file.buffer.toString("utf8")), "utf8") : req.file.buffer;
    const filename = `${crypto.randomUUID()}.${ext}`;
    const mimeType = mimeTypeForExtension(ext);

    // Storage failures are reported specifically rather than falling through
    // to the generic 500 handler: the causes an admin can actually act on
    // (a misconfigured/missing blob token, a full disk, a rejected upload)
    // are indistinguishable from a code bug once flattened to "Internal
    // server error", which is exactly the state this endpoint was in.
    let url: string;
    try {
      url = await storeFile(filename, contents, mimeType);
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown storage error";
      console.error("[media] Upload failed:", err);
      return res.status(502).json({ error: `Upload storage failed: ${detail}` });
    }

    const category = typeof req.body.category === "string" ? req.body.category : undefined;
    const asset = await prisma.mediaAsset.create({
      data: { url, filename: req.file.originalname, category, mimeType },
    });
    res.status(201).json(asset);
  }
);

// Batch version of POST /:id/convert-webp below — iterates every asset once,
// converting whichever ones still need it. Per-asset failures (a missing
// file on disk, a corrupt image) are caught individually so one bad row
// doesn't abort the rest of the batch.
adminMediaRouter.post("/convert-all-webp", async (_req, res) => {
  const assets = await prisma.mediaAsset.findMany({ orderBy: { createdAt: "asc" } });

  const results: { id: string; filename: string; status: "converted" | "skipped" | "failed"; error?: string }[] = [];
  for (const asset of assets) {
    if (!needsWebpConversion(asset)) {
      results.push({ id: asset.id, filename: asset.filename, status: "skipped" });
      continue;
    }
    try {
      await convertAssetToWebp(asset);
      results.push({ id: asset.id, filename: asset.filename, status: "converted" });
    } catch (err) {
      results.push({ id: asset.id, filename: asset.filename, status: "failed", error: err instanceof Error ? err.message : "Conversion failed" });
    }
  }

  res.json({
    converted: results.filter((r) => r.status === "converted").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
});

adminMediaRouter.post("/:id/convert-webp", async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) return res.status(404).json({ error: "Media not found" });

  // Already WebP/SVG/PDF — nothing to do. Not an error: the per-card button
  // only shows for convertible assets, but this keeps the endpoint safe to
  // call idempotently (e.g. a double-click) instead of surfacing a scary 4xx.
  if (!needsWebpConversion(asset)) {
    return res.json({ converted: false, asset });
  }

  try {
    const updated = await convertAssetToWebp(asset);
    res.json({ converted: true, asset: updated });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Conversion failed" });
  }
});

export interface MediaUsageRef {
  type: "page" | "post" | "setting" | "collection-item";
  id: string;
  label: string;
  field?: string;
}

// MediaAsset.url is copied BY VALUE everywhere it's placed (Settings image
// fields, Page/Post `layout` JSON trees, Page/Post rich-text `content`,
// CollectionItem `data`) — there's no foreign key to walk, so "usage" here
// means a substring search for the asset's own URL across those columns.
// A JSON.stringify + `.includes()` check isn't a precise reference-graph
// walk, but MediaAsset URLs are unique per-upload paths (see the upload
// handler above), so a false-positive substring match inside unrelated JSON
// is not realistically possible — good enough to warn an admin before they
// delete or WebP-convert something that's actually in use, which is the
// actual goal (a URL that changes out from under a live Site Logo/page
// placement, per the bulk-convert confirm dialog's existing warning).
async function findMediaUsage(url: string): Promise<MediaUsageRef[]> {
  const usages: MediaUsageRef[] = [];
  const containsUrl = (value: unknown): boolean => value != null && JSON.stringify(value).includes(url);

  const [pages, posts, settings, collectionItems] = await Promise.all([
    prisma.page.findMany({ select: { id: true, title: true, content: true, layout: true, ogImage: true } }),
    prisma.post.findMany({ select: { id: true, title: true, content: true, layout: true, featuredImage: true } }),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    prisma.collectionItem.findMany({ select: { id: true, slug: true, data: true, collection: { select: { name: true } } } }),
  ]);

  for (const page of pages) {
    if (page.content?.includes(url) || containsUrl(page.layout) || page.ogImage === url) {
      usages.push({ type: "page", id: page.id, label: page.title });
    }
  }
  for (const post of posts) {
    if (post.content?.includes(url) || containsUrl(post.layout) || post.featuredImage === url) {
      usages.push({ type: "post", id: post.id, label: post.title });
    }
  }
  if (settings) {
    const settingsImageFields: Array<[string, string | null]> = [
      ["Site Logo", settings.logoImage],
      ["Site Icon (favicon)", settings.siteIcon],
      ["Contact Page Hero Image", settings.contactHeroImage],
    ];
    for (const [field, value] of settingsImageFields) {
      if (value === url) usages.push({ type: "setting", id: "singleton", label: "Site Settings", field });
    }
  }
  for (const item of collectionItems) {
    if (containsUrl(item.data)) {
      usages.push({ type: "collection-item", id: item.id, label: `${item.collection.name}: ${item.slug ?? item.id}` });
    }
  }

  return usages;
}

adminMediaRouter.get("/:id/usage", async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) return res.status(404).json({ error: "Media not found" });
  const usages = await findMediaUsage(asset.url);
  res.json({ url: asset.url, usages });
});

adminMediaRouter.delete("/:id", async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) return res.status(404).json({ error: "Media not found" });

  await prisma.mediaAsset.delete({ where: { id: req.params.id } });

  // Best-effort cleanup — the asset row is already gone either way.
  deleteStoredFile(asset.url);

  res.status(204).send();
});
