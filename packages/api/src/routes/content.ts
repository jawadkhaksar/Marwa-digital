import { Router } from "express";
import { z } from "zod";
import { optionalPhoneNumberSchema } from "@marwa/builder";
import { prisma } from "@marwa/db";
import { sendContactInquiryEmail } from "../lib/contactNotifications";
import { formatZodError } from "../lib/zodError";
import { formsLimiter, looksLikeBot } from "../lib/security";
import { unifyContact } from "../lib/crm";
import { dispatchTrigger } from "../services/workflowEngine";
import { verifyPreviewToken } from "../lib/auth";

export const contentRouter = Router();

const contactInquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: optionalPhoneNumberSchema,
  subject: z.string().optional(),
  message: z.string().optional(),
  // Bot defense — invisible to real visitors, see ContactForm.tsx. `website`
  // is a honeypot field (real users never see or fill it); `renderedAt` is
  // when the form was rendered client-side, to reject sub-2-second submits.
  website: z.string().optional(),
  renderedAt: z.coerce.number().optional(),
  // Lead attribution — see apps/web/src/lib/analytics.ts, which injects
  // these from the visitor's own session/first-touch data before every
  // submission. All optional: a direct API call or a visitor with tracking
  // blocked still submits successfully, just without attribution.
  sessionId: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  landingPage: z.string().optional(),
  conversionPage: z.string().optional(),
});

contentRouter.post("/contact", formsLimiter, async (req, res) => {
  const parsed = contactInquirySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  const { website, renderedAt, sessionId, ...data } = parsed.data;

  if (looksLikeBot(website, renderedAt)) {
    // Respond as if it succeeded so the bot doesn't learn to look elsewhere.
    return res.status(201).json({ ok: true });
  }

  // A sessionId the client sent doesn't necessarily still correspond to a
  // real VisitorSession row (cleared cookie, expired session, tracking
  // blocked after the cookie was set) — the FK is nullable specifically for
  // this, so an unresolved id is dropped rather than failing the whole
  // submission.
  const validSessionId = sessionId && (await prisma.visitorSession.findUnique({ where: { sessionId }, select: { sessionId: true } })) ? sessionId : undefined;

  // Contact auto-unification: resolve this inquiry onto a single 360°
  // Contact profile (matched by email), creating one on first contact —
  // logged before the inquiry itself so the activity timeline never shows a
  // gap even if the inquiry write below fails.
  const contactId = await unifyContact({
    email: data.email,
    name: data.name,
    phone: data.phone,
    sessionId: validSessionId,
    activityType: "INQUIRY_SUBMITTED",
    activityTitle: data.subject ? `Submitted contact form: ${data.subject}` : "Submitted contact form",
    activityDescription: data.message,
    metadata: { subject: data.subject ?? null, message: data.message ?? null },
  });

  const inquiry = await prisma.contactInquiry.create({ data: { ...data, sessionId: validSessionId, contactId } });
  await sendContactInquiryEmail(inquiry);
  dispatchTrigger("FORM_SUBMITTED", { contactId, formId: "contact-page" });
  res.status(201).json({ ok: true });
});

contentRouter.get("/reviews", async (_req, res) => {
  const reviews = await prisma.review.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

contentRouter.get("/pages", async (_req, res) => {
  const pages = await prisma.page.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { slug: "asc" },
  });
  res.json(pages);
});

contentRouter.get("/pages/:slug", async (req, res) => {
  const page = await prisma.page.findUnique({ where: { slug: req.params.slug } });
  if (!page) return res.status(404).json({ error: "Page not found" });

  // Staging Preview Link (Admin → Builder → "Save as Staged Draft") — a
  // valid ?previewToken lets an unpublished/staged page render exactly as
  // stagedContent/stagedLayout would look once actually published, without
  // touching what every other visitor sees.
  const previewToken = typeof req.query.previewToken === "string" ? req.query.previewToken : undefined;
  const isPreview = verifyPreviewToken(previewToken, "page", page.id);
  if (isPreview) {
    return res.json({ ...page, content: page.stagedContent ?? page.content, layout: page.stagedLayout ?? page.layout, isPreview: true });
  }

  if (!page.published) return res.status(404).json({ error: "Page not found" });
  res.json(page);
});

