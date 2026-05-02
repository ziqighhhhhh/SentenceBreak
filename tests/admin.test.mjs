import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./data/test.db";

const { prisma } = await import("../dist-server/server/db.js");
const { requireAdmin, type AuthenticatedRequest } = await import("../dist-server/server/auth.js");

const BASE = `http://localhost:${process.env.PORT || 8787}`;

let adminToken = "";
let adminUserId = "";
let regularToken = "";

async function createTestUser(suffix: string, role: string) {
  const inviteCode = `test-admin-${suffix}`;
  const nickname = `tester-${suffix}`;
  await prisma.inviteCode.upsert({
    where: { code: inviteCode },
    create: { code: inviteCode, createdByUserId: "system" },
    update: {},
  });
  const user = await prisma.testUser.upsert({
    where: { inviteCode_nickname: { inviteCode, nickname } },
    create: { inviteCode, nickname, role },
    update: { role },
  });
  const { hashSessionToken, createRawSessionToken } = await import("../dist-server/server/auth.js");
  const rawToken = createRawSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  await prisma.authSession.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
  });
  return { token: rawToken, userId: user.id };
}

test("admin API rejects unauthenticated requests", async () => {
  const res = await fetch(`${BASE}/api/admin/invite-codes`);
  assert.equal(res.status, 401);
});

test("admin API rejects non-admin users", async () => {
  const suffix = randomUUID();
  const { token } = await createTestUser(suffix, "user");
  regularToken = token;

  const res = await fetch(`${BASE}/api/admin/invite-codes`, {
    headers: { Authorization: `Bearer ${regularToken}` },
  });
  assert.equal(res.status, 403);
});

test("admin can list invite codes", async () => {
  const suffix = randomUUID();
  const { token, userId } = await createTestUser(suffix, "admin");
  adminToken = token;
  adminUserId = userId;

  const res = await fetch(`${BASE}/api/admin/invite-codes`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.codes));
});

test("admin can generate invite codes", async () => {
  const res = await fetch(`${BASE}/api/admin/invite-codes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ count: 3 }),
  });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.codes.length, 3);
  for (const c of data.codes) {
    assert.equal(c.createdByNickname.startsWith("tester-"), true);
    assert.equal(typeof c.code, "string");
    assert.equal(c.code.length, 8);
  }
});

test("admin can delete invite codes", async () => {
  const genRes = await fetch(`${BASE}/api/admin/invite-codes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ count: 1 }),
  });
  const { codes } = await genRes.json();
  const code = codes[0].code;

  const delRes = await fetch(`${BASE}/api/admin/invite-codes/${code}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(delRes.status, 200);
});

test("admin can list users", async () => {
  const res = await fetch(`${BASE}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.users));
  const admin = data.users.find((u: { id: string }) => u.id === adminUserId);
  assert.ok(admin);
  assert.equal(admin.role, "admin");
});

test("admin can update user role", async () => {
  const suffix = randomUUID();
  const { userId } = await createTestUser(suffix, "user");

  const res = await fetch(`${BASE}/api/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.role, "admin");
});

test("generate rejects invalid count", async () => {
  const res = await fetch(`${BASE}/api/admin/invite-codes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ count: 100 }),
  });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.codes.length <= 50, true);
});

test("delete nonexistent code returns 404", async () => {
  const res = await fetch(`${BASE}/api/admin/invite-codes/nonexistent`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(res.status, 404);
});
