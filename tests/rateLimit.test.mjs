import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimit } from "../dist-server/server/rateLimit.js";

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function runMiddleware(middleware, ip = "127.0.0.1") {
  const req = { ip };
  const res = createResponse();
  let nextCalled = false;

  middleware(req, res, () => {
    nextCalled = true;
  });

  return { nextCalled, res };
}

test("rate limit blocks requests beyond the configured window allowance", () => {
  const limiter = createRateLimit({
    windowMs: 60_000,
    maxRequests: 2,
    keyPrefix: "api",
    now: () => 1000,
  });

  assert.equal(runMiddleware(limiter).nextCalled, true);
  assert.equal(runMiddleware(limiter).nextCalled, true);

  const blocked = runMiddleware(limiter);
  assert.equal(blocked.nextCalled, false);
  assert.equal(blocked.res.statusCode, 429);
  assert.deepEqual(blocked.res.body, { error: "Too many requests. Please try again later." });
});

test("rate limit scopes counters by prefix so admin and public APIs do not share allowance", () => {
  const options = { windowMs: 60_000, maxRequests: 1, now: () => 1000 };
  const publicLimiter = createRateLimit({ ...options, keyPrefix: "api" });
  const adminLimiter = createRateLimit({ ...options, keyPrefix: "admin" });

  assert.equal(runMiddleware(publicLimiter).nextCalled, true);
  assert.equal(runMiddleware(publicLimiter).res.statusCode, 429);
  assert.equal(runMiddleware(adminLimiter).nextCalled, true);
});

test("rate limit resets after the configured window", () => {
  let currentTime = 1000;
  const limiter = createRateLimit({
    windowMs: 60_000,
    maxRequests: 1,
    keyPrefix: "api",
    now: () => currentTime,
  });

  assert.equal(runMiddleware(limiter).nextCalled, true);
  assert.equal(runMiddleware(limiter).res.statusCode, 429);

  currentTime = 61_000;
  assert.equal(runMiddleware(limiter).nextCalled, true);
});
