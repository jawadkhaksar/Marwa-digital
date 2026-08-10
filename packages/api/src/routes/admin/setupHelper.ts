import { Router } from "express";
import { prisma } from "@marwa/db";

export const adminSetupHelperRouter = Router();

adminSetupHelperRouter.get("/", async (_req, res) => {
  const [adminCount, pageCount, publishedPostCount, menuCount, settings] = await Promise.all([
    prisma.user.count(),
    prisma.page.count({ where: { published: true } }),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.menu.count(),
    prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  const checklist = [
    { label: "Database connected", done: true, group: "Core" },
    { label: "Admin account created", done: adminCount > 0, group: "Core" },
    { label: "Site title & tagline set", done: Boolean(settings?.siteName && settings.tagline), group: "Core" },
    { label: "Site logo uploaded", done: Boolean(settings?.logoImage), group: "Branding" },
    { label: "Site icon (favicon) uploaded", done: Boolean(settings?.siteIcon), group: "Branding" },
    { label: "At least one published page", done: pageCount > 0, group: "Content" },
    { label: "Homepage selected (Settings → Reading)", done: Boolean(settings?.homepagePageSlug) || settings?.homepageDisplay === "posts", group: "Content" },
    { label: "At least one published post", done: publishedPostCount > 0, group: "Content" },
    { label: "At least one navigation menu", done: menuCount > 0, group: "Content" },
    { label: "Email notifications (SMTP) configured", done: Boolean(settings?.smtpHost || process.env.SMTP_HOST), group: "Notifications" },
    { label: "reCAPTCHA configured (form spam protection)", done: Boolean(settings?.recaptchaV3SiteKey || settings?.recaptchaV2SiteKey), group: "Integrations" },
  ];

  res.json({
    checklist,
    completedCount: checklist.filter((c) => c.done).length,
    totalCount: checklist.length,
  });
});