// The primary menu's TOP-LEVEL items, each with its own (also top-level-
// only, one level deep) `children` array — SiteHeader renders a dropdown
// for any item that has children, styled like its existing hard-coded
// "Service" menu. The Nav Menu block instead fetches a menu's full flat
// item list via GET /api/menus/:id below and builds its own tree.
contentRouter.get("/menu-links", async (_req, res) => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.primaryMenuId) return res.json([]);
  const items = await prisma.menuItem.findMany({
    where: { menuId: settings.primaryMenuId, parentId: null, active: true },
    orderBy: { order: "asc" },
    include: { children: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  res.json(items);
});

// Unified public lookup by placement rather than a specific menu ID — same
// nested (one level) shape as /menu-links above. "header" mirrors whatever
// SiteSettings.primaryMenuId already resolves to (that mechanism is
// untouched); "footer" is the new capability — SiteFooter renders this
// menu's items instead of the static FooterLink groups when one is assigned,
// falling back to FooterLink when it isn't (see apps/web/src/components/SiteFooter.tsx).
contentRouter.get("/menus/location/:location", async (req, res) => {
  const location = req.params.location;
  if (location !== "header" && location !== "footer") return res.status(400).json({ error: "location must be 'header' or 'footer'" });

  const menu =
    location === "header"
      ? await (async () => {
          const settings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
          if (!settings?.primaryMenuId) return null;
          return prisma.menu.findUnique({ where: { id: settings.primaryMenuId } });
        })()
      : await prisma.menu.findFirst({ where: { showInFooter: true } });

  if (!menu) return res.json({ menu: null, items: [] });

  const items = await prisma.menuItem.findMany({
    where: { menuId: menu.id, parentId: null, active: true },
    orderBy: { order: "asc" },
    include: { children: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  res.json({ menu: { id: menu.id, name: menu.name }, items });
});

contentRouter.get("/menus/:id", async (req, res) => {
  const menu = await prisma.menu.findUnique({
    where: { id: req.params.id },
    include: { items: { where: { active: true }, orderBy: { order: "asc" } } },
  });
  if (!menu) return res.status(404).json({ error: "Menu not found" });
  res.json(menu);
});

contentRouter.get("/footer-links", async (_req, res) => {
  const links = await prisma.footerLink.findMany({ where: { active: true }, orderBy: [{ group: "asc" }, { order: "asc" }] });
  res.json(links);
});

contentRouter.get("/settings", async (_req, res) => {
  const settings = await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  // Secret Keys and SMTP credentials are server-only — never send them to
  // the public client, unlike the reCAPTCHA Site Keys, which are meant to be
  // embedded client-side.
  const {
    recaptchaV2SecretKey: _v2,
    recaptchaV3SecretKey: _v3,
    smtpHost: _smtpHost,
    smtpPort: _smtpPort,
    smtpUser: _smtpUser,
    smtpPassword: _smtpPassword,
    smtpSecure: _smtpSecure,
    smtpFromEmail: _smtpFromEmail,
    smtpFromName: _smtpFromName,
    ...publicSettings
  } = settings;
  res.json(publicSettings);
});

contentRouter.get("/faqs", async (_req, res) => {
  const faqs = await prisma.faq.findMany({ where: { published: true }, orderBy: { order: "asc" } });
  res.json(faqs);
});

// Backs the Search block's <form action="/search"> — a single query across
// published Posts (title/excerpt) and published Pages (title/
// metaDescription), merged and capped at `limit`. Case-insensitive
// substring match (Prisma's `contains`+`insensitive` mode), not a real
// full-text/ranked search engine — fine at this content scale, and avoids
// requiring a search-specific Postgres extension or external service.
//
// Post results carry the raw fields apps/web's buildPostHref (blogPermalink.ts)
// needs to resolve the admin's configured permalink structure (postNumber/
// publishedAt/categories/author) rather than a pre-built href — that
// resolution logic is deliberately client-side only (PostsBlock.tsx does
// the same), so duplicating a second WordPress-style token parser here
// would just be a second place for the two to drift out of sync.
contentRouter.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) return res.json({ query: "", posts: [], pages: [] });

  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  const [posts, pages] = await Promise.all([
    prisma.post.findMany({
      where: { status: "PUBLISHED", OR: [{ title: { contains: q, mode: "insensitive" } }, { excerpt: { contains: q, mode: "insensitive" } }] },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        postNumber: true,
        publishedAt: true,
        categories: { select: { slug: true } },
        author: { select: { name: true } },
      },
      take: limit,
      orderBy: { publishedAt: "desc" },
    }),
    prisma.page.findMany({
      where: { published: true, OR: [{ title: { contains: q, mode: "insensitive" } }, { metaDescription: { contains: q, mode: "insensitive" } }] },
      select: { slug: true, title: true, metaDescription: true, updatedAt: true },
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  res.json({ query: q, posts, pages });
});

// Public read for the Loop Grid/Loop Carousel/Portfolio/Collection List
// blocks — published items only, in editor-defined order. `fields` comes
// along so a block can render without a second round-trip to figure out
// what each item's `data` keys mean (label/type per key).
contentRouter.get("/collections/:key/items", async (req, res) => {
  const collection = await prisma.collection.findUnique({
    where: { key: req.params.key },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!collection) return res.status(404).json({ error: "Collection not found" });

  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
  const items = await prisma.collectionItem.findMany({
    where: { collectionId: collection.id, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    take: limit,
  });

  res.json({ collection: { id: collection.id, key: collection.key, name: collection.name, fields: collection.fields }, items });
});
