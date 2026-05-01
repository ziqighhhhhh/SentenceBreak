# SentenceBreak Learning Records Design

## Summary

Upgrade SentenceBreak from a single-sentence breakdown demo into an external-reading intensive reading tool with accumulated learning records.

The first version keeps the current sentence breakdown flow as the core experience. It adds vocabulary and phrase insights to breakdown cards, introduces lightweight beta user identity through invite code plus nickname, and saves sentence and vocabulary learning records in the cloud for multi-user testing.

## Goals

- Preserve the existing flow: enter or generate one complex English sentence, analyze it, navigate breakdown cards, and review the final summary.
- Add vocabulary and phrase insights to each breakdown step without turning the product into a separate vocabulary-card tool.
- Let beta users accumulate sentence history and vocabulary or phrase records across sessions.
- Support multi-user testing through cloud persistence and strict user data isolation.
- Keep the first version focused enough to implement and validate quickly.

## Non-Goals

- Full password, email, or third-party authentication.
- Payment, subscription, or quota management.
- Article-level analysis or daily content operations.
- Advanced spaced repetition algorithms.
- Social sharing or public profiles.
- Audio file generation or storage.

## User Flow

1. A first-time user enters an invite code and nickname.
2. The server validates the invite code and creates or returns a beta user session.
3. The user returns to the existing breakdown page.
4. The user enters or generates an external-reading style long sentence.
5. The user analyzes the sentence and receives enhanced breakdown cards.
6. Each card shows the current sentence, translation, grammar label, structural explanation, and optional vocabulary insights.
7. The summary page shows sentence assembly plus the vocabulary accumulated in this breakdown.
8. The breakdown is saved to My Learning asynchronously.
9. The user can open My Learning to review historical sentences and accumulated vocabulary or phrases.

## AI Output Model

Keep the existing `SentenceBreakdown` shape and add optional vocabulary insights to each step.

```ts
interface BreakdownStep {
  pageNumber: number;
  english: string;
  chinese: string;
  label: string;
  explanation: string;
  vocabularyInsights?: VocabularyInsight[];
}

interface VocabularyInsight {
  text: string;
  normalizedText: string;
  senseKey: string;
  type: 'word' | 'phrase' | 'collocation' | 'idiom' | 'meaning-shift';
  meaningInContext: string;
  dictionaryMeaning?: string;
  usageNote: string;
  phonetic?: string;
  pronunciationText?: string;
  synonyms?: string[];
  antonyms?: string[];
  example?: string;
}
```

AI output rules:

- Each step should include at most 0-3 vocabulary insights.
- Insights should focus on words, phrases, collocations, idioms, familiar-word-unfamiliar-meaning cases, and expressions that materially affect comprehension.
- The model should not explain basic words unless the usage is unusual in context.
- Synonyms and antonyms must match the current context. If antonyms are unnatural, return an empty array.
- Phrases and collocations do not need phonetic symbols, but should include `pronunciationText` for browser speech playback when useful.
- The same expression with the same context meaning should not be repeated across steps.
- The same expression with a different context meaning should be preserved as a separate sense.

## Duplicate Vocabulary Rules

Do not use raw string equality as the only duplicate check.

Generate `normalizedText` by lowercasing, trimming punctuation, normalizing whitespace and quotes, and applying simple lemma handling where practical. For example, `fueled concerns`, `fueling concerns`, and `fuel concerns` can share the same normalized expression family.

Generate `senseKey` from the normalized expression plus a compact meaning label. For example:

```text
fuel::intensify-concern
fuel::literal-energy-source
```

Duplicate definition:

```text
same user + same normalizedText + same senseKey = duplicate sense
same normalizedText + different senseKey = different sense
```

Within one breakdown, duplicate insights should be hidden from later steps. In the cloud vocabulary store, duplicates should update occurrence counts and source occurrences rather than creating repeated vocabulary entries.

