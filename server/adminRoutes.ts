import crypto from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { requireAdmin, type AuthenticatedRequest } from "./auth.js";
import { prisma } from "./db.js";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

function generateInviteCode(): string {
  return crypto.randomBytes(6).toString("base64url").slice(0, 8);
}

export const adminRoutes = express.Router();

adminRoutes.use(requireAdmin);

adminRoutes.get(
  "/invite-codes",
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const codes = await prisma.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { nickname: true } } },
    });

    res.json({
      codes: codes.map((c) => ({
        code: c.code,
        createdAt: c.createdAt.toISOString(),
        createdByNickname: c.createdBy.nickname,
      })),
    });
  }),
);

adminRoutes.post(
  "/invite-codes",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const count = Math.min(Math.max(Number(req.body?.count) || 1, 1), 50);
    const userId = req.userId!;
    const created: { code: string; createdAt: string; createdByNickname: string }[] = [];

    for (let i = 0; i < count; i++) {
      let code = generateInviteCode();
      let attempts = 0;

      while (attempts < 3) {
        try {
          const record = await prisma.inviteCode.create({
            data: { code, createdByUserId: userId },
            include: { createdBy: { select: { nickname: true } } },
          });
          created.push({
            code: record.code,
            createdAt: record.createdAt.toISOString(),
            createdByNickname: record.createdBy.nickname,
          });
          break;
        } catch {
          code = generateInviteCode();
          attempts++;
        }
      }

      if (attempts >= 3) {
        res.status(500).json({ error: `Failed to generate unique code after ${i + 1} entries.` });
        return;
      }
    }

    res.status(201).json({ codes: created });
  }),
);

adminRoutes.delete(
  "/invite-codes/:code",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const deleted = await prisma.inviteCode.deleteMany({ where: { code: req.params.code } });

    if (deleted.count === 0) {
      res.status(404).json({ error: "Invite code not found." });
      return;
    }

    res.json({ deleted: true });
  }),
);

adminRoutes.get(
  "/users",
  asyncHandler(async (_req: AuthenticatedRequest, res) => {
    const users = await prisma.testUser.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    res.json({
      users: users.map((u) => ({
        id: u.id,
        inviteCode: u.inviteCode,
        nickname: u.nickname,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
        lastSeenAt: u.lastSeenAt.toISOString(),
      })),
    });
  }),
);

adminRoutes.patch(
  "/users/:id/role",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const role = req.body?.role;
    if (role !== "admin" && role !== "user") {
      res.status(400).json({ error: "Role must be 'admin' or 'user'." });
      return;
    }

    const updated = await prisma.testUser.updateMany({
      where: { id: req.params.id },
      data: { role },
    });

    if (updated.count === 0) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json({ id: req.params.id, role });
  }),
);

adminRoutes.delete(
  "/users/:id",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (req.params.id === req.userId) {
      res.status(400).json({ error: "You cannot delete your own account." });
      return;
    }

    const deleted = await prisma.testUser.deleteMany({ where: { id: req.params.id } });

    if (deleted.count === 0) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json({ deleted: true });
  }),
);

export async function seedInviteCodes(): Promise<void> {
  const count = await prisma.inviteCode.count();
  if (count > 0) return;

  const envCodes = (process.env.BETA_INVITE_CODES || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  const adminUser = await prisma.testUser.findFirst({
    where: { inviteCode: "alpha2026", nickname: "ziqi" },
  });

  if (adminUser) {
    await prisma.testUser.update({
      where: { id: adminUser.id },
      data: { role: "admin" },
    });
  }

  const systemUserId = adminUser?.id ?? "system";

  for (const code of envCodes) {
    await prisma.inviteCode.upsert({
      where: { code },
      create: { code, createdByUserId: systemUserId },
      update: {},
    });
  }
}
