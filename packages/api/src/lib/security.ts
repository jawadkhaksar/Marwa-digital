import type { CorsOptions } from "cors";
import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";

/**
 * CORS allowlist. Requests with no Origin header (native mobile apps,
 * server-to-server, curl) are always allowed — CORS is a browser-enforced
 * mechanism, so there's nothing to protect there; only browser-originated
 * cross-site requests are what this restricts.
 */
function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>(["http://localhost:3000", "http://localhost:3001"]);
  if (process.env.WEB_URL) origins.add(process.env.WEB_URL);
  if (process.env.ADMIN_URL) origins.add(process.env.ADMIN_URL);
  for (const extra of (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",")) {
    const trimmed = extra.trim();
    if (trimmed) origins.add(trimmed);
  }
  return origins;
}

const allowedOrigins = buildAllowedOrigins();

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
};

/**
 * General ceiling for all API traffic. Started at 100/min per the original
 * directive, but that proved too tight for real usage twice: the admin
 * media gallery firing 30+ requests on one view (fixed by excluding
 * /uploads entirely, see server.ts), and a single visual-builder page that
 * legitimately mounts many data-fetching blocks at once (e.g. the block
 * showcase page) tripping it on a single load. 100/min was blunting normal
 * traffic, not just abuse — raised to 300/min, still well below anything
 * a real scraping/brute-force sweep would stay under.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Login attempts only — only failed attempts count against the limit, so a legitimate user re-typing a working password repeatedly never gets locked out. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

/**
 * Shared bot check for public endpoints that aren't built on the Visual
 * Builder's Form block (which already has its own honeypot/reCAPTCHA field
 * types wired through forms.ts) — e.g. the hardcoded /api/contact route.
 * `renderedAt` is a client-supplied "page loaded at" timestamp (ms since
 * epoch); submitting faster than a human could plausibly fill the form out
 * is a strong bot signal.
 */
export const MIN_SUBMIT_MS = 2000;

export function looksLikeBot(honeypotValue: string | undefined, renderedAt: number | undefined): boolean {
  if (honeypotValue && honeypotValue.trim()) return true;
  if (renderedAt !== undefined && Date.now() - renderedAt < MIN_SUBMIT_MS) return true;
  return false;
}

/** Public form submission/upload endpoints — the main spam surface. */
export const formsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again in a few minutes." },
});

// ── File signature ("magic bytes") verification ────────────────────────────
// Trusting a client-supplied MIME type or extension alone lets an attacker
// upload an .html/.svg-with-script/polyglot file mislabeled as a .jpg. This
// checks the actual leading bytes of the uploaded content against known
// signatures for the formats this app accepts.

export type AllowedUploadKind = "jpeg" | "png" | "webp" | "gif" | "svg" | "pdf";

function matchesSignature(buf: Buffer, bytes: (number | null)[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => b === null || buf[offset + i] === b);
}

/** Returns the detected kind from the file's actual bytes, or null if it doesn't match any allowed signature. */
export function detectUploadKind(buf: Buffer): AllowedUploadKind | null {
  if (matchesSignature(buf, [0xff, 0xd8, 0xff])) return "jpeg";
  if (matchesSignature(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (matchesSignature(buf, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (matchesSignature(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  // WEBP: "RIFF" .... "WEBP" (size field at bytes 4-7 varies, so only the fixed anchors are checked).
  if (matchesSignature(buf, [0x52, 0x49, 0x46, 0x46]) && matchesSignature(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  // SVG is text/XML, not a binary signature — sniff the first non-whitespace bytes for an <svg or <?xml root tag.
  const head = buf.subarray(0, 1024).toString("utf8").trimStart();
  if (/^(<\?xml[^>]*>\s*)?<svg[\s>]/i.test(head)) return "svg";
  return null;
}

const EXTENSION_TO_KIND: Record<string, AllowedUploadKind> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  gif: "gif",
  svg: "svg",
  pdf: "pdf",
};

/** True if the file's real (sniffed) content type is consistent with its extension AND is one of the allowed kinds. */
export function isAllowedImageUpload(buf: Buffer, extension: string, allowed: AllowedUploadKind[]): boolean {
  const kind = detectUploadKind(buf);
  if (!kind || !allowed.includes(kind)) return false;
  return EXTENSION_TO_KIND[extension.toLowerCase().replace(".", "")] === kind;
}

// ── Rich text sanitization ──────────────────────────────────────────────
// Page.content / Post.content are TipTap-authored HTML (see apps/admin's
// RichTextEditor.tsx for the exact extension set this allowlist mirrors —
// StarterKit + Underline + Link + TextAlign + Image) rendered back out via
// dangerouslySetInnerHTML on the public site. Only admins can write it today,
// but sanitizing server-side before it's ever stored is defense in depth —
// against a compromised/malicious admin session, and against any future
// path that lets this field be set from outside the trusted CMS forms.
// customCss/customJs/headTags are NOT run through this — those are
// deliberate raw-code admin features, sanitizing them would break the point.
const RICH_TEXT_TAGS = [
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "s", "strike", "del", "u",
  "code", "pre", "blockquote", "ul", "ol", "li", "hr", "br", "a", "img", "span", "div",
];

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: RICH_TEXT_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["style"],
    },
    allowedStyles: {
      "*": { "text-align": [/^left$|^right$|^center$|^justify$/] },
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });
}

/**
 * SVGs are XML — they can carry <script>, event handler attributes, or
 * javascript: URIs that execute when the file is opened directly. Since this
 * app allows SVG uploads for logos/icons, strip the active-content vectors
 * rather than reject the format outright.
 */
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|xlink:href)\s*=\s*"(\s*javascript:[^"]*)"/gi, '$1="#"')
    .replace(/(href|xlink:href)\s*=\s*'(\s*javascript:[^']*)'/gi, "$1='#'");
}