## Pronunciation

The first version should use browser `SpeechSynthesis` instead of generated audio files.

- The speak button plays `pronunciationText || text`.
- No audio files are generated or stored.
- This keeps storage, cost, and implementation complexity low.
- A later version can add stable British or American TTS if user testing shows pronunciation is important.

## Cloud Data Model

### TestUser

```ts
interface TestUser {
  id: string;
  inviteCode: string;
  nickname: string;
  createdAt: string;
  lastSeenAt: string;
}
```

Rules:

- `inviteCode + nickname` creates or returns a beta user.
- Nicknames must be length-limited and sanitized.
- The frontend receives a session token, not a raw `userId`.

### LearningSession

```ts
interface LearningSession {
  id: string;
  userId: string;
  sourceSentence: string;
  sourceLabel: string;
  breakdown: SentenceBreakdown;
  totalWords: number;
  createdAt: string;
  completedAt?: string;
}
```

Rules:

- Save only successful breakdowns in the first version.
- Store the full breakdown JSON so users can revisit the exact generated explanation.
- Save asynchronously after analysis so a persistence error does not block learning.

### VocabularyEntry

```ts
interface VocabularyEntry {
  id: string;
  userId: string;
  text: string;
  normalizedText: string;
  type: 'word' | 'phrase' | 'collocation' | 'idiom' | 'meaning-shift';
  phonetic?: string;
  pronunciationText?: string;
  synonyms: string[];
  antonyms: string[];
  masteryStatus: 'new' | 'reviewing' | 'mastered';
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}
```

Rules:

- `userId + normalizedText` should be unique.
- Repeated encounters update `occurrenceCount` and `lastSeenAt`.
- `masteryStatus` defaults to `new`.

### VocabularySense

```ts
interface VocabularySense {
  id: string;
  entryId: string;
  senseKey: string;
  meaningInContext: string;
  dictionaryMeaning?: string;
  usageNote: string;
  example?: string;
  createdAt: string;
}
```

Rules:

- `entryId + senseKey` should be unique.
- A repeated meaning reuses the existing sense.
- A new context meaning creates a new sense.

### VocabularyOccurrence

```ts
interface VocabularyOccurrence {
  id: string;
  entryId: string;
  senseId: string;
  sessionId: string;
  stepIndex: number;
  sentenceText: string;
  createdAt: string;
}
```

Rules:

- Occurrences connect vocabulary back to the exact sentence and breakdown step.
- The same session, step, and sense should not create duplicate occurrence rows.

## API Design

First-version endpoints:

```text
POST /api/test-users/session
POST /api/learning-sessions
GET  /api/learning-sessions
GET  /api/vocabulary
PATCH /api/vocabulary/:id/mastery
```

Responsibilities:

- `POST /api/test-users/session`: validate invite code and nickname, return a session token.
- `POST /api/learning-sessions`: save one breakdown and upsert vocabulary entries, senses, and occurrences.
- `GET /api/learning-sessions`: list the authenticated user's saved sentence history.
- `GET /api/vocabulary`: list the authenticated user's accumulated vocabulary.
- `PATCH /api/vocabulary/:id/mastery`: update one vocabulary entry's mastery status.

All protected routes must derive `userId` from the session token. They must never trust a frontend-submitted `userId`.

## Storage Recommendation

Use SQLite with an ORM for the first version.

Recommended stack:

- SQLite database for local and production beta persistence.
- Prisma as the ORM because its schema and migration workflow are clear for relationship-heavy data.
- `DATABASE_URL` environment variable for production configuration.

Suggested files:

```text
server/
  auth.ts
  validation.ts
  learningRepository.ts
  vocabularyRepository.ts
  learningRoutes.ts
```

Keep `server.ts` focused on middleware and route mounting.

Invite codes can be configured through:

```env
BETA_INVITE_CODES="alpha2026,beta2026"
```

