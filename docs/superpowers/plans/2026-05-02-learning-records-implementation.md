# Learning Records Implementation Plan

> **For AI agents:** Use `superpowers:subagent-driven-development` when running this plan with delegated task workers, or `superpowers:executing-plans` when executing inline. Track every step with `- [ ]` checkboxes. Follow TDD, keep commits small, and do not modify unrelated files.

**Goal:** Upgrade SentenceBreak into an external-reading long-sentence intensive reading tool with vocabulary insights and cloud learning records for beta users.

**Architecture:** Keep the current React + Express flow. Add a SQLite-backed persistence layer, lightweight invite-code beta auth, enhanced AI breakdown schema, async learning-session saving, and a My Learning view. Existing sentence analysis remains usable even if saving fails.

**Tech Stack:** React 19, Vite, TypeScript, Express, SQLite, Prisma, Server-Sent Events, browser `SpeechSynthesis`, Node test runner.

---

## File Structure

Create:

- `prisma/schema.prisma` - database schema for beta users, sessions, vocabulary entries, senses, occurrences, and auth sessions.
- `server/db.ts` - Prisma client singleton.
- `server/validation.ts` - schema-style runtime validation helpers for auth, breakdowns, vocabulary insights, and mastery updates.
- `server/auth.ts` - invite-code login, token hashing, bearer-token authentication.
- `server/vocabulary.ts` - normalization, sense-key helpers, and duplicate handling.
- `server/learningRepository.ts` - learning-session persistence and vocabulary upsert logic.
- `server/learningRoutes.ts` - Express routes for beta auth, sessions, vocabulary, and mastery updates.
- `tests/vocabulary.test.mjs` - vocabulary normalization and duplicate behavior tests.
- `tests/auth.test.mjs` - invite-code and token behavior tests.
- `tests/learningRepository.test.mjs` - database persistence tests.
- `src/components/BetaLoginView.tsx` - invite-code and nickname entry screen.
- `src/components/VocabularyInsightList.tsx` - compact and expandable vocabulary insight cards.
- `src/components/MyLearningView.tsx` - sentence history and vocabulary tabs.
- `src/services/learningService.ts` - frontend client helpers for auth, save, list, and mastery APIs.
- `src/hooks/useBetaSession.ts` - frontend beta session state and local token persistence.
- `src/hooks/useLearningRecords.ts` - save status, history loading, vocabulary loading, and mastery updates.

Modify:

- `package.json` - add Prisma, migration, and test scripts.
- `.env.example` - document `DATABASE_URL` and `BETA_INVITE_CODES`.
- `.gitignore` - ignore SQLite database files if not already covered.
- `server.ts` - mount learning routes and keep existing analysis routes intact.
- `server/prompt.ts` - request vocabulary insights in the breakdown JSON.
- `server/webai.ts` - validate enhanced breakdown shape and preserve compatibility.
- `src/types.ts` - add `VocabularyInsight`, beta user, learning-session, and vocabulary record types.
- `src/App.tsx` - gate app behind beta login and add My Learning navigation.
- `src/hooks/useSentenceBreakdown.ts` - expose save hooks and keep analysis independent from persistence.
- `src/components/StepCard.tsx` - render vocabulary insights per step.
- `src/components/SummaryView.tsx` - render this-session vocabulary summary and save status.
- `tests/openaiStream.test.mjs` - keep existing tests passing and import any moved helpers if needed.
- `README.md` - document beta login, learning records, database setup, and test commands.

---

