import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  createOrResumeBetaSession,
  hashSessionToken,
  isInviteCodeAllowed,
  validateNickname,
} from "../dist-server/server/auth.js";

process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./data/test.db";

test("accepts invite codes from comma-separated environment list", async () => {
  assert.equal(await isInviteCodeAllowed("alpha2026", "alpha2026,beta2026"), true);
  assert.equal(await isInviteCodeAllowed("wrong", "alpha2026,beta2026"), false);
});

test("validates nickname", () => {
  assert.equal(validateNickname(" Alice "), "alice");
  assert.equal(validateNickname("ALICE Smith"), "alice smith");
  assert.equal(validateNickname("张三"), "张三");
  assert.throws(() => validateNickname(""));
  assert.throws(() => validateNickname("a".repeat(41)));
});

test("resumes the same invite code for the same normalized nickname", async () => {
  const inviteCode = `auth-${randomUUID()}`;
  process.env.BETA_INVITE_CODES = inviteCode;

  const firstSession = await createOrResumeBetaSession(inviteCode, "ALICE");
  const secondSession = await createOrResumeBetaSession(inviteCode, "alice");

  assert.equal(firstSession.user.id, secondSession.user.id);
  assert.equal(firstSession.user.nickname, "alice");
  assert.equal(secondSession.user.nickname, "alice");
});

test("rejects a different nickname for an already claimed invite code", async () => {
  const inviteCode = `auth-${randomUUID()}`;
  process.env.BETA_INVITE_CODES = inviteCode;

  await createOrResumeBetaSession(inviteCode, "张三");
  await assert.rejects(
    () => createOrResumeBetaSession(inviteCode, "李四"),
    /Invite code has already been claimed\./,
  );
});

test("hashes tokens without returning the raw token", () => {
  const hash = hashSessionToken("secret-token");
  assert.notEqual(hash, "secret-token");
  assert.equal(hash.length, 64);
});
