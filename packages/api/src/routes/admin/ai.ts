import { Router } from "express";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { prisma } from "@marwa/db";
import type { AuthedRequest } from "../../lib/auth";
import { formatZodError } from "../../lib/zodError";
import { generateText, generateJson, generateFromImage, isAiConfigured, AiNotConfiguredError } from "../../lib/aiProvider";

export const adminAiRouter = Router();

// A clear, actionable 503 beats a silent no-op here — this is an
// interactive "click a button, see a result" UI (the AI Assist toolbar, the
// SEO drawer, the Gallery's Auto Alt Text), not a background job like
// mailer.ts's SMTP sends, where skipping quietly is the right call.
adminAiRouter.use((_req, res, next) => {
  if (!isAiConfigured()) return res.status(503).json({ error: "AI features are not configured. Set OPENAI_API_KEY in the API's environment to enable them." });
  next();
});

// ── POST /generate-text ──────────────────────────────────────────────────
// Backs the Visual Page Builder's "AI Assist" floating toolbar (rewrite,
// translate, extend a selected text block) and any other free-text rewrite
// surface.

const REWRITE_INSTRUCTIONS: Record<string, string> = {
  summarize: "Summarize the following text concisely, preserving its key meaning.",
  expand: "Expand the following text with more detail and supporting context, in the same voice.",
  professional: "Rewrite the following text in a professional, polished tone.",
  simplify: "Simplify the following text so it's easy to read, using plain language.",
  rewrite: "Rewrite the following text to improve clarity and flow, without changing its meaning.",
};

const generateTextSchema = z.object({
  text: z.string().min(1),
  instruction: z.enum(["summarize", "expand", "professional", "simplify", "rewrite", "translate"]).default("rewrite"),
  // Only meaningful when instruction === "translate".
  targetLanguage: z.string().optional(),
});

adminAiRouter.post("/generate-text", async (req: AuthedRequest, res) => {
  const parsed = generateTextSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { text, instruction, targetLanguage } = parsed.data;

  const instructionText =
    instruction === "translate"
      ? `Translate the following text into ${targetLanguage?.trim() || "English"}.`
      : REWRITE_INSTRUCTIONS[instruction];

  try {
    const result = await generateText({
      userId: req.user!.id,
      feature: "TEXT_REWRITE",
      systemPrompt: `You are a skilled copywriter editing website content. ${instructionText} Return only the rewritten text itself — no preamble, explanation, or surrounding quotation marks.`,
      userPrompt: text,
    });
    res.json({ text: result.text, tokensUsed: result.tokensUsed, model: result.model });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return res.status(503).json({ error: err.message });
    console.error("[ai] generate-text failed:", err);
    res.status(502).json({ error: "The AI provider request failed. Please try again." });
  }
});

// ── POST /generate-seo ────────────────────────────────────────────────────
// Backs the SEO Settings drawer's "Auto-Generate with AI" button on Page
// and Post editors.

const generateSeoSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1), // plain text or raw HTML — the model handles either well enough
});

interface SeoAiResult {
  metaTitle: string;
  metaDescription: string;
  focusKeywords: string[];
  ogTitle: string;
  ogDescription: string;
}

adminAiRouter.post("/generate-seo", async (req: AuthedRequest, res) => {
  const parsed = generateSeoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { title, content } = parsed.data;

  try {
    const result = await generateJson<SeoAiResult>({
      userId: req.user!.id,
      feature: "SEO_METADATA",
      systemPrompt:
        'You are an SEO specialist. Given a web page\'s title and content, respond with a JSON object with exactly these keys: "metaTitle" (string, max 60 characters, compelling and keyword-rich), "metaDescription" (string, max 155 characters, a persuasive summary that encourages clicks), "focusKeywords" (array of 3-5 target search phrase strings), "ogTitle" (string, a punchy social-share headline, may differ from metaTitle), "ogDescription" (string, a short social-share summary, max 200 characters).',
      userPrompt: `Page title: ${title || "(untitled)"}\n\nPage content:\n${content.slice(0, 6000)}`,
    });
    res.json({ ...result.data, tokensUsed: result.tokensUsed, model: result.model });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return res.status(503).json({ error: err.message });
    console.error("[ai] generate-seo failed:", err);
    res.status(502).json({ error: "The AI provider request failed. Please try again." });
  }
});

// ── POST /generate-alt-text ───────────────────────────────────────────────
// Backs the Gallery's "Auto Alt Text" button — persists the result onto
// MediaAsset.altText directly, since there's nowhere else in the admin UI
// that alt text is edited yet.

const generateAltTextSchema = z.object({ mediaId: z.string().min(1) });

/** OpenAI can't reach a local /uploads/** URL, so a local asset is read off disk and sent as a base64 data URI instead; a real external URL (already-migrated media, e.g.) is passed through unchanged. */
function resolveImageForVision(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const abs = path.join(process.cwd(), url.replace(/^\//, ""));
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).replace(".", "").toLowerCase() || "png";
  return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${buf.toString("base64")}`;
}

adminAiRouter.post("/generate-alt-text", async (req: AuthedRequest, res) => {
  const parsed = generateAltTextSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const asset = await prisma.mediaAsset.findUnique({ where: { id: parsed.data.mediaId } });
  if (!asset) return res.status(404).json({ error: "Media asset not found" });

  let imageUrl: string;
  try {
    imageUrl = resolveImageForVision(asset.url);
  } catch {
    return res.status(400).json({ error: "Could not read this image file to analyze it." });
  }

  try {
    const result = await generateFromImage({
      userId: req.user!.id,
      feature: "ALT_TEXT",
      systemPrompt:
        "Write a concise, SEO-optimized alt text describing what this image depicts, for accessibility and search engines. One sentence, no more than 125 characters, no phrases like 'image of' or 'picture of'.",
      imageUrl,
    });

    const altText = result.text.trim().replace(/^"|"$/g, "");
    await prisma.mediaAsset.update({ where: { id: asset.id }, data: { altText } });

    res.json({ altText, tokensUsed: result.tokensUsed, model: result.model });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) return res.status(503).json({ error: err.message });
    console.error("[ai] generate-alt-text failed:", err);
    res.status(502).json({ error: "The AI provider request failed. Please try again." });
  }
});
