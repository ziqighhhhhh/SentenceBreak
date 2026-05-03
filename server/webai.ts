import type { SentenceBreakdown } from "../src/types.js";

const VALID_ROLES = new Set([
  "subject",
  "predicate",
  "object",
  "modifier",
  "adverbial",
  "complement",
  "connector",
  "other",
]);
import { readOpenAIStream } from "./openaiStream.js";
import { buildBreakdownPrompt, buildComplexSentencePrompt } from "./prompt.js";

interface WebAI2APIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

function parseBreakdown(content: string): SentenceBreakdown {
  const trimmed = content.trim();
  const jsonText = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(jsonText) as SentenceBreakdown;
}

function isValidGrammarBlock(block: unknown): boolean {
  if (!block || typeof block !== "object") return false;
  const b = block as Record<string, unknown>;
  if (typeof b.text !== "string" || typeof b.role !== "string" || typeof b.roleLabel !== "string") return false;
  if (!VALID_ROLES.has(b.role)) return false;
  if (b.layer !== undefined) {
    if (typeof b.layer !== "number" || b.layer < 0 || !Number.isInteger(b.layer)) return false;
  }
  return true;
}

function assertBreakdown(value: SentenceBreakdown): SentenceBreakdown {
  if (
    typeof value?.sourceLabel !== "string" ||
    typeof value?.targetSentence !== "string" ||
    !Array.isArray(value?.steps) ||
    typeof value?.totalSentences !== "number" ||
    typeof value?.totalWords !== "number"
  ) {
    throw new Error("AI response did not match the expected breakdown shape.");
  }

  for (const step of value.steps) {
    if (
      typeof step?.pageNumber !== "number" ||
      typeof step?.english !== "string" ||
      typeof step?.chinese !== "string" ||
      typeof step?.label !== "string" ||
      typeof step?.explanation !== "string"
    ) {
      throw new Error("AI response included an invalid breakdown step.");
    }

    if (step.vocabularyInsights !== undefined) {
      if (!Array.isArray(step.vocabularyInsights) || step.vocabularyInsights.length > 3) {
        throw new Error("AI response included invalid vocabulary insights.");
      }

      for (const insight of step.vocabularyInsights) {
        if (
          typeof insight?.text !== "string" ||
          typeof insight?.normalizedText !== "string" ||
          typeof insight?.senseKey !== "string" ||
          !isVocabularyInsightType(insight?.type) ||
          typeof insight?.meaningInContext !== "string" ||
          typeof insight?.usageNote !== "string"
        ) {
          throw new Error("AI response included an invalid vocabulary insight.");
        }

        if (
          (insight.dictionaryMeaning !== undefined && typeof insight.dictionaryMeaning !== "string") ||
          (insight.phonetic !== undefined && typeof insight.phonetic !== "string") ||
          (insight.pronunciationText !== undefined && typeof insight.pronunciationText !== "string") ||
          (insight.example !== undefined && typeof insight.example !== "string") ||
          (insight.synonyms !== undefined && !isStringArray(insight.synonyms)) ||
          (insight.antonyms !== undefined && !isStringArray(insight.antonyms))
        ) {
          throw new Error("AI response included an invalid vocabulary insight.");
        }
      }
    }

    if (step.grammarBlocks !== undefined) {
      if (!Array.isArray(step.grammarBlocks) || step.grammarBlocks.length === 0) {
        throw new Error("AI response included invalid grammar blocks.");
      }

      for (const block of step.grammarBlocks) {
        if (!isValidGrammarBlock(block)) {
          throw new Error("AI response included an invalid grammar block.");
        }
      }
    }
  }

  if (value.grammarAnatomy !== undefined && Array.isArray(value.grammarAnatomy)) {
    for (const block of value.grammarAnatomy) {
      if (!isValidGrammarBlock(block)) {
        throw new Error("AI response included an invalid grammar anatomy block.");
      }
    }
  }

  if (value.anatomyNote !== undefined && typeof value.anatomyNote !== "string") {
    throw new Error("AI response included an invalid anatomyNote.");
  }

  return value;
}

