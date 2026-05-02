import dotenv from "dotenv";
import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { learningRoutes } from "./server/learningRoutes.js";
import { adminRoutes, seedInviteCodes } from "./server/adminRoutes.js";
import { resolveClientDistPath } from "./server/paths.js";
import { formatSseEvent } from "./server/sse.js";
import { generateBreakdownOnServer, generateComplexSentenceOnServer, streamBreakdownOnServer, streamComplexSentenceOnServer } from "./server/webai.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = resolveClientDistPath(__dirname);
const rateWindowMs = 60_000;
const maxRequestsPerWindow = Number(process.env.RATE_LIMIT_PER_MINUTE || 20);
const requestCounts = new Map<string, { count: number; resetAt: number }>();
const chineseTextPattern = /[\u3400-\u9FFF\uF900-\uFAFF]/;
const breakdownProgressMessages = {
  validating: "Validating the sentence...",
  sending: "Sending the sentence to the analyzer...",
  streaming: "Receiving the streamed analysis...",
  finalizing: "Finalizing the breakdown...",
  complete: "Analysis complete.",
} as const;

if (process.env.TRUST_PROXY) {
  app.set("trust proxy", process.env.TRUST_PROXY);
}

app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
  next();
});

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const entry = requestCounts.get(key);

  if (!entry || entry.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + rateWindowMs });
    next();
    return;
  }

  if (entry.count >= maxRequestsPerWindow) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }

  requestCounts.set(key, { ...entry, count: entry.count + 1 });
  next();
}

function readSentence(body: unknown): string {
  if (!body || typeof body !== "object" || !("sentence" in body)) {
    throw new Error("Missing sentence.");
  }

  const sentence = (body as { sentence: unknown }).sentence;
  if (typeof sentence !== "string") {
    throw new Error("Sentence must be a string.");
  }

  const trimmed = sentence.trim();
  if (trimmed.length < 1) {
    throw new Error("Sentence is required.");
  }

  if (trimmed.length > 3000) {
    throw new Error("Sentence is too long. Please keep it under 3000 characters.");
  }

  if (chineseTextPattern.test(trimmed)) {
    throw new Error("Sentence must be written in English and cannot include Chinese text.");
  }

  return trimmed;
}

app.use("/api", rateLimit, learningRoutes);
app.use("/api/admin", rateLimit, adminRoutes);

app.post("/api/breakdown", rateLimit, async (req: Request, res: Response) => {
  try {
    const sentence = readSentence(req.body);
    const breakdown = await generateBreakdownOnServer(sentence);
    res.json(breakdown);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate breakdown.";
    const status = message.includes("required") || message.includes("string") || message.includes("too long") || message.includes("Chinese text") ? 400 : 502;
    res.status(status).json({ error: message });
  }
});

app.post("/api/sentence", rateLimit, async (_req: Request, res: Response) => {
  try {
    const sentence = await generateComplexSentenceOnServer();
    res.json({ sentence });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate sentence.";
    res.status(502).json({ error: message });
  }
});

app.post("/api/breakdown/stream", rateLimit, async (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const sentence = readSentence(req.body);
    let hasReceivedStreamChunk = false;

    const sendProgress = (message: string) => {
      res.write(formatSseEvent("progress", { message }));
    };

    sendProgress(breakdownProgressMessages.validating);
    sendProgress(breakdownProgressMessages.sending);

    const breakdown = await streamBreakdownOnServer(sentence, () => {
      if (!hasReceivedStreamChunk) {
        hasReceivedStreamChunk = true;
        sendProgress(breakdownProgressMessages.streaming);
      }
    });

    sendProgress(breakdownProgressMessages.finalizing);
    sendProgress(breakdownProgressMessages.complete);
    res.write(formatSseEvent("result", { breakdown }));
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate breakdown.";
    res.write(formatSseEvent("error", { error: message }));
    res.end();
  }
});

app.post("/api/sentence/stream", rateLimit, async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const stream = streamComplexSentenceOnServer();
    let finalSentence = "";

    while (true) {
      const { value, done } = await stream.next();

      if (done) {
        finalSentence = value;
        break;
      }

      res.write(formatSseEvent("token", { text: value }));
    }

    res.write(formatSseEvent("done", { sentence: finalSentence }));
    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate sentence.";
    res.write(formatSseEvent("error", { error: message }));
    res.end();
  }
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use(express.static(distPath, {
  index: false,
  maxAge: "1y",
  immutable: true,
}));

app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled server error:", err.message);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(port, async () => {
  console.log(`SentenceBreak server listening on http://0.0.0.0:${port}`);
  try {
    await seedInviteCodes();
    console.log("Invite codes seeded.");
  } catch (error) {
    console.error("Seed failed:", error instanceof Error ? error.message : error);
  }
});
