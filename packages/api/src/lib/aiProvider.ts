import OpenAI from "openai";
import { prisma } from "@marwa/db";

/**
 * Thin OpenAI wrapper for the AI Content & SEO Assistant — same DB-first/
 * env-fallback-then-gracefully-degrade philosophy as mailer.ts's SMTP
 * handling, adapted for a feature with no DB-editable config: there's
 * nothing here an admin sets from a Settings screen, just OPENAI_API_KEY.
 * Every call is logged to AiGenerationLog regardless of success/failure
 * shape, as a usage/cost ledger — see logGeneration below.
 */

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI features are not configured — set OPENAI_API_KEY in the API's environment to enable them.");
    this.name = "AiNotConfiguredError";
  }
}

export interface AiCallResult {
  text: string;
  tokensUsed: number;
  model: string;
}

async function logGeneration(userId: string, feature: string, prompt: string, tokensUsed: number): Promise<void> {
  try {
    // Prompts can be full page HTML — capped well short of the column being
    // an issue, this is a usage ledger, not a source-of-truth copy.
    await prisma.aiGenerationLog.create({ data: { userId, feature, prompt: prompt.slice(0, 4000), tokensUsed, model: OPENAI_MODEL } });
  } catch (err) {
    console.error("[ai] Failed to write generation log:", err);
  }
}

/** Plain text-in, text-out completion — rewrite/summarize/expand/simplify/translate. */
export async function generateText(params: { userId: string; feature: string; systemPrompt: string; userPrompt: string }): Promise<AiCallResult> {
  const client = getClient();
  if (!client) throw new AiNotConfiguredError();

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ],
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const tokensUsed = completion.usage?.total_tokens ?? 0;
  await logGeneration(params.userId, params.feature, params.userPrompt, tokensUsed);
  return { text, tokensUsed, model: OPENAI_MODEL };
}

/** JSON-mode completion — structured output, e.g. SEO metadata's multiple named fields. */
export async function generateJson<T>(params: {
  userId: string;
  feature: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<{ data: T; tokensUsed: number; model: string }> {
  const client = getClient();
  if (!client) throw new AiNotConfiguredError();

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const tokensUsed = completion.usage?.total_tokens ?? 0;
  await logGeneration(params.userId, params.feature, params.userPrompt, tokensUsed);

  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    throw new Error("The AI provider returned a response that couldn't be parsed.");
  }
  return { data, tokensUsed, model: OPENAI_MODEL };
}

/** Vision-capable completion — an image in, text out. Used for alt-text generation. `imageUrl` may be a real URL or a data: URI. */
export async function generateFromImage(params: { userId: string; feature: string; systemPrompt: string; imageUrl: string }): Promise<AiCallResult> {
  const client = getClient();
  if (!client) throw new AiNotConfiguredError();

  const completion = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: params.systemPrompt },
          { type: "image_url", image_url: { url: params.imageUrl } },
        ],
      },
    ],
    temperature: 0.4,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const tokensUsed = completion.usage?.total_tokens ?? 0;
  await logGeneration(params.userId, params.feature, params.imageUrl.slice(0, 200), tokensUsed);
  return { text, tokensUsed, model: OPENAI_MODEL };
}
