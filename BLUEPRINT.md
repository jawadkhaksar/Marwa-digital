# Marwa Digital — Technical Blueprint

A self-hosted CMS and visual page builder. The admin dashboard is where pages,
posts, menus, and site chrome are authored; the public Next.js site renders
whatever the builder produced. Everything else has been removed.

> **History.** This codebase was extracted from ExuroTrip, a chauffeur/transport
> platform. The transport domain (bookings, dispatch, drivers, fleet, tours, ski
> routes, invoicing, payments, and the two Expo mobile apps) was deleted
> wholesale — models, API routes, admin screens, and public routes. If you find a
> reference to any of it, it's a leftover, not a feature.

## 1. Monorepo Structure

```
marwa-digital/
├── apps/
│   ├── web/                 # Next.js public site (App Router) — renders builder output
│   └── admin/               # Next.js admin dashboard (separate app, JWT auth)
├── packages/
│   ├── api/                 # Express + Node backend (REST)
│   ├── builder/             # The builder engine: block registry, schemas, style keys
│   └── db/                  # Prisma schema + migrations (Postgres)
├── turbo.json               # Turborepo pipeline
└── package.json             # workspaces root
```

`packages/builder` is the heart of the product and is imported by all three
other workspaces: the admin uses it to render the property panel and block
palette, the web app uses it to validate and render saved layouts, and the API
uses it to validate layout JSON on write. Its `registry.ts` defines every block
— what props it takes, its defaults, and its Zod schema.

Rationale for splitting web from admin: they have different auth models and
release cadences, and `packages/api` keeps one source of truth for validation so
the two can't drift.

## 2. Brand Palette

| Role | Value |
|---|---|
| Base / Background | Deep Navy `#080B1F` |
| Text / Contrast | Pure White `#FFFFFF` |
| Primary Accent | Electric Blue `#2563FF` |
| Secondary Accent | Purple `#7C3AED` |
| Surface / Cards | Off-White / Light Gray `#F4F6FA` |
| Accent Gradient | `#2563FF` → `#FC3AED` |

Two naming quirks are deliberate, both to avoid rewriting hundreds of class
names (and silently missing some):

- **`--gold` / `text-gold` / `bg-gold` in `apps/web` now mean "primary
  accent"** and carry Electric Blue. The name is baked into ~600 utility
  usages *and* into saved page layouts, so the value moved, not the token.
- **`amber-*` and `zinc-*` in `apps/admin` are redefined** in
  `apps/admin/src/app/globals.css` via Tailwind v4 `@theme`: `amber-400`
  is the Electric Blue accent, and the `zinc` ramp is retinted navy
  (`zinc-950` = `#080B1F`, `zinc-50` = `#F4F6FA`). Every existing utility
  repaints at once, and new ones stay on-brand automatically.

Tokens are defined once in each app's `globals.css`. Prefer the semantic
aliases (`--accent`, `--accent-strong`, `--accent-secondary`,
`--accent-gradient`, and the `.brand-gradient` / `.brand-gradient-text`
utilities) for anything new.

## 3. Tech Stack

- Frontend: Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4
- Backend: Node.js, Express 4, TypeScript
- ORM/DB: Prisma 6 + PostgreSQL
- Auth: JWT bearer tokens; roles are `ADMIN` and `EDITOR`
- Rich text: Tiptap (the CLASSIC editor mode)
- Animation: GSAP (block timelines + reusable "Timed Animations"), Lenis (smooth scroll)
- Email: Nodemailer over the site's own SMTP mailbox
- File storage: local `packages/api/uploads`, served at `/uploads/**`

## 4. The Two Editor Modes

Both `Page` and `Post` carry `editorMode`, and it decides which column is
authoritative:

- `CLASSIC` — `content` holds rich HTML from the Tiptap editor.
- `BUILDER` — `layout` holds a `LayoutDocument`: a JSON tree of blocks, each
  with props, styles (including tablet/mobile/hover/focus/active variants), and
  optional GSAP timelines.

`LayoutRenderer` (web) walks that tree and maps each node's `type` to a React
component via the `COMPONENTS` map in `blockComponents.tsx`. A block exists only
if it is in **both** the registry (`packages/builder/src/registry.ts`, which
defines its props) and that map (which defines how it renders).

## 5. Data Model (Prisma)

```prisma
// Auth
User            // id, email, passwordHash, name, role (ADMIN|EDITOR), avatarUrl, bio

// Content
Page            // slug, title, editorMode, content, layout, SEO fields, headTags/customCss/customJs, template, published
Post            // same dual-editor shape + excerpt, featuredImage, author, categories, tags,
                // status (DRAFT|PUBLISHED|SCHEDULED), publishedAt, readingTime, postNumber
Category, Tag   // blog taxonomy
Faq             // question/answer pairs, ordered
Review          // curated testimonials — hand-entered, no link to any other record
MediaAsset      // uploaded files

// Dynamic collections (define your own repeatable content types from the UI)
Collection, CollectionField, CollectionItem

// Site chrome
Menu, MenuItem  // nested menus; one can be assigned to header and/or footer
FooterLink      // static grouped footer links (fallback when no footer menu is set)
SiteTemplate    // Theme Builder: reusable header/footer + blog chrome slots, with
                // Include/Exclude condition rules deciding which pages they apply to
StyleClass      // reusable named style bag, attachable to any node by id
TimedAnimation  // reusable named GSAP timeline, referenced by id from any trigger
SiteSettings    // singleton: branding, contact, SMTP, reCAPTCHA, reading/writing/permalink settings

// Inbound
ContactInquiry  // /contact form submissions
FormSubmission  // builder Form block submissions
EmailTemplate   // admin-editable overrides for the transactional emails
```

