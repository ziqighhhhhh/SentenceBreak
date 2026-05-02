import assert from "node:assert/strict";
import test from "node:test";
import {
  hashSessionToken,
  isInviteCodeAllowed,
  validateNickname,
} from "../dist-server/server/auth.js";

test("accepts invite codes from comma-separated environment list", async () => {
  assert.equal(await isInviteCodeAllowed("alpha2026", "alpha2026,beta2026"), true);
  assert.equal(await isInviteCodeAllowed("wrong", "alpha2026,beta2026"), false);
});

test("validates nickname", () => {
  assert.equal(validateNickname(" Alice "), "Alice");
  assert.throws(() => validateNickname(""));
  assert.throws(() => validateNickname("a".repeat(41)));
});

test("hashes tokens without returning the raw token", () => {
  const hash = hashSessionToken("secret-token");
  assert.notEqual(hash, "secret-token");
  assert.equal(hash.length, 64);
});
