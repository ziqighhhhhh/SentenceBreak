export interface InsightIdentity {
  normalizedText: string;
  senseKey: string;
}

const SIMPLE_LEMMA_REPLACEMENTS: readonly {
  pattern: RegExp;
  replacement: string;
}[] = [
  { pattern: /\bfueled\b/g, replacement: "fuel" },
  { pattern: /\bfueling\b/g, replacement: "fuel" },
  { pattern: /\bfuels\b/g, replacement: "fuel" },
];

export function normalizeVocabularyText(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
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
