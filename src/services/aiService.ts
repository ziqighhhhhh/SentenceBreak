import { SentenceBreakdown } from "../types";

interface BreakdownErrorResponse {
  error?: string;
}

export async function generateBreakdown(sentence: string): Promise<SentenceBreakdown> {
  const response = await fetch("/api/breakdown", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sentence }),
  });

  const data = (await response.json()) as SentenceBreakdown | BreakdownErrorResponse;

  if (!response.ok) {
    throw new Error("error" in data && data.error ? data.error : `Request failed with HTTP ${response.status}`);
  }

  return data as SentenceBreakdown;
}
