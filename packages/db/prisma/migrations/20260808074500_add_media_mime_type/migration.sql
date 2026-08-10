-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream';

-- Backfill: derive a real mimeType for every existing row from its url's
-- file extension. Reliable — every stored file's extension was validated
-- against its actual content bytes at upload time (see
-- packages/api/src/lib/security.ts's isAllowedImageUpload), so the
-- extension has never been able to drift from the real format.
UPDATE "MediaAsset" SET "mimeType" = CASE
  WHEN "url" ILIKE '%.jpg' OR "url" ILIKE '%.jpeg' THEN 'image/jpeg'
  WHEN "url" ILIKE '%.png' THEN 'image/png'
  WHEN "url" ILIKE '%.webp' THEN 'image/webp'
  WHEN "url" ILIKE '%.gif' THEN 'image/gif'
  WHEN "url" ILIKE '%.svg' THEN 'image/svg+xml'
  WHEN "url" ILIKE '%.pdf' THEN 'application/pdf'
  ELSE 'application/octet-stream'
END;
