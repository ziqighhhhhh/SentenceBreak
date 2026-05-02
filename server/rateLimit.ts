import type { NextFunction, Request, Response } from "express";

const rateLimitMessage = "Too many requests. Please try again later.";

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  now?: () => number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function createRateLimit({
  windowMs,
  maxRequests,
  keyPrefix,
  now = Date.now,
}: RateLimitOptions) {
  const requestCounts = new Map<string, RateLimitEntry>();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const key = `${keyPrefix}:${req.ip || "unknown"}`;
    const currentTime = now();
    const entry = requestCounts.get(key);

    if (!entry || entry.resetAt <= currentTime) {
      requestCounts.set(key, { count: 1, resetAt: currentTime + windowMs });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      res.status(429).json({ error: rateLimitMessage });
      return;
    }

    requestCounts.set(key, { ...entry, count: entry.count + 1 });
    next();
  };
}
