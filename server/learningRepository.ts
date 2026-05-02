import { prisma } from "./db.js";
import { buildSenseKey, normalizeVocabularyText, shouldKeepInsight } from "./vocabulary.js";
import { assertNonEmptyString, assertStringArray } from "./validation.js";

type VocabularyInsightType = "word" | "phrase" | "collocation" | "idiom" | "meaning-shift";

interface VocabularyInsightInput {
  text: string;
  normalizedText?: string;
  senseKey?: string;
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

interface BreakdownStepInput {
  english: string;
  vocabularyInsights?: VocabularyInsightInput[];
}

interface LearningBreakdownInput {
  sourceLabel?: string;
  targetSentence: string;
  totalWords?: number;
  steps: BreakdownStepInput[];
}

interface PreparedVocabularyInsight {
  text: string;
  normalizedText: string;
  senseKey: string;
  type: VocabularyInsightType;
  meaningInContext: string;
  dictionaryMeaning: string | null;
  usageNote: string;
  phonetic: string | null;
  pronunciationText: string | null;
  synonyms: string[];
  antonyms: string[];
  example: string | null;
  stepIndex: number;
  sentenceText: string;
}

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

function optionalString(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return assertNonEmptyString(value, field, maxLength);
}

function assertVocabularyType(value: unknown): VocabularyInsightType {
  if (
    value === "word" ||
    value === "phrase" ||
    value === "collocation" ||
    value === "idiom" ||
    value === "meaning-shift"
  ) {
    return value;
  }
  throw new Error("Vocabulary insight type is invalid.");
}

function assertBreakdown(value: unknown): LearningBreakdownInput {
  if (!value || typeof value !== "object") {
    throw new Error("Breakdown is required.");
  }

  const breakdown = value as Record<string, unknown>;
  if (!Array.isArray(breakdown.steps)) {
    throw new Error("Breakdown steps are required.");
  }

  return {
    sourceLabel:
      typeof breakdown.sourceLabel === "string" && breakdown.sourceLabel.trim()
        ? assertNonEmptyString(breakdown.sourceLabel, "Source label", 120)
        : "External Reading",
    targetSentence: assertNonEmptyString(breakdown.targetSentence, "Target sentence", 5000),
    totalWords:
      typeof breakdown.totalWords === "number" && Number.isFinite(breakdown.totalWords)
        ? Math.max(0, Math.trunc(breakdown.totalWords))
        : 0,
    steps: breakdown.steps.map((step, stepIndex) => {
      if (!step || typeof step !== "object") {
        throw new Error(`Step ${stepIndex + 1} is invalid.`);
      }
      const candidate = step as Record<string, unknown>;
      return {
        english: assertNonEmptyString(candidate.english, `Step ${stepIndex + 1} English`, 5000),
        vocabularyInsights: Array.isArray(candidate.vocabularyInsights)
          ? candidate.vocabularyInsights.map((insight, insightIndex) =>
              assertVocabularyInsight(insight, stepIndex, insightIndex),
            )
          : [],
      };
    }),
  };
}

function assertVocabularyInsight(value: unknown, stepIndex: number, insightIndex: number): VocabularyInsightInput {
  if (!value || typeof value !== "object") {
    throw new Error(`Vocabulary insight ${insightIndex + 1} in step ${stepIndex + 1} is invalid.`);
  }

  const insight = value as Record<string, unknown>;
  return {
    text: assertNonEmptyString(insight.text, "Vocabulary text", 200),
    normalizedText: optionalString(insight.normalizedText, "Normalized vocabulary text", 200) ?? undefined,
    senseKey: optionalString(insight.senseKey, "Vocabulary sense key", 500) ?? undefined,
    type: assertVocabularyType(insight.type),
    meaningInContext: assertNonEmptyString(insight.meaningInContext, "Meaning in context", 500),
    dictionaryMeaning: optionalString(insight.dictionaryMeaning, "Dictionary meaning", 1000) ?? undefined,
    usageNote: assertNonEmptyString(insight.usageNote, "Usage note", 1000),
    phonetic: optionalString(insight.phonetic, "Phonetic", 120) ?? undefined,
    pronunciationText: optionalString(insight.pronunciationText, "Pronunciation text", 200) ?? undefined,
    synonyms: assertStringArray(insight.synonyms, "Synonyms", 10),
    antonyms: assertStringArray(insight.antonyms, "Antonyms", 10),
    example: optionalString(insight.example, "Example", 1000) ?? undefined,
  };
}

function prepareVocabularyInsights(breakdown: LearningBreakdownInput): PreparedVocabularyInsight[] {
  const seen = new Set<string>();

  return breakdown.steps.flatMap((step, stepIndex) =>
    (step.vocabularyInsights ?? []).flatMap((insight) => {
      const normalizedText = insight.normalizedText?.trim() || normalizeVocabularyText(insight.text);
      const senseKey = insight.senseKey?.trim() || buildSenseKey(normalizedText, insight.meaningInContext);

      if (!shouldKeepInsight({ normalizedText, senseKey }, seen)) {
        return [];
      }
      seen.add(senseKey);

      return [
        {
          text: insight.text,
          normalizedText,
          senseKey,
          type: insight.type,
          meaningInContext: insight.meaningInContext,
          dictionaryMeaning: insight.dictionaryMeaning ?? null,
          usageNote: insight.usageNote,
          phonetic: insight.phonetic ?? null,
          pronunciationText: insight.pronunciationText ?? null,
          synonyms: insight.synonyms ?? [],
          antonyms: insight.antonyms ?? [],
          example: insight.example ?? null,
          stepIndex,
          sentenceText: step.english,
        },
      ];
    }),
  );
}

export async function saveLearningSession(userIdInput: unknown, breakdownInput: unknown) {
  const userId = assertNonEmptyString(userIdInput, "User ID", 200);
  const breakdown = assertBreakdown(breakdownInput);
  const insights = prepareVocabularyInsights(breakdown);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const session = await tx.learningSession.create({
      data: {
        userId,
        sourceSentence: breakdown.targetSentence,
        sourceLabel: breakdown.sourceLabel ?? "External Reading",
        breakdownJson: toJson(breakdownInput),
        totalWords: breakdown.totalWords ?? 0,
      },
    });

    for (const insight of insights) {
      const entry = await tx.vocabularyEntry.upsert({
        where: {
          userId_normalizedText: {
            userId,
            normalizedText: insight.normalizedText,
          },
        },
        create: {
          userId,
          text: insight.text,
          normalizedText: insight.normalizedText,
          type: insight.type,
          phonetic: insight.phonetic,
          pronunciationText: insight.pronunciationText,
          synonymsJson: toJson(insight.synonyms),
          antonymsJson: toJson(insight.antonyms),
          occurrenceCount: 1,
          lastSeenAt: now,
        },
        update: {
          text: insight.text,
          type: insight.type,
          phonetic: insight.phonetic,
          pronunciationText: insight.pronunciationText,
          synonymsJson: toJson(insight.synonyms),
          antonymsJson: toJson(insight.antonyms),
          occurrenceCount: { increment: 1 },
          lastSeenAt: now,
        },
      });

      const sense = await tx.vocabularySense.upsert({
        where: {
          entryId_senseKey: {
            entryId: entry.id,
            senseKey: insight.senseKey,
          },
        },
        create: {
          entryId: entry.id,
          senseKey: insight.senseKey,
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

      await tx.vocabularyOccurrence.create({
        data: {
          entryId: entry.id,
          senseId: sense.id,
          sessionId: session.id,
          stepIndex: insight.stepIndex,
          sentenceText: insight.sentenceText,
        },
      });
    }

    return session;
  });
}
