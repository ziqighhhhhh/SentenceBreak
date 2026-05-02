import express, { type NextFunction, type Request, type Response } from "express";
import { createOrResumeBetaSession, requireAuth, type AuthenticatedRequest } from "./auth.js";
import { prisma } from "./db.js";
import { saveLearningSession } from "./learningRepository.js";
import { assertMasteryStatus } from "./validation.js";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

function getAuthenticatedUserId(req: AuthenticatedRequest): string {
  if (!req.userId) {
    throw new Error("Authenticated user is missing.");
  }

  return req.userId;
}

function parseJson(value: string): unknown {
  return JSON.parse(value);
}

export const learningRoutes = express.Router();

learningRoutes.post(
  "/test-users/session",
  asyncHandler(async (req, res) => {
    try {
      const session = await createOrResumeBetaSession(req.body?.inviteCode, req.body?.nickname);
      res.json(session);
    } catch {
      res.status(400).json({ error: "Unable to enter beta." });
    }
  }),
);

learningRoutes.post(
  "/learning-sessions",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    try {
      const session = await saveLearningSession(getAuthenticatedUserId(req), req.body?.breakdown);
      res.status(201).json({ id: session.id, saved: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save learning session.";
      res.status(400).json({ error: message });
    }
  }),
);

learningRoutes.get(
  "/learning-sessions",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const sessions = await prisma.learningSession.findMany({
      where: { userId: getAuthenticatedUserId(req) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        sourceSentence: session.sourceSentence,
        sourceLabel: session.sourceLabel,
        totalWords: session.totalWords,
        createdAt: session.createdAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
        breakdown: parseJson(session.breakdownJson),
      })),
    });
  }),
);

learningRoutes.get(
  "/vocabulary",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const entries = await prisma.vocabularyEntry.findMany({
      where: { userId: getAuthenticatedUserId(req) },
      include: {
        senses: {
          orderBy: { createdAt: "asc" },
        },
        occurrences: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { lastSeenAt: "desc" },
      take: 200,
    });

    res.json({
      entries: entries.map((entry) => ({
        id: entry.id,
        text: entry.text,
        normalizedText: entry.normalizedText,
        type: entry.type,
        phonetic: entry.phonetic,
        pronunciationText: entry.pronunciationText,
        synonyms: parseJson(entry.synonymsJson),
        antonyms: parseJson(entry.antonymsJson),
        masteryStatus: entry.masteryStatus,
        occurrenceCount: entry.occurrenceCount,
        firstSeenAt: entry.firstSeenAt.toISOString(),
        lastSeenAt: entry.lastSeenAt.toISOString(),
        senses: entry.senses.map((sense) => ({
          id: sense.id,
          senseKey: sense.senseKey,
          meaningInContext: sense.meaningInContext,
          dictionaryMeaning: sense.dictionaryMeaning,
          usageNote: sense.usageNote,
          example: sense.example,
          createdAt: sense.createdAt.toISOString(),
        })),
        occurrences: entry.occurrences.map((occurrence) => ({
          id: occurrence.id,
          sessionId: occurrence.sessionId,
          stepIndex: occurrence.stepIndex,
          sentenceText: occurrence.sentenceText,
          createdAt: occurrence.createdAt.toISOString(),
        })),
      })),
    });
  }),
);

learningRoutes.patch(
  "/vocabulary/:id/mastery",
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    let masteryStatus: "new" | "reviewing" | "mastered";

    try {
      masteryStatus = assertMasteryStatus(req.body?.masteryStatus);
    } catch {
      res.status(400).json({ error: "Unable to update mastery status." });
      return;
    }

    const updated = await prisma.vocabularyEntry.updateMany({
      where: { id: req.params.id, userId: getAuthenticatedUserId(req) },
      data: { masteryStatus },
    });

    if (updated.count === 0) {
      res.status(404).json({ error: "Vocabulary entry not found." });
      return;
    }

    res.json({ id: req.params.id, masteryStatus });
  }),
);
