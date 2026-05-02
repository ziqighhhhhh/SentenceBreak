import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./data/test.db";

const { prisma } = await import("../dist-server/server/db.js");
const { saveLearningSession } = await import("../dist-server/server/learningRepository.js");

test("saves a learning session and upserts vocabulary entries", async () => {
  const suffix = randomUUID();
  const user = await prisma.testUser.create({
    data: { inviteCode: `test-${suffix}`, nickname: `repo-${suffix}` },
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
        chinese: "This report intensified concerns.",
        label: "1 Base sentence",
        explanation: "Build the main clause.",
        vocabularyInsights: [
          {
            text: "fueled concerns",
            normalizedText: "fuel concerns",
            senseKey: "fuel concerns::intensify-concern",
            type: "collocation",
            meaningInContext: "intensified concerns",
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