## 6. API Surface (Express, `packages/api`)

```
GET    /health

--- public ---
POST   /api/auth/login
GET    /api/settings                  # secrets stripped server-side
GET    /api/pages , /api/pages/:slug
GET    /api/posts , /api/posts/:slug , /api/posts/featured , /api/posts/by-number/:n
GET    /api/categories , /api/tags
GET    /api/menu-links , /api/menus/:id , /api/menus/location/:location
GET    /api/footer-links , /api/faqs , /api/reviews
GET    /api/site-templates , /api/style-classes , /api/timed-animations
POST   /api/contact                   # rate-limited + honeypot + timing check
POST   /api/forms/submit              # builder Form block, reCAPTCHA-verified

--- admin (JWT, requireAdmin) ---
/api/admin/pages          /api/admin/posts        /api/admin/categories  /api/admin/tags
/api/admin/menus          /api/admin/footer-links /api/admin/media       /api/admin/faqs
/api/admin/reviews        /api/admin/users        /api/admin/settings    /api/admin/inquiries
/api/admin/form-submissions                       /api/admin/email-templates
/api/admin/site-templates /api/admin/style-classes /api/admin/timed-animations
/api/admin/setup-helper
```

## 7. Public Site — Routes (`apps/web`)

- `/` — whichever Page is selected in **Settings → Reading → Homepage**. If
  Reading is set to "your latest posts" it renders the blog archive instead.
  With neither configured it renders a placeholder pointing at those settings —
  there is deliberately no hand-coded homepage any more.
- `/[...slug]` — any published Page, rendered from `content` or `layout`
- `/blog`, `/blog/[...parts]` — archive + single post; the permalink structure
  is configurable (Settings → Permalinks) and parsed back by the catch-all
- `/contact` — the built-in contact page (also available as a builder block)
- `/feed.xml`, `/sitemap.xml`
- `/preview/template/[id]` — Theme Builder live preview
- `/export/[slug]` — static HTML export of a builder page

`SiteHeader`/`SiteFooter` resolve a Theme Builder template per page via
`resolveSiteTemplate`, falling back to their own hand-coded markup when nothing
matches — so the Theme Builder is always additive, never a hard dependency.

## 8. Admin Dashboard — Routes (`apps/admin`)

- `/login`, `/dashboard` — page/post counts, unread form submissions, new inquiries
- `/pages` — page CRUD, plus "Convert to Builder" for the reserved `/contact` route
- `/builder/[pageId]` — **the visual builder**: canvas iframe, outline tree,
  block palette, property panel (Content / Style / Advanced), animation timeline editor
- `/blog/posts`, `/blog/posts/[id]`, `/blog/categories`, `/blog/tags`
- `/theme-builder`, `/theme-builder/[id]` — header/footer/blog-chrome templates + conditions
- `/menus`, `/footer-links`, `/gallery`, `/faqs`, `/reviews`
- `/form-submissions`, `/form-submissions/[id]`, `/inquiries`
- `/users`, `/settings` (+ `/general`, `/reading`, `/writing`, `/permalinks`),
  `/email-templates`, `/setup-helper`

## 9. Local Development

```bash
npm install
npm run db:generate                      # prisma generate
npm --workspace=@marwa/db run migrate    # or: npx prisma migrate deploy
npm --workspace=@marwa/db run seed       # admin user, settings, home page, primary menu
npm run dev                              # web:3000, admin:3001, api:4000
```

Environment lives in `packages/api/.env` and `packages/db/.env` (see the
matching `.env.example` files). The default local database is `marwa_digital`.

The seeded admin login is `admin@marwadigital.com` / `changeme123` — override
with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, and change it before deploying.

## 10. Known Rough Edges

- `packages/api` has no `eslint.config.*`, so `npm run lint` fails there. The
  web and admin apps also carry pre-existing lint errors (mostly
  `react-hooks/static-components` and `no-explicit-any` inside
  `blockComponents.tsx`).
- `packages/api`'s `start` script (`node dist/server.js`) can't resolve the
  TypeScript-source workspace dependency on `@marwa/builder`. Development uses
  `tsx`; a production deploy needs the builder package built to JS first, or
  the API run under `tsx`.
- `sitemap.ts` and several routes fetch the API at build time, so `next build`
  needs the API reachable.
- Many builder blocks still carry travel-flavoured placeholder copy in their
  `defaultProps` (search `registry.ts` for "Salzburg"). It is inert default
  text — it only appears until you edit the block — but it is there.
