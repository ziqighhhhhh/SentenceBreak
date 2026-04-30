export function formatSseEvent(event: string, data: unknown): string {
  if (!/^[a-z][a-z-]*$/i.test(event)) {
    throw new Error("Invalid SSE event name.");
  }

  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
