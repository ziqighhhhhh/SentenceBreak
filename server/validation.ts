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