The server should generate random session tokens, store only token hashes, and return the raw token once to the frontend.

## Frontend Design

### Beta Login

Show a lightweight entry screen before the main app:

- Invite code input.
- Nickname input.
- Enter beta button.

After login, show the nickname and a My Learning navigation entry.

### Enhanced Step Cards

Keep the current card structure and add a compact vocabulary insight region.

Default visible fields:

- Word or phrase.
- Phonetic symbol when available.
- Speak button.
- Meaning in context.

Expanded fields:

- Dictionary meaning.
- Usage note.
- Synonyms.
- Antonyms.
- Example sentence.

If a step has no vocabulary insights, the region should not render.

### Summary Page

Add a "This Session" vocabulary summary:

- Number of new vocabulary or phrase items.
- Number of collocations.
- Number of familiar-word-unfamiliar-meaning items.
- Vocabulary list from the current breakdown.
- Save status: saved, saving, or retry save.

### My Learning

Add two tabs:

`Sentences`

- Saved sentence list.
- Date, source label, sentence preview, and vocabulary count.
- Click to revisit the saved breakdown.

`Vocabulary`

- Accumulated vocabulary or phrase list.
- Filter by `new`, `reviewing`, or `mastered`.
- Show phonetic, occurrence count, latest seen date, and sense count.
- Expand to view source sentences and examples.
- Allow mastery status updates.

## Error Handling

- Analysis success and save failure should be separated.
- If saving fails, keep showing the breakdown and offer retry.
- Invalid invite code returns a generic error.
- Invalid token returns `401`.
- Schema validation failures return `400` without internal details.
- Database errors return a generic server error and log details server-side.

## Security

- Validate all route inputs with schema-based validation.
- Limit nickname, sentence, breakdown JSON, and vocabulary array sizes.
- Bind every learning query to the authenticated user.
- Never accept user identity from request bodies.
- Store token hashes, not raw tokens.
- Do not store emails, phone numbers, or real names in the first version.
- Do not expose database errors or invite-code internals to the client.

## Testing Strategy

Unit tests:

- Vocabulary normalization and duplicate detection.
- Same expression and same sense merges.
- Same expression and different sense creates separate senses.
- Vocabulary entry, sense, and occurrence upsert behavior.
- Invite code and nickname validation.
- Session token validation.

API integration tests:

- Unauthenticated learning routes return `401`.
- User A cannot read or update user B's records.
- Saving a breakdown creates a learning session and vocabulary records.
- Repeated vocabulary updates occurrence counts without duplicate entries.
- Invalid breakdown shape returns `400`.
- Mastery updates are limited to the current user.

E2E test target:

1. Enter invite code and nickname.
2. Analyze a sentence with vocabulary insights.
3. View vocabulary insights in breakdown cards.
4. Reach the summary page and confirm save status.
5. Open My Learning.
6. Confirm sentence and vocabulary records exist.
7. Update vocabulary mastery status.

## Acceptance Criteria

- Beta users can enter with invite code plus nickname.
- Existing sentence generation and analysis still work.
- Breakdown steps can display vocabulary insights.
- Insights support phonetic text, pronunciation playback, synonyms, and antonyms.
- Successful breakdowns can be saved to the cloud.
- Users can view their saved sentence history.
- Users can view their accumulated vocabulary and phrases.
- Users can update vocabulary mastery status.
- Duplicate vocabulary handling follows normalized expression plus sense key rules.
- Users cannot access other users' records.
- Build and tests pass.

## Risks

- AI may output malformed or overly noisy vocabulary insights.
- Enhanced cards may become visually crowded.
- SQLite file backups must be handled in production.
- Browser speech quality varies by platform.
- Session-token handling needs care even for beta testing.

## Rollback

The feature should be isolated behind beta login and new learning-record routes. If the learning-record system causes issues, disable cloud saving and My Learning while preserving the existing sentence breakdown flow.
