import type { SentenceBreakdown } from "../src/types.js";
import { buildBreakdownPrompt } from "./prompt.js";

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
  }

  return value;
}

export async function generateBreakdownOnServer(sentence: string): Promise<SentenceBreakdown> {
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
          content: buildBreakdownPrompt(sentence),
        },
      ],
      response_format: {
        type: "json_object",
      },
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

  return assertBreakdown(parseBreakdown(content));
}
