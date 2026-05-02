import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { assertNonEmptyString } from "./validation.js";

const SESSION_DAYS = 90;
const SESSION_DURATION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function isInviteCodeAllowed(
  inviteCode: string,
  configuredCodes = process.env.BETA_INVITE_CODES || "",
): Promise<boolean> {
  const normalizedInviteCode = inviteCode.trim();

  try {
    const prisma = await getPrisma();
    const record = await prisma.inviteCode.findUnique({ where: { code: normalizedInviteCode } });
    if (record) {
      return true;
    }
  } catch {
    // Database unavailable, fall through to env check
  }

  return configuredCodes
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean)
    .includes(normalizedInviteCode);
}

export function validateNickname(value: unknown): string {
  const nickname = assertNonEmptyString(value, "Nickname", 40);

  if (!/^[\p{L}\p{N}_ -]+$/u.test(nickname)) {
    throw new Error("Nickname contains unsupported characters.");
  }

  return nickname;
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createRawSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

async function getPrisma() {
  const { prisma } = await import("./db.js");
  return prisma;
}

export async function createOrResumeBetaSession(inviteCodeInput: unknown, nicknameInput: unknown) {
  const inviteCode = assertNonEmptyString(inviteCodeInput, "Invite code", 80);
  const nickname = validateNickname(nicknameInput);

  if (!(await isInviteCodeAllowed(inviteCode))) {
    throw new Error("Invalid invite code.");
  }

  const prisma = await getPrisma();
  const user = await prisma.testUser.upsert({
    where: { inviteCode_nickname: { inviteCode, nickname } },
    create: { inviteCode, nickname },
    update: { lastSeenAt: new Date() },
  });

  const rawToken = createRawSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.authSession.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  return {
    token: rawToken,
    user: { id: user.id, nickname: user.nickname, role: user.role },
    expiresAt: expiresAt.toISOString(),
  };
}

export async function authenticateBearerToken(token: string): Promise<string | null> {
  const prisma = await getPrisma();
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.userId;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const userId = await authenticateBearerToken(token);
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    req.userId = userId;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(req, res, async () => {
    try {
      const prisma = await getPrisma();
      const user = await prisma.testUser.findUnique({ where: { id: req.userId } });

      if (!user || user.role !== "admin") {
        res.status(403).json({ error: "Admin access required." });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  });
}
