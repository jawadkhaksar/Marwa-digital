// One-off data migration: copies existing MenuLink rows into a new "Main
// Menu" (Menu + flat top-level MenuItem rows, no nesting — that's exactly
// what the old flat MenuLink data represents), then sets it as the site's
// primary menu. Safe to re-run: skips if a menu named "Main Menu" already
// exists rather than creating duplicates.
import { prisma } from "../src/index";

async function main() {
  const existingMenuLinks = await prisma.menuLink.findMany({ orderBy: { order: "asc" } });
  console.log(`Found ${existingMenuLinks.length} existing MenuLink row(s).`);

  let mainMenu = await prisma.menu.findFirst({ where: { name: "Main Menu" } });
  if (mainMenu) {
    console.log(`"Main Menu" already exists (id=${mainMenu.id}) — skipping creation, not touching its items.`);
  } else {
    mainMenu = await prisma.menu.create({ data: { name: "Main Menu" } });
    console.log(`Created "Main Menu" (id=${mainMenu.id}).`);

    for (const link of existingMenuLinks) {
      await prisma.menuItem.create({
        data: {
          menuId: mainMenu.id,
          label: link.label,
          href: link.href,
          openInNewTab: link.openInNewTab,
          active: link.active,
          order: link.order,
        },
      });
    }
    console.log(`Copied ${existingMenuLinks.length} item(s) into "Main Menu".`);
  }

  const settings = await prisma.siteSettings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });
  if (!settings.primaryMenuId) {
    await prisma.siteSettings.update({ where: { id: "singleton" }, data: { primaryMenuId: mainMenu.id } });
    console.log(`Set SiteSettings.primaryMenuId = ${mainMenu.id}.`);
  } else {
    console.log(`SiteSettings.primaryMenuId already set (${settings.primaryMenuId}) — leaving it alone.`);
  }

  const finalCount = await prisma.menuItem.count({ where: { menuId: mainMenu.id } });
  console.log(`Verification: "Main Menu" now has ${finalCount} item(s) (source had ${existingMenuLinks.length}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
