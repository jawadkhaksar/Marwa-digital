import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Minimum viable content for a fresh install: one admin login, the
 * SiteSettings singleton, a homepage Page wired up as Reading Settings'
 * homepage, and a primary menu pointing at it. Everything is upserted on a
 * stable key so re-running the seed never duplicates rows.
 */
async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@marwadigital.com";
  const adminPasswordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "changeme123", 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      name: "Marwa Digital Admin",
      role: UserRole.ADMIN,
    },
  });

  // Defaults for every column live in schema.prisma — creating the row with
  // only its id is what makes them apply, so the seed never restates them.
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const home = await prisma.page.upsert({
    where: { slug: "home" },
    update: {},
    create: {
      slug: "home",
      title: "Home",
      editorMode: "BUILDER",
      // An empty node tree, not null: the builder opens straight onto an
      // editable canvas instead of the "this page has no layout" fallback.
      // `nodes` is the actual LayoutDocument field name (see
      // packages/builder/src/types.ts) — NOT `blocks`.
      layout: { version: 1, nodes: [] },
      published: true,
    },
  });

  await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: { homepageDisplay: "static", homepagePageSlug: home.slug },
  });

  // A working /contact out of the box — a plain Page like any other (not a
  // hand-coded route with a reserved slug), so it shows up in the admin's
  // Pages list and can be edited or deleted normally from day one.
  await prisma.page.upsert({
    where: { slug: "contact" },
    update: {},
    create: {
      slug: "contact",
      title: "Contact",
      editorMode: "BUILDER",
      layout: {
        version: 1,
        nodes: [
          {
            id: "contact-section",
            type: "Section",
            props: {},
            style: { paddingTop: "64px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px" },
            children: [
              { id: "contact-heading", type: "Heading", props: { text: "Contact", level: "h1", align: "center" } },
              { id: "contact-form", type: "ContactFormBlock", props: {} },
            ],
          },
        ],
      },
      published: true,
    },
  });

  const existingMenu = await prisma.menu.findFirst({ where: { name: "Primary" } });
  const menu =
    existingMenu ??
    (await prisma.menu.create({
      data: {
        name: "Primary",
        showInHeader: true,
        items: {
          create: [
            { label: "Home", href: "/", order: 0 },
            { label: "Blog", href: "/blog", order: 1 },
            { label: "Contact", href: "/contact", order: 2 },
          ],
        },
      },
    }));

  await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: { primaryMenuId: menu.id },
  });

  console.log(`Seeded: admin (${adminEmail}), site settings, home page, contact page, primary menu.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