function isVocabularyInsightType(value: unknown): boolean {
  return (
    value === "word" ||
    value === "phrase" ||
    value === "collocation" ||
    value === "idiom" ||
    value === "meaning-shift"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function generateBreakdownOnServer(sentence: string): Promise<SentenceBreakdown> {
  const content = await requestChatCompletion(buildBreakdownPrompt(sentence), {
    responseFormat: true,
  });

  return parseAndAssertBreakdown(content);
}

export async function streamBreakdownOnServer(
  sentence: string,
  onChunk?: (content: string) => void,
): Promise<SentenceBreakdown> {
  let content = "";

  for await (const chunk of requestChatCompletionStream(buildBreakdownPrompt(sentence), {
    responseFormat: true,
  })) {
    content += chunk;
    onChunk?.(chunk);
  }

  return parseAndAssertBreakdown(content);
}

export async function generateComplexSentenceOnServer(): Promise<string> {
  const content = await requestChatCompletion(buildComplexSentencePrompt(), {
    responseFormat: false,
  });

  const sentence = normalizeGeneratedSentence(content);
  validateGeneratedSentence(sentence);

  return sentence;
}

export async function* streamComplexSentenceOnServer(): AsyncGenerator<string, string> {
  let sentence = "";

  for await (const chunk of requestChatCompletionStream(buildComplexSentencePrompt(), {
    responseFormat: false,
  })) {
    sentence += chunk;
    yield chunk;
  }

  const normalizedSentence = normalizeGeneratedSentence(sentence);
  validateGeneratedSentence(normalizedSentence);

  return normalizedSentence;
}

async function requestChatCompletion(prompt: string, options: { responseFormat: boolean }): Promise<string> {
  const baseUrl = (process.env.WEBAI2API_BASE_URL || "http://47.238.156.250:3000").replace(/\/$/, "");
  const apiKey = process.env.WEBAI2API_API_KEY || "";
  const modelName = process.env.WEBAI2API_MODEL || "gemini-2.0-flash";

  if (!apiKey) {
    throw new Error("Server is missing WEBAI2API_API_KEY.");
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      ...(options.responseFormat ? { response_format: { type: "json_object" } } : {}),
      stream: false,
    }),
  });

  const data = (await response.json()) as WebAI2APIChatResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `WebAI2API request failed with HTTP ${response.status}`);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("WebAI2API response did not include message content.");
  }

  return content;
}

async function* requestChatCompletionStream(prompt: string, options: { responseFormat: boolean }): AsyncGenerator<string> {
  const baseUrl = (process.env.WEBAI2API_BASE_URL || "http://47.238.156.250:3000").replace(/\/$/, "");
  const apiKey = process.env.WEBAI2API_API_KEY || "";
  const modelName = process.env.WEBAI2API_MODEL || "gemini-2.0-flash";

  if (!apiKey) {
    throw new Error("Server is missing WEBAI2API_API_KEY.");
  }

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      ...(options.responseFormat ? { response_format: { type: "json_object" } } : {}),
      stream: true,
    }),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as WebAI2APIChatResponse;
    throw new Error(data.error?.message || `WebAI2API request failed with HTTP ${response.status}`);
  }

  yield* readOpenAIStream(response);
}

function normalizeGeneratedSentence(content: string): string {
  return content
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ");
}

function parseAndAssertBreakdown(content: string): SentenceBreakdown {
  return assertBreakdown(parseBreakdown(content));
}

function validateGeneratedSentence(sentence: string): void {
  if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(sentence)) {
    throw new Error("AI response included Chinese text in the generated English sentence.");
  }

  if (sentence.length < 80 || sentence.length > 700 || !/[.!?]$/.test(sentence)) {
    throw new Error("AI response did not include a valid complex English sentence.");
  }
}
