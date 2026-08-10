# Overnight session — what changed and what's left

## Live URLs

| | URL |
|---|---|
| Public site | https://marwa-digital-web.vercel.app |
| Admin | https://marwa-digital-admin.vercel.app |
| API | https://marwa-digital-api.vercel.app |

Admin login: `jawaddigitalminds@gmail.com` — **change this password** (Settings → Security). It's weak for a live panel.

---

## ⚠️ Two things only you can do

### 1. Media uploads are broken — missing blob token

Uploading an image fails. Cause is confirmed, not guessed: the API's environment has `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY`, but **no `BLOB_READ_WRITE_TOKEN`** — the store is linked but the write credential was never created.

Fix: **Storage → marwa-uploads → `.env.local` tab** (or the store's settings) → copy the `BLOB_READ_WRITE_TOKEN` value → add it to **marwa-digital-api → Settings → Environment Variables** → redeploy the API.

Verify it worked by opening (logged in):
`https://marwa-digital-api.vercel.app/api/admin/media/storage-status`
You want `"mode":"vercel-blob"` and `"writable":true`. Until then it reports exactly what's wrong.

### 2. Scheduled publishing runs once a day

`CRON_SECRET` is set and the endpoint works, but Vercel's Hobby plan caps cron at once daily. For finer scheduling, point a free pinger (cron-job.org) at:
`https://marwa-digital-api.vercel.app/api/cron/run-scheduled-tasks?secret=YOUR_CRON_SECRET`

---

## Pages built

All are **real builder documents** — open any in the visual builder and every section, column and block is editable. Nothing is hard-coded.

| Page | Sections |
|---|---|
| `/home` | 12 |
| `/about` | 10 |
| `/services` | 12 |
| `/case-studies` | 9 |
| `/pricing` | 6 |
| `/contact` | 5 + working form |
| `/insights` | 4 + live post grid |

Plus **6 full blog articles** (1,000+ words each, written for search), 4 categories, and header/footer navigation wired to everything.

Copy is written to rank: real search intent, specific numbers, objection handling. It's placeholder *content* (invented client names and metrics) — swap in your real case studies before promoting the site.

### Design

Rebuilt after your feedback that it looked too plain:

- Asymmetric split heroes with tilted, overlapping photo stacks
- Layered radial-gradient section backgrounds so bands read as lit, not flat
- Glowing feature cards, numbered process steps, scrolling keyword marquees, full-width scroll-revealed statements
- Two-tone headlines with the accent colour carrying the second half

### Animation

Built into the shared components, so it applies everywhere:

- Imagery: scale-in entrance + scroll-scrubbed parallax drift
- Headlines: word-by-word reveal
- Grids: staggered children
- Cards/buttons: hover lift, glow and border transitions

### Regenerating

Pages are generated from code in `packages/api/scripts/site/`. To change content or design, edit the page module and re-run:

```
cd packages/api
npx tsx scripts/site/seed.mts --api https://marwa-digital-api.vercel.app --email <you> --password <pw>
```

Idempotent — updates existing pages by slug, never duplicates. `seedPosts.mts` and `seedNav.mts` do the same for articles and menus. **Any edits you make in the builder will be overwritten if you re-run these**, so once you start editing by hand, stop using the seeder for that page.

---

## Bugs found and fixed

Deployment was blocked by five separate causes, each hiding the next:

1. **`sanitize-html` pulled in an ESM-only dependency** — crashed the serverless function on every request. Pinned `htmlparser2` to a CommonJS build.
2. **Prisma client never generated on a fresh checkout** — `@marwa/db` had no types, so builds failed. Added a `postinstall` hook.
3. **`builds` key in `vercel.json` skipped the build script entirely** — deployment shipped no function (404s). Moved to the zero-config `api/` convention.
4. **Vercel's Express preset hijacked the build** — bundled the raw source and externalised workspace packages. Switched the preset to "Other".
5. **Vercel scans `api/` *before* running builds** — a generated entrypoint was invisible, so zero functions deployed. The entrypoint is now committed and the build writes the bundle over it.

Then, found during the audit:

6. **All dependencies were externalised** — several ship ESM-only and crashed at runtime (`otplib`, `@vercel/blob`, `zod`, others queued behind it). Now bundled and down-converted, killing that whole class of failure.
7. **Turborepo was stripping build-time env vars** — `ADMIN_URL` and `REVALIDATE_SECRET` were set correctly on Vercel and silently discarded, so deployments were configured for localhost. Declared them in `turbo.json`.
8. **Builder canvas was blank** — three causes: the admin's CSP read `WEB_URL` while every component read `NEXT_PUBLIC_WEB_URL`; there was no `font-src` so Google Fonts were blocked; and the site's `frame-ancestors` only allowed localhost. All fixed, and the admin origin is now derived automatically so it can't break again.
9. **Section backgrounds were invisible** — the Section `background` prop overrides `style.background`, so every gradient I set was being discarded. This was also the cause of the width problem: `contentWidth: "boxed"` clamps the element *including its background*, so bands weren't full-bleed. Sections are now a full-bleed outer wrapper around a boxed inner container.
10. **A sitemap prerender could fail the entire site build** — `/sitemap.xml` fetched the API with no error handling, so a brief API outage during deploy took the whole build down. Now degrades gracefully.
11. **`turbo.json` had an invalid `"//"` comment key** — my own mistake, introduced in #7 and caught in the audit. It made every `turbo run` fail to parse. Removed.
12. **Opaque upload errors** — a failed upload returned "Internal server error". Now returns the actual cause, plus a `storage-status` diagnostic endpoint.

---

## Audit results

- **Typecheck**: clean across all 4 workspaces
- **Lint**: 0 errors, 0 warnings across all 5 packages
- **Tests**: 59/59 passing
- **Public API**: 12/12 endpoints returning 200
- **Admin API**: 28/28 endpoints correct (the two 404s are routers with no index route by design — their real endpoints all pass)
- **Public pages**: 11/11 returning 200, including all 6 blog articles
- **Admin pages**: 27/27 returning 200
- **Contact form**: verified end-to-end — submission creates an inquiry, auto-creates a CRM contact, and fires the workflow trigger. Test data cleaned up.
- **Cache clearing, CORS, auth, workspace scoping**: all verified working

---

## Known issues worth your attention

**Blog archive and header nav render empty in raw HTML.** Both fetch client-side, so real visitors see them fine — but search engines and social preview crawlers see an empty page. For a site whose whole pitch is SEO, `/blog` should render its posts server-side. Worth fixing; it's a change to `TemplateA`/`SiteHeader`, not a quick config toggle, so I didn't attempt it unattended.

**Content is placeholder.** Client names, metrics and testimonials are invented. Replace before promoting the site.

**No custom domain yet.** Everything is on `*.vercel.app`. When you add a real domain, update `WEB_URL`, `ADMIN_URL` and `NEXT_PUBLIC_*` variables to match.
