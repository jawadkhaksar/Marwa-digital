import { Router } from "express";
import { z } from "zod";
import { optionalPhoneNumberSchema, nullableOptionalPhoneNumberSchema } from "@marwa/builder";
import { prisma } from "@marwa/db";
import type { AuthedRequest } from "../../lib/auth";
import { formatZodError } from "../../lib/zodError";

export const adminSettingsRouter = Router();

// Settings itself stays open to EDITOR (siteName, contact info,
// primaryMenuId, etc. are ordinary content an EDITOR legitimately manages —
// apps/admin's Menus page PATCHes primaryMenuId here, for instance) —
// only the SMTP block and reCAPTCHA *secret* keys are ADMIN-gated, at the
// field level rather than the whole router, same secret set the public
// GET /api/settings (content.ts) already strips unconditionally. reCAPTCHA
// *site* keys are excluded — those are meant to be public, embedded
// client-side.
const ADMIN_ONLY_FIELDS = new Set([
  "recaptchaV2SecretKey",
  "recaptchaV3SecretKey",
  "smtpHost",
  "smtpPort",
  "smtpUser",
  "smtpPassword",
  "smtpSecure",
  "smtpFromEmail",
  "smtpFromName",
]);

function redactForRole<T extends Record<string, unknown>>(settings: T, role: string | undefined): T {
  if (role === "ADMIN") return settings;
  const redacted: Record<string, unknown> = { ...settings };
  for (const key of ADMIN_ONLY_FIELDS) delete redacted[key];
  return redacted as T;
}

adminSettingsRouter.get("/", async (req: AuthedRequest, res) => {
  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  res.json(redactForRole(settings, req.user?.role));
});

const settingsSchema = z.object({
  siteName: z.string().min(1).optional(),
  tagline: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: optionalPhoneNumberSchema,
  whatsappNumber: nullableOptionalPhoneNumberSchema,
  contactAddress: z.string().optional(),
  contactResponseTime: z.string().min(1).optional(),
  facebookUrl: z.string().url().nullable().optional(),
  instagramUrl: z.string().url().nullable().optional(),
  twitterUrl: z.string().url().nullable().optional(),
  youtubeUrl: z.string().url().nullable().optional(),
  linkedinUrl: z.string().url().nullable().optional(),

  logoImage: z.string().min(1).nullable().optional(),
  footerCopyrightText: z.string().min(1).optional(),

  smoothScrollEnabled: z.boolean().optional(),
  customCursorEnabled: z.boolean().optional(),
  cursorGlowEnabled: z.boolean().optional(),

  contactHeroImage: z.string().optional(),
  contactEyebrow: z.string().min(1).optional(),
  contactHeading: z.string().min(1).optional(),
  contactParagraph: z.string().min(1).optional(),
  contactCtaPrimaryLabel: z.string().min(1).optional(),
  contactCtaSecondaryLabel: z.string().min(1).optional(),
  contactInfoEyebrow: z.string().min(1).optional(),
  contactInfoTitle: z.string().min(1).optional(),
  contactBusinessHours: z.string().min(1).optional(),
  contactFaqHeading: z.string().min(1).optional(),

  blogArchiveTemplate: z.enum(["A", "B", "C"]).optional(),
  blogPostTemplate: z.enum(["A", "B", "C"]).optional(),

  recaptchaV2SiteKey: z.string().nullable().optional(),
  recaptchaV2SecretKey: z.string().nullable().optional(),
  recaptchaV3SiteKey: z.string().nullable().optional(),
  recaptchaV3SecretKey: z.string().nullable().optional(),
  recaptchaV3ScoreThreshold: z.string().min(1).optional(),

  smtpHost: z.string().nullable().optional(),
  smtpPort: z.string().nullable().optional(),
  smtpUser: z.string().nullable().optional(),
  smtpPassword: z.string().nullable().optional(),
  smtpSecure: z.boolean().optional(),
  smtpFromEmail: z.string().nullable().optional(),
  smtpFromName: z.string().nullable().optional(),

  primaryMenuId: z.string().nullable().optional(),

  siteIcon: z.string().min(1).nullable().optional(),
  siteUrl: z.string().url().optional(),
  adminEmail: z.string().email().optional(),
  timezone: z.string().min(1).optional(),
  dateFormat: z.string().min(1).optional(),
  timeFormat: z.string().min(1).optional(),
  siteLanguage: z.string().min(1).optional(),

  homepageDisplay: z.enum(["static", "posts"]).optional(),
  homepagePageSlug: z.string().nullable().optional(),
  postsPageSlug: z.string().nullable().optional(),
  postsPerPage: z.number().int().positive().optional(),
  feedItemCount: z.number().int().positive().optional(),
  feedContentMode: z.enum(["full", "excerpt"]).optional(),
  searchEngineNoindex: z.boolean().optional(),

  defaultPostCategoryId: z.string().nullable().optional(),
  defaultPostFormat: z.enum(["STANDARD", "GALLERY", "VIDEO", "QUOTE"]).optional(),
  updateServiceUrls: z.string().nullable().optional(),

  permalinkStructure: z.string().min(1).optional(),
  categoryBase: z.string().nullable().optional(),
  tagBase: z.string().nullable().optional(),

  // Analytics & Lead Attribution (Admin → Analytics & Leads → Settings) —
  // without these, safeParse silently strips them (unknown keys on a plain
  // z.object() are dropped, not rejected) and the PATCH becomes a no-op for
  // every field below, which is exactly what made the Analytics Settings
  // checkboxes look unclickable: the optimistic UI update got overwritten
  // by the server echoing back the row completely unchanged.
  analyticsAnonymizeIp: z.boolean().optional(),
  analyticsExcludeAdminTraffic: z.boolean().optional(),
  analyticsCookieDays: z.number().int().positive().optional(),
  sessionRecordingEnabled: z.boolean().optional(),
});

adminSettingsRouter.patch("/", async (req: AuthedRequest, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  if (req.user?.role !== "ADMIN") {
    const attemptedAdminField = Object.keys(parsed.data).find((key) => ADMIN_ONLY_FIELDS.has(key));
    if (attemptedAdminField) {
      return res.status(403).json({ error: "Only Admin accounts can change SMTP or reCAPTCHA secret key settings" });
    }
  }

  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: parsed.data,
    create: { id: "singleton", ...parsed.data },
  });
  res.json(redactForRole(settings, req.user?.role));
});
