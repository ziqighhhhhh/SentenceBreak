interface OpenAIStreamPayload {
  choices?: Array<{
    delta?: {
      content?: string | null;
    };
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export function parseOpenAIStreamPayload(payload: string): string {
  const trimmed = payload.trim();

  if (!trimmed || trimmed === "[DONE]") {
    return "";
  }

  let parsed: OpenAIStreamPayload;
  try {
    parsed = JSON.parse(trimmed) as OpenAIStreamPayload;
  } catch {
    throw new Error("Invalid streamed AI response.");
  }

  if (parsed.error?.message) {
    throw new Error(parsed.error.message);
  }

  return parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? "";
}

export async function* readOpenAIStream(response: Response): AsyncGenerator<string> {
  if (!response.body) {
    throw new Error("AI stream response did not include a body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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
        const data = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.replace(/^data:\s?/, ""))
          .join("\n");

        const text = parseOpenAIStreamPayload(data);
        if (text) {
          yield text;
        }
      }
    }

    const remaining = decoder.decode();
    if (remaining) {
      buffer += remaining;
    }

    if (buffer.trim()) {
      const data = buffer
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""))
        .join("\n");

      const text = parseOpenAIStreamPayload(data);
      if (text) {
        yield text;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
