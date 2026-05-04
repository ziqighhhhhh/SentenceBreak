import { SentenceBreakdown } from "../types";

interface BreakdownErrorResponse {
  error?: string;
}

interface GeneratedSentenceResponse {
  sentence?: string;
  error?: string;
}

type StreamEventHandler = (text: string) => void;
type ProgressEventHandler = (message: string) => void;

export async function generateComplexSentence(): Promise<string> {
  const response = await fetch("/api/sentence", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = (await response.json()) as GeneratedSentenceResponse;

  if (!response.ok || !data.sentence) {
    throw new Error(data.error || `Request failed with HTTP ${response.status}`);
  }

  return data.sentence;
}

export async function generateComplexSentenceStream(onToken: StreamEventHandler): Promise<string> {
  const response = await fetch("/api/sentence/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => ({}))) as GeneratedSentenceResponse;
    throw new Error(data.error || `Request failed with HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalSentence = "";

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const event of events) {
        const parsed = parseSentenceStreamEvent(event);

        if (parsed.type === "token") {
          onToken(parsed.text);
        }

        if (parsed.type === "done") {
          finalSentence = parsed.sentence;
        }

        if (parsed.type === "error") {
          throw new Error(parsed.error);
        }
      }

      if (finalSentence) {
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalSentence) {
    throw new Error("Sentence stream ended before returning a final sentence.");
  }

  return finalSentence;
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

export async function generateBreakdownStream(sentence: string, onProgress: ProgressEventHandler): Promise<SentenceBreakdown> {
  const response = await fetch("/api/breakdown/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sentence }),
  });

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => ({}))) as BreakdownErrorResponse;
    throw new Error(data.error || `Request failed with HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalBreakdown: SentenceBreakdown | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const event of events) {
        const parsed = parseBreakdownStreamEvent(event);

        if (parsed.type === "progress") {
          onProgress(parsed.message);
        }

        if (parsed.type === "result") {
          finalBreakdown = parsed.breakdown;
        }

        if (parsed.type === "error") {
          throw new Error(parsed.error);
        }
      }

      if (finalBreakdown) {
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalBreakdown) {
    throw new Error("Breakdown stream ended before returning a result.");
  }

  return finalBreakdown;
}

type SentenceStreamEvent =
  | { type: "token"; text: string }
  | { type: "done"; sentence: string }
  | { type: "error"; error: string }
  | { type: "unknown" };

type BreakdownStreamEvent =
  | { type: "progress"; message: string }
  | { type: "result"; breakdown: SentenceBreakdown }
  | { type: "error"; error: string }
  | { type: "unknown" };

function parseSentenceStreamEvent(event: string): SentenceStreamEvent {
  const { eventName, data } = readStreamEventParts(event);

  if (!eventName || !data) {
    return { type: "unknown" };
  }

  const parsed = JSON.parse(data) as Partial<GeneratedSentenceResponse> & { text?: string };

  if (eventName === "token" && typeof parsed.text === "string") {
    return { type: "token", text: parsed.text };
  }

  if (eventName === "done" && typeof parsed.sentence === "string") {
    return { type: "done", sentence: parsed.sentence };
  }

  if (eventName === "error" && typeof parsed.error === "string") {
    return { type: "error", error: parsed.error };
  }

  return { type: "unknown" };
}

function parseBreakdownStreamEvent(event: string): BreakdownStreamEvent {
  const { eventName, data } = readStreamEventParts(event);

  if (!eventName || !data) {
    return { type: "unknown" };
  }

  const parsed = JSON.parse(data) as BreakdownErrorResponse & { message?: string; breakdown?: SentenceBreakdown };

  if (eventName === "progress" && typeof parsed.message === "string") {
    return { type: "progress", message: parsed.message };
  }

  if (eventName === "result" && parsed.breakdown) {
    return { type: "result", breakdown: parsed.breakdown };
  }

  if (eventName === "error" && typeof parsed.error === "string") {
    return { type: "error", error: parsed.error };
  }

  return { type: "unknown" };
}

function readStreamEventParts(event: string): { eventName?: string; data: string } {
  const eventName = event
    .split(/\r?\n/)
    .find((line) => line.startsWith("event:"))
    ?.replace(/^event:\s?/, "")
    .trim();
  const data = event
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("\n");

  return { eventName, data };
}