## Task 1: Add Database And Prisma Baseline

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.gitignore`
- Create: `prisma/schema.prisma`
- Create: `server/db.ts`

- [ ] **Step 1: Add failing database setup expectation**

Run:

```bash
npm run db:generate
```

Expected: FAIL because `db:generate` does not exist yet.

- [ ] **Step 2: Add dependencies and scripts**

Install:

```bash
npm install @prisma/client
npm install -D prisma
```

Update `package.json` scripts:

```json
{
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:push": "prisma db push"
}
```

- [ ] **Step 3: Define Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model TestUser {
  id        String   @id @default(cuid())
  inviteCode String
  nickname String
  createdAt DateTime @default(now())
  lastSeenAt DateTime @updatedAt
  authSessions AuthSession[]
  learningSessions LearningSession[]
  vocabularyEntries VocabularyEntry[]

  @@unique([inviteCode, nickname])
}

model AuthSession {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      TestUser @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model LearningSession {
  id             String   @id @default(cuid())
  userId         String
  sourceSentence String
  sourceLabel    String
  breakdownJson  String
  totalWords     Int
  createdAt      DateTime @default(now())
  completedAt    DateTime?
  user           TestUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  occurrences    VocabularyOccurrence[]
}

model VocabularyEntry {
  id                String   @id @default(cuid())
  userId            String
  text              String
  normalizedText    String
  type              String
  phonetic          String?
  pronunciationText String?
  synonymsJson      String
  antonymsJson      String
  masteryStatus     String   @default("new")
  occurrenceCount   Int      @default(0)
  firstSeenAt       DateTime @default(now())
  lastSeenAt        DateTime @default(now())
  user              TestUser @relation(fields: [userId], references: [id], onDelete: Cascade)
  senses            VocabularySense[]
  occurrences       VocabularyOccurrence[]

  @@unique([userId, normalizedText])
}

model VocabularySense {
  id                String   @id @default(cuid())
  entryId           String
  senseKey          String
  meaningInContext  String
  dictionaryMeaning String?
  usageNote         String
  example           String?
  createdAt         DateTime @default(now())
  entry             VocabularyEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  occurrences       VocabularyOccurrence[]

  @@unique([entryId, senseKey])
}

model VocabularyOccurrence {
  id           String   @id @default(cuid())
  entryId      String
  senseId      String
  sessionId    String
  stepIndex    Int
  sentenceText String
  createdAt    DateTime @default(now())
  entry         VocabularyEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)
  sense         VocabularySense @relation(fields: [senseId], references: [id], onDelete: Cascade)
  session       LearningSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@unique([senseId, sessionId, stepIndex])
}
```

- [ ] **Step 4: Add database client**

