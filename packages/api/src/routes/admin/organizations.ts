import { Router } from "express";
import { z } from "zod";
import { prisma } from "@marwa/db";
import { formatZodError } from "../../lib/zodError";
import type { AuthedRequest } from "../../lib/auth";

export const adminOrganizationsRouter = Router();

const ORG_ROLES = ["OWNER", "ADMIN", "MEMBER", "CLIENT"] as const;

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "workspace"
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 1;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${slugify(base)}-${suffix}`;
  }
  return slug;
}

/** OWNER/ADMIN-only actions (inviting members, editing branding) — MEMBER/CLIENT can view but not manage. */
async function requireOrgManager(organizationId: string, userId: string) {
  const membership = await prisma.orgMembership.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
  return membership && (membership.role === "OWNER" || membership.role === "ADMIN") ? membership : null;
}

// GET / — every workspace the current user belongs to, with their role in each.
adminOrganizationsRouter.get("/", async (req: AuthedRequest, res) => {
  const memberships = await prisma.orgMembership.findMany({
    where: { userId: req.user!.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(memberships.map((m) => ({ ...m.organization, role: m.role })));
});

const createOrgSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().nullable().optional(),
  primaryColor: z.string().nullable().optional(),
});

// POST / — create a new agency/client workspace; the creator becomes its OWNER.
adminOrganizationsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const slug = await uniqueSlug(parsed.data.name);
  const organization = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug,
      logoUrl: parsed.data.logoUrl ?? undefined,
      primaryColor: parsed.data.primaryColor ?? undefined,
      memberships: { create: { userId: req.user!.id, role: "OWNER" } },
    },
  });
  res.status(201).json({ ...organization, role: "OWNER" });
});

const updateOrgSchema = z.object({
  name: z.string().min(1).optional(),
  logoUrl: z.string().nullable().optional(),
  primaryColor: z.string().nullable().optional(),
});

// PATCH /:id — branding (white-labeling): name/logo/accent color.
adminOrganizationsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = updateOrgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  if (!(await requireOrgManager(req.params.id, req.user!.id))) {
    return res.status(403).json({ error: "Only workspace owners/admins can edit workspace settings" });
  }
  const organization = await prisma.organization.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(organization);
});

// GET /:id/members — the team roster for the workspace switcher's "Manage members" view.
adminOrganizationsRouter.get("/:id/members", async (req: AuthedRequest, res) => {
  const requesterMembership = await prisma.orgMembership.findUnique({
    where: { organizationId_userId: { organizationId: req.params.id, userId: req.user!.id } },
  });
  if (!requesterMembership) return res.status(403).json({ error: "You do not have access to this workspace" });

  const members = await prisma.orgMembership.findMany({
    where: { organizationId: req.params.id },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(members);
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(ORG_ROLES).default("MEMBER"),
});

// POST /:id/members — grant an existing staff account access to this
// workspace. There is no separate client-portal signup flow in this
// codebase (every account, including CLIENT-role members, is still a row in
// the same staff User table gated by requireAdmin) — inviting someone who
// doesn't have an account yet fails with a clear message rather than
// silently creating one, since that account would also need a real
// ADMIN/EDITOR role and password set up by a super-admin first.
adminOrganizationsRouter.post("/:id/members", async (req: AuthedRequest, res) => {
  const parsed = inviteMemberSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });
  if (!(await requireOrgManager(req.params.id, req.user!.id))) {
    return res.status(403).json({ error: "Only workspace owners/admins can invite members" });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.trim().toLowerCase() } });
  if (!user) return res.status(404).json({ error: "No staff account exists with that email yet — create one under Users first" });

  const membership = await prisma.orgMembership.upsert({
    where: { organizationId_userId: { organizationId: req.params.id, userId: user.id } },
    update: { role: parsed.data.role },
    create: { organizationId: req.params.id, userId: user.id, role: parsed.data.role },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
  res.status(201).json(membership);
});

adminOrganizationsRouter.delete("/:id/members/:userId", async (req: AuthedRequest, res) => {
  if (!(await requireOrgManager(req.params.id, req.user!.id))) {
    return res.status(403).json({ error: "Only workspace owners/admins can remove members" });
  }
  await prisma.orgMembership.delete({ where: { organizationId_userId: { organizationId: req.params.id, userId: req.params.userId } } });
  res.status(204).end();
});
