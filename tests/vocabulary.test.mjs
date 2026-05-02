import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSenseKey,
  normalizeMeaning,
  normalizeVocabularyText,
  shouldKeepInsight,
} from "../dist-server/server/vocabulary.js";
import {
  assertMasteryStatus,
  assertNonEmptyString,
  assertStringArray,
} from "../dist-server/server/validation.js";

test("normalizes case, punctuation, and whitespace", () => {
  assert.equal(normalizeVocabularyText("  Fueled   concerns. "), "fuel concerns");
});

test("normalizes common curly quotes around vocabulary text", () => {
  assert.equal(normalizeVocabularyText(" \u201cFueling concerns\u201d "), "fuel concerns");
});

test("normalizes meaning by removing whitespace", () => {
  assert.equal(normalizeMeaning(" intensify  concern "), "intensifyconcern");
});

test("creates stable sense keys", () => {
  assert.equal(buildSenseKey("fuel concerns", "intensify concern"), "fuel concerns::intensifyconcern");
});

test("drops duplicate insights with same normalized text and sense", () => {
  const seen = new Set(["fuel concerns::intensifyconcern"]);
  assert.equal(
    shouldKeepInsight({ normalizedText: "fuel concerns", senseKey: "fuel concerns::intensifyconcern" }, seen),
    false,
  );
});

test("keeps same expression with a different sense", () => {
  const seen = new Set(["fuel::energy-source"]);
  assert.equal(
    shouldKeepInsight({ normalizedText: "fuel", senseKey: "fuel::intensify" }, seen),
    true,
  );
});

test("validates non-empty strings and trims accepted values", () => {
  assert.equal(assertNonEmptyString("  Alice  ", "Nickname", 20), "Alice");
  assert.throws(() => assertNonEmptyString("", "Nickname", 20), /Nickname is required/);
  assert.throws(() => assertNonEmptyString("a".repeat(21), "Nickname", 20), /Nickname is too long/);
  assert.throws(() => assertNonEmptyString(12, "Nickname", 20), /Nickname must be a string/);
});

test("validates string arrays with trimming, filtering, and item limits", () => {
  assert.deepEqual(assertStringArray([" one ", "", 2, "two"], "Synonyms", 5), ["one", "two"]);
  assert.deepEqual(assertStringArray(undefined, "Synonyms", 5), []);
  assert.throws(() => assertStringArray(["a", "b", "c"], "Synonyms", 2), /Synonyms has too many items/);
});

test("validates mastery statuses", () => {
  assert.equal(assertMasteryStatus("new"), "new");
  assert.equal(assertMasteryStatus("reviewing"), "reviewing");
  assert.equal(assertMasteryStatus("mastered"), "mastered");
  assert.throws(() => assertMasteryStatus("done"), /Invalid mastery status/);
});