Create `server/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 5: Document environment and ignored database files**

Add to `.env.example`:

```env
DATABASE_URL="file:./data/sentencebreak.db"
BETA_INVITE_CODES="alpha2026,beta2026"
```

Add to `.gitignore`:

```gitignore
data/*.db
data/*.db-journal
data/*.sqlite
```

- [ ] **Step 6: Verify generation**

Run:

```bash
npm run db:generate
npm run build:server
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore prisma/schema.prisma server/db.ts
git commit -m "feat: add prisma database baseline"
```

---

## Task 2: Implement Validation And Vocabulary Normalization

**Files:**
- Create: `server/validation.ts`
- Create: `server/vocabulary.ts`
- Create: `tests/vocabulary.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing vocabulary tests**

Create `tests/vocabulary.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSenseKey,
  normalizeVocabularyText,
  shouldKeepInsight,
} from "../dist-server/server/vocabulary.js";

test("normalizes case, punctuation, and whitespace", () => {
  assert.equal(normalizeVocabularyText("  Fueled   concerns. "), "fuel concerns");
});

test("creates stable sense keys", () => {
  assert.equal(buildSenseKey("fuel concerns", "加剧担忧"), "fuel concerns::加剧担忧");
});

test("drops duplicate insights with same normalized text and sense", () => {
  const seen = new Set(["fuel concerns::加剧担忧"]);
  assert.equal(
    shouldKeepInsight({ normalizedText: "fuel concerns", senseKey: "fuel concerns::加剧担忧" }, seen),
    false,
  );
});

test("keeps same expression with a different sense", () => {
  const seen = new Set(["fuel::燃料"]);
  assert.equal(
    shouldKeepInsight({ normalizedText: "fuel", senseKey: "fuel::加剧" }, seen),
    true,
  );
});
```

- [ ] **Step 2: Add test script entry**

Update `npm test` to include the new test after server build:

```json
"test": "npm run build:server && node tests/openaiStream.test.mjs && node tests/vocabulary.test.mjs"
```

- [ ] **Step 3: Run failing test**

Run:

```bash
npm test
```

Expected: FAIL because `server/vocabulary.ts` is missing.

- [ ] **Step 4: Implement vocabulary helpers**

Create `server/vocabulary.ts`:

```ts
export interface InsightIdentity {
  normalizedText: string;
  senseKey: string;
}

const SIMPLE_LEMMA_REPLACEMENTS = [
  { pattern: /\bfueled\b/g, replacement: "fuel" },
  { pattern: /\bfueling\b/g, replacement: "fuel" },
  { pattern: /\bfuels\b/g, replacement: "fuel" },
];

export function normalizeVocabularyText(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^[\s"'`.,;:!?()[\]{}]+|[\s"'`.,;:!?()[\]{}]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return SIMPLE_LEMMA_REPLACEMENTS.reduce(
    (current, rule) => current.replace(rule.pattern, rule.replacement),
    cleaned,
  );
}

export function normalizeMeaning(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

export function buildSenseKey(normalizedText: string, meaningInContext: string): string {
  return `${normalizedText}::${normalizeMeaning(meaningInContext)}`;
}

export function shouldKeepInsight(identity: InsightIdentity, seen: ReadonlySet<string>): boolean {
  return !seen.has(identity.senseKey);
}
```

- [ ] **Step 5: Implement validation helpers**

Create `server/validation.ts` with functions:

```ts
export function assertNonEmptyString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required.`);
  }
  if (trimmed.length > maxLength) {
    throw new Error(`${field} is too long.`);
  }
  return trimmed;
}

export function assertStringArray(value: unknown, field: string, maxItems: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  if (value.length > maxItems) {
    throw new Error(`${field} has too many items.`);
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export function assertMasteryStatus(value: unknown): "new" | "reviewing" | "mastered" {
  if (value === "new" || value === "reviewing" || value === "mastered") {
    return value;
  }
  throw new Error("Invalid mastery status.");
}
```

- [ ] **Step 6: Verify**

Run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json server/validation.ts server/vocabulary.ts tests/vocabulary.test.mjs
git commit -m "feat: add vocabulary normalization helpers"
```

---

## Task 3: Implement Beta Auth

**Files:**
- Create: `server/auth.ts`
- Create: `tests/auth.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing auth tests**

Create `tests/auth.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  hashSessionToken,
  isInviteCodeAllowed,
  validateNickname,
} from "../dist-server/server/auth.js";

test("accepts invite codes from comma-separated environment list", () => {
  assert.equal(isInviteCodeAllowed("alpha2026", "alpha2026,beta2026"), true);
  assert.equal(isInviteCodeAllowed("wrong", "alpha2026,beta2026"), false);
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
```

- [ ] **Step 2: Add auth test to script**

Update:

```json
"test": "npm run build:server && node tests/openaiStream.test.mjs && node tests/vocabulary.test.mjs && node tests/auth.test.mjs"
```

- [ ] **Step 3: Run failing test**

Run:

```bash
npm test
```

Expected: FAIL because `server/auth.ts` is missing.

- [ ] **Step 4: Implement auth helpers and repository functions**

Create `server/auth.ts`:

```ts
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "./db.js";
import { assertNonEmptyString } from "./validation.js";

const SESSION_DAYS = 90;

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function isInviteCodeAllowed(inviteCode: string, configuredCodes = process.env.BETA_INVITE_CODES || ""): boolean {
  return configuredCodes
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean)
    .includes(inviteCode.trim());
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

export async function createOrResumeBetaSession(inviteCodeInput: unknown, nicknameInput: unknown) {
  const inviteCode = assertNonEmptyString(inviteCodeInput, "Invite code", 80);
  const nickname = validateNickname(nicknameInput);

  if (!isInviteCodeAllowed(inviteCode)) {
    throw new Error("Invalid invite code.");
  }

  const user = await prisma.testUser.upsert({
    where: { inviteCode_nickname: { inviteCode, nickname } },
    create: { inviteCode, nickname },
    update: { lastSeenAt: new Date() },
  });

  const rawToken = createRawSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.authSession.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  return {
    token: rawToken,
    user: { id: user.id, nickname: user.nickname },
    expiresAt: expiresAt.toISOString(),
  };
}

export async function authenticateBearerToken(token: string): Promise<string | null> {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
  });
  if (!session || session.expiresAt <= new Date()) {
    return null;
  }
  return session.userId;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  const userId = await authenticateBearerToken(token);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  req.userId = userId;
  next();
}
```

- [ ] **Step 5: Verify**

Run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json server/auth.ts tests/auth.test.mjs
git commit -m "feat: add beta invite authentication"
```

---

## Task 4: Implement Learning Repository

**Files:**
- Create: `server/learningRepository.ts`
- Create: `tests/learningRepository.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing repository test**

Create `tests/learningRepository.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { saveLearningSession } from "../dist-server/server/learningRepository.js";

const prisma = new PrismaClient();

test("saves a learning session and upserts vocabulary entries", async () => {
  const user = await prisma.testUser.create({
    data: { inviteCode: `test-${Date.now()}`, nickname: `repo-${Date.now()}` },
  });

  const breakdown = {
    sourceLabel: "External Reading",
    targetSentence: "The report fueled concerns.",
    totalSentences: 1,
    totalWords: 4,
    steps: [
      {
        pageNumber: 1,
        english: "The report fueled concerns.",
        chinese: "这份报告加剧了担忧。",
        label: "1 基础句",
        explanation: "Build the main clause.",
        vocabularyInsights: [
          {
            text: "fueled concerns",
            normalizedText: "fuel concerns",
            senseKey: "fuel concerns::加剧担忧",
            type: "collocation",
            meaningInContext: "加剧担忧",
            usageNote: "Fuel is used as a verb in news English.",
            synonyms: ["heighten worries"],
            antonyms: ["ease concerns"],
          },
        ],
      },
    ],
  };

  const saved = await saveLearningSession(user.id, breakdown);
  assert.equal(saved.sourceSentence, "The report fueled concerns.");

  const entries = await prisma.vocabularyEntry.findMany({ where: { userId: user.id } });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].occurrenceCount, 1);

  await saveLearningSession(user.id, breakdown);
  const entriesAfterSecondSave = await prisma.vocabularyEntry.findMany({ where: { userId: user.id } });
  assert.equal(entriesAfterSecondSave.length, 1);
  assert.equal(entriesAfterSecondSave[0].occurrenceCount, 2);
});
```

- [ ] **Step 2: Add test to script**

Update:

```json
"test": "npm run build:server && node tests/openaiStream.test.mjs && node tests/vocabulary.test.mjs && node tests/auth.test.mjs && node tests/learningRepository.test.mjs"
```

- [ ] **Step 3: Run failing test**

Run:

```bash
npm test
```

Expected: FAIL because repository is missing or database is not initialized.

- [ ] **Step 4: Implement repository**

Create `server/learningRepository.ts`:

```ts
import type { SentenceBreakdown, VocabularyInsight } from "../src/types.js";
import { prisma } from "./db.js";
import { buildSenseKey, normalizeVocabularyText } from "./vocabulary.js";

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

function readInsightArrays(insight: VocabularyInsight) {
  return {
    synonymsJson: JSON.stringify(insight.synonyms ?? []),
    antonymsJson: JSON.stringify(insight.antonyms ?? []),
  };
}

export async function saveLearningSession(userId: string, breakdown: SentenceBreakdown) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.learningSession.create({
      data: {
        userId,
        sourceSentence: breakdown.targetSentence,
        sourceLabel: breakdown.sourceLabel,
        breakdownJson: toJson(breakdown),
        totalWords: breakdown.totalWords,
        completedAt: new Date(),
      },
    });

    for (const [stepIndex, step] of breakdown.steps.entries()) {
      for (const insight of step.vocabularyInsights ?? []) {
        const normalizedText = insight.normalizedText || normalizeVocabularyText(insight.text);
        const senseKey = insight.senseKey || buildSenseKey(normalizedText, insight.meaningInContext);
        const arrays = readInsightArrays(insight);

        const entry = await tx.vocabularyEntry.upsert({
          where: { userId_normalizedText: { userId, normalizedText } },
          create: {
            userId,
            text: insight.text,
            normalizedText,
            type: insight.type,
            phonetic: insight.phonetic,
            pronunciationText: insight.pronunciationText,
            ...arrays,
            occurrenceCount: 1,
            lastSeenAt: new Date(),
          },
          update: {
            phonetic: insight.phonetic,
            pronunciationText: insight.pronunciationText,
            synonymsJson: arrays.synonymsJson,
            antonymsJson: arrays.antonymsJson,
            occurrenceCount: { increment: 1 },
            lastSeenAt: new Date(),
          },
        });

        const sense = await tx.vocabularySense.upsert({
          where: { entryId_senseKey: { entryId: entry.id, senseKey } },
          create: {
            entryId: entry.id,
            senseKey,
            meaningInContext: insight.meaningInContext,
            dictionaryMeaning: insight.dictionaryMeaning,
            usageNote: insight.usageNote,
            example: insight.example,
          },
          update: {
            meaningInContext: insight.meaningInContext,
            dictionaryMeaning: insight.dictionaryMeaning,
            usageNote: insight.usageNote,
            example: insight.example,
          },
        });

        await tx.vocabularyOccurrence.upsert({
          where: {
            senseId_sessionId_stepIndex: {
              senseId: sense.id,
              sessionId: session.id,
              stepIndex,
            },
          },
          create: {
            entryId: entry.id,
            senseId: sense.id,
            sessionId: session.id,
            stepIndex,
            sentenceText: step.english,
          },
          update: {},
        });
      }
    }

    return session;
  });
}
```

- [ ] **Step 5: Add database setup for tests**

Before running repository tests locally:

```bash
$env:DATABASE_URL="file:./data/test.db"; npm run db:push
```

Then run:

```bash
$env:DATABASE_URL="file:./data/test.db"; npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json server/learningRepository.ts tests/learningRepository.test.mjs
git commit -m "feat: persist learning sessions and vocabulary"
```

---

## Task 5: Add Learning API Routes

**Files:**
- Create: `server/learningRoutes.ts`
- Modify: `server.ts`
- Modify: `server/validation.ts`

- [ ] **Step 1: Write failing API smoke expectation**

Run the server after build and request:

```bash
curl -i http://localhost:8787/api/vocabulary
```

Expected before implementation: route returns frontend HTML or 404 instead of `401`.

- [ ] **Step 2: Implement routes**

Create `server/learningRoutes.ts`:

```ts
import express, { type Response } from "express";
import { createOrResumeBetaSession, requireAuth, type AuthenticatedRequest } from "./auth.js";
import { prisma } from "./db.js";
import { saveLearningSession } from "./learningRepository.js";
import { assertMasteryStatus } from "./validation.js";

export const learningRoutes = express.Router();

learningRoutes.post("/test-users/session", async (req, res) => {
  try {
    const session = await createOrResumeBetaSession(req.body?.inviteCode, req.body?.nickname);
    res.json(session);
  } catch {
    res.status(400).json({ error: "Unable to enter beta." });
  }
});

learningRoutes.post("/learning-sessions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = await saveLearningSession(req.userId!, req.body?.breakdown);
    res.status(201).json({ id: session.id, saved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save learning session.";
    res.status(400).json({ error: message });
  }
});

learningRoutes.get("/learning-sessions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const sessions = await prisma.learningSession.findMany({
    where: { userId: req.userId! },
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
      completedAt: session.completedAt?.toISOString(),
      breakdown: JSON.parse(session.breakdownJson),
    })),
  });
});

learningRoutes.get("/vocabulary", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const entries = await prisma.vocabularyEntry.findMany({
    where: { userId: req.userId! },
    include: {
      senses: true,
      occurrences: { take: 5, orderBy: { createdAt: "desc" } },
    },
    orderBy: { lastSeenAt: "desc" },
    take: 200,
  });

  res.json({ entries });
});

learningRoutes.patch("/vocabulary/:id/mastery", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const masteryStatus = assertMasteryStatus(req.body?.masteryStatus);
    const updated = await prisma.vocabularyEntry.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { masteryStatus },
    });
    if (updated.count === 0) {
      res.status(404).json({ error: "Vocabulary entry not found." });
      return;
    }
    res.json({ id: req.params.id, masteryStatus });
  } catch {
    res.status(400).json({ error: "Unable to update mastery status." });
  }
});
```

- [ ] **Step 3: Mount routes**

Modify `server.ts`:

```ts
import { learningRoutes } from "./server/learningRoutes.js";
```

Mount before static serving:

```ts
app.use("/api", learningRoutes);
```

- [ ] **Step 4: Verify unauthorized route**

Run:

```bash
npm run build:server
npm start
```

Then:

```bash
curl -i http://localhost:8787/api/vocabulary
```

Expected: `401`.

- [ ] **Step 5: Commit**

```bash
git add server.ts server/learningRoutes.ts server/validation.ts
git commit -m "feat: add learning records api routes"
```

---

## Task 6: Extend Shared Types And AI Prompt

**Files:**
- Modify: `src/types.ts`
- Modify: `server/prompt.ts`
- Modify: `server/webai.ts`

- [ ] **Step 1: Add failing type usage**

Temporarily reference `VocabularyInsight` in `server/webai.ts` import path or create a narrow compile expectation.

Run:

```bash
npm run build:server
```

Expected: FAIL until the type is defined.

- [ ] **Step 2: Add shared types**

Modify `src/types.ts`:

```ts
export type VocabularyInsightType = 'word' | 'phrase' | 'collocation' | 'idiom' | 'meaning-shift';

export interface VocabularyInsight {
  text: string;
  normalizedText: string;
  senseKey: string;
  type: VocabularyInsightType;
  meaningInContext: string;
  dictionaryMeaning?: string;
  usageNote: string;
  phonetic?: string;
  pronunciationText?: string;
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
}
```

Add to `BreakdownStep`:

```ts
vocabularyInsights?: VocabularyInsight[];
```

- [ ] **Step 3: Update prompt**

Modify `server/prompt.ts` output format and rules to include `vocabularyInsights` per step with:

```json
"vocabularyInsights": [
  {
    "text": "fuel concerns",
    "normalizedText": "fuel concerns",
    "senseKey": "fuel concerns::intensify-concern",
    "type": "collocation",
    "meaningInContext": "加剧担忧",
    "dictionaryMeaning": "fuel 本义是燃料，也可作动词表示助长",
    "usageNote": "外刊中 fuel 常作动词，表示推动某种情绪、争议或趋势。",
    "pronunciationText": "fuel concerns",
    "synonyms": ["heighten worries", "intensify concerns"],
    "antonyms": ["ease concerns"],
    "example": "The report fueled concerns about inflation."
  }
]
```

Add explicit constraints:

```text
- Each step can include 0-3 vocabularyInsights.
- Do not repeat the same normalizedText + senseKey across steps.
- Synonyms and antonyms must match the sentence context.
- Return empty arrays when synonyms or antonyms are not natural.
```

- [ ] **Step 4: Harden response assertion**

Modify `server/webai.ts` `assertBreakdown` to tolerate missing `vocabularyInsights`, validate arrays when present, and cap oversized arrays:

```ts
if (step.vocabularyInsights !== undefined) {
  if (!Array.isArray(step.vocabularyInsights) || step.vocabularyInsights.length > 3) {
    throw new Error("AI response included invalid vocabulary insights.");
  }
}
```

Validate required insight fields: `text`, `normalizedText`, `senseKey`, `type`, `meaningInContext`, and `usageNote`.

- [ ] **Step 5: Verify**

Run:

```bash
npm run build
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts server/prompt.ts server/webai.ts
git commit -m "feat: request vocabulary insights in breakdowns"
```

---

## Task 7: Add Frontend Beta Session

**Files:**
- Create: `src/hooks/useBetaSession.ts`
- Create: `src/services/learningService.ts`
- Create: `src/components/BetaLoginView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing build expectation**

Import `BetaLoginView` from `src/App.tsx` before creating it.

Run:

```bash
npm run lint
```

Expected: FAIL because component is missing.

- [ ] **Step 2: Implement learning service auth helpers**

Create `src/services/learningService.ts`:

```ts
export interface BetaSession {
  token: string;
  user: { id: string; nickname: string };
  expiresAt: string;
}

export async function enterBeta(inviteCode: string, nickname: string): Promise<BetaSession> {
  const response = await fetch("/api/test-users/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteCode, nickname }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to enter beta.");
  }
  return data as BetaSession;
}
```

- [ ] **Step 3: Implement session hook**

Create `src/hooks/useBetaSession.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { enterBeta, type BetaSession } from '../services/learningService';

const STORAGE_KEY = 'sentencebreak.betaSession';

export function useBetaSession() {
  const [session, setSession] = useState<BetaSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSession(JSON.parse(stored) as BetaSession);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (inviteCode: string, nickname: string) => {
    setError('');
    const nextSession = await enterBeta(inviteCode, nickname);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  return { session, loading, error, setError, login, logout };
}
```

- [ ] **Step 4: Implement login view**

Create `src/components/BetaLoginView.tsx` with invite code, nickname, submit button, and error state. Use controlled inputs and call `onLogin(inviteCode, nickname)`.

- [ ] **Step 5: Gate App**

Modify `src/App.tsx`:

- Load `useBetaSession`.
- If loading, render a minimal loading state.
- If no session, render `BetaLoginView`.
- If session exists, render current app flow plus top navigation with nickname and an active My Learning button that switches to the learning-records view.

- [ ] **Step 6: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/hooks/useBetaSession.ts src/services/learningService.ts src/components/BetaLoginView.tsx
git commit -m "feat: add beta login flow"
```

---

## Task 8: Render Vocabulary Insights And Pronunciation

**Files:**
- Create: `src/components/VocabularyInsightList.tsx`
- Modify: `src/components/StepCard.tsx`
- Modify: `src/components/SummaryView.tsx`

- [ ] **Step 1: Add failing component import**

Import `VocabularyInsightList` in `StepCard.tsx` before creating it.

Run:

```bash
npm run lint
```

Expected: FAIL.

- [ ] **Step 2: Create insight list component**

Create `src/components/VocabularyInsightList.tsx`:

```tsx
import { useState } from 'react';
import { Volume2, ChevronDown } from 'lucide-react';
import type { VocabularyInsight } from '../types';

interface VocabularyInsightListProps {
  insights: readonly VocabularyInsight[];
}

function speakInsight(insight: VocabularyInsight) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(insight.pronunciationText || insight.text));
}

export function VocabularyInsightList({ insights }: VocabularyInsightListProps) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  if (insights.length === 0) return null;

  return (
    <section className="mt-8 w-full border-t border-zinc-200 pt-6 text-left">
      <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-ink-muted">Vocabulary insights</h4>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight) => {
          const key = insight.senseKey;
          const isExpanded = expanded.has(key);
          return (
            <article key={key} className="rounded-xl bg-white p-4 ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-zinc-900">{insight.text}</p>
                  {insight.phonetic && <p className="text-sm text-zinc-500">{insight.phonetic}</p>}
                  <p className="mt-2 text-sm font-semibold text-primary">{insight.meaningInContext}</p>
                </div>
                <button type="button" onClick={() => speakInsight(insight)} className="rounded-full p-2 text-primary hover:bg-primary/10" aria-label={`Pronounce ${insight.text}`}>
                  <Volume2 size={18} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setExpanded((current) => {
                    const next = new Set(current);
                    next.has(key) ? next.delete(key) : next.add(key);
                    return next;
                  });
                }}
                className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary"
              >
                Details <ChevronDown size={15} className={isExpanded ? 'rotate-180' : ''} />
              </button>
              {isExpanded && (
                <div className="mt-3 space-y-3 text-sm text-zinc-700">
                  {insight.dictionaryMeaning && <p>{insight.dictionaryMeaning}</p>}
                  <p>{insight.usageNote}</p>
                  {insight.synonyms?.length ? <p><strong>Synonyms:</strong> {insight.synonyms.join(', ')}</p> : null}
                  {insight.antonyms?.length ? <p><strong>Antonyms:</strong> {insight.antonyms.join(', ')}</p> : null}
                  {insight.example && <p className="italic">{insight.example}</p>}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Render in step cards**

In `StepCard.tsx`, render:

```tsx
<VocabularyInsightList insights={step.vocabularyInsights ?? []} />
```

Place it after the grammar explanation block.

- [ ] **Step 4: Render summary vocabulary list**

In `SummaryView.tsx`, flatten insights:

```ts
const sessionInsights = breakdown.steps.flatMap((step) => step.vocabularyInsights ?? []);
```

Render a compact "This Session" section before the final takeaway when `sessionInsights.length > 0`.

- [ ] **Step 5: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/VocabularyInsightList.tsx src/components/StepCard.tsx src/components/SummaryView.tsx
git commit -m "feat: show vocabulary insights in breakdown cards"
```

---

## Task 9: Save Breakdowns And Add My Learning

**Files:**
- Modify: `src/services/learningService.ts`
- Create: `src/hooks/useLearningRecords.ts`
- Create: `src/components/MyLearningView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/SummaryView.tsx`

- [ ] **Step 1: Add failing service references**

Reference `saveLearningSession` and `MyLearningView` from app code before implementation.

Run:

```bash
npm run lint
```

Expected: FAIL.

- [ ] **Step 2: Add learning service methods**

Extend `src/services/learningService.ts`:

```ts
import type { SentenceBreakdown } from '../types';

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function saveLearningSession(token: string, breakdown: SentenceBreakdown) {
  const response = await fetch('/api/learning-sessions', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ breakdown }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to save learning session.');
  return data as { id: string; saved: true };
}

export async function listLearningSessions(token: string) {
  const response = await fetch('/api/learning-sessions', { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load learning sessions.');
  return data.sessions;
}

export async function listVocabulary(token: string) {
  const response = await fetch('/api/vocabulary', { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load vocabulary.');
  return data.entries;
}

export async function updateVocabularyMastery(token: string, id: string, masteryStatus: 'new' | 'reviewing' | 'mastered') {
  const response = await fetch(`/api/vocabulary/${id}/mastery`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ masteryStatus }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to update mastery status.');
  return data;
}
```

- [ ] **Step 3: Add hook**

Create `src/hooks/useLearningRecords.ts` to track save status, load sentences, load vocabulary, and update mastery.

- [ ] **Step 4: Save after successful breakdown**

In `App.tsx`, when `breakdown` becomes available and the user has a session, call `saveLearningSession`. Track statuses:

```ts
type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';
```

Pass `saveStatus` and `onRetrySave` to `SummaryView`.

- [ ] **Step 5: Build My Learning view**

Create `src/components/MyLearningView.tsx` with two tabs:

- `Sentences`: session list with date, label, sentence preview.
- `Vocabulary`: entries with phonetic, occurrence count, status select, and expandable senses.

- [ ] **Step 6: Add app navigation**

In `App.tsx`, add view mode:

```ts
type AppView = 'breakdown' | 'learning';
```

Use top navigation buttons to switch between the current breakdown app and My Learning.

- [ ] **Step 7: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/services/learningService.ts src/hooks/useLearningRecords.ts src/components/MyLearningView.tsx src/components/SummaryView.tsx
git commit -m "feat: save and review learning records"
```

---

## Task 10: Final Verification And Documentation

**Files:**
- Modify: `README.md`
- Modify: `tests/openaiStream.test.mjs` if needed for changed build output only

- [ ] **Step 1: Update README**

Add sections:

```markdown
## Beta Learning Records

SentenceBreak supports invite-code beta users and cloud learning records.

Required environment:

DATABASE_URL="file:./data/sentencebreak.db"
BETA_INVITE_CODES="alpha2026,beta2026"
```

Add setup commands:

```bash
npm install
npm run db:generate
npm run db:push
npm run dev:api
npm run dev
```

- [ ] **Step 2: Run complete verification**

Run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Start API and frontend:

```bash
npm run dev:api
npm run dev
```

Verify:

- Beta login accepts configured invite code.
- Existing sentence analysis still works.
- Vocabulary insights render when returned by the AI.
- Summary save status appears.
- My Learning loads sentence and vocabulary records.
- Mastery status updates.

- [ ] **Step 4: Security check**

Check:

- No `.env` or SQLite database file is staged.
- No raw API key or token is committed.
- Protected API requests without token return `401`.
- User A cannot access User B records.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md
git commit -m "docs: document beta learning records setup"
```

---

## Implementation Order

1. Database baseline.
2. Vocabulary normalization and validation.
3. Beta authentication.
4. Learning repository.
5. Learning API routes.
6. Enhanced AI schema and prompt.
7. Frontend beta login.
8. Vocabulary insight UI.
9. Save flow and My Learning.
10. Final documentation and verification.

## Acceptance Mapping

- Beta users can enter with invite code plus nickname: Tasks 3, 5, 7.
- Existing sentence generation and analysis still work: Tasks 6, 10.
- Breakdown steps display vocabulary insights: Tasks 6, 8.
- Phonetic, pronunciation, synonyms, antonyms: Tasks 6, 8.
- Successful breakdowns save to cloud: Tasks 4, 5, 9.
- Saved sentence history and vocabulary list: Tasks 4, 5, 9.
- Mastery status updates: Tasks 5, 9.
- Duplicate handling: Tasks 2, 4.
- User isolation: Tasks 3, 5, 10.
- Build and tests pass: every task verification, plus Task 10.

## Plan Self-Check

- The plan covers every section of the approved design spec.
- No implementation step depends on an undefined type or function without defining it in an earlier task.
- Each task has a test or verification command before implementation and after implementation.
- The storage and auth design does not trust frontend-submitted user IDs.
- The plan keeps article-level analysis, payment, full auth, and generated audio out of scope.
