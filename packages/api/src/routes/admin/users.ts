import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma, UserRole } from "@marwa/db";
import type { AuthedRequest } from "../../lib/auth";
import { formatZodError } from "../../lib/zodError";

export const adminUsersRouter = Router();

adminUsersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  res.json(users);
});

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).default(UserRole.EDITOR),
});

adminUsersRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "A user with this email already exists" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
    },
    select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true, createdAt: true },
  });
  res.status(201).json(user);
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

adminUsersRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: formatZodError(parsed.error) });

  if (req.params.id === req.user?.id && parsed.data.active === false) {
    return res.status(400).json({ error: "You cannot deactivate your own account" });
  }

  const { password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true, createdAt: true },
  });
  res.json(user);
});

adminUsersRouter.delete("/:id", async (req: AuthedRequest, res) => {
  if (req.params.id === req.user?.id) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }
  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
