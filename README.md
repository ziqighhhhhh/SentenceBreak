# SentenceBreak

SentenceBreak is an AI-assisted English long-sentence breakdown app. It helps learners turn a complex English sentence into a step-by-step structural explanation, then navigate the sentence through animated cards.

The app includes a React/Vite frontend, an Express server, OpenAI-compatible streaming API calls, rate limiting, input validation, and polished particle/text reveal interactions.
It also supports invite-code beta users, enhanced vocabulary insights, and cloud learning records backed by SQLite.

## Features

- Generate a complex English example sentence.
- Analyze an English sentence into step-by-step breakdown cards.
- Show context-specific vocabulary and phrase insights with synonyms, antonyms, phonetic text, and browser pronunciation.
- Let beta users enter with an invite code and nickname.
- Save completed breakdowns and accumulated vocabulary to My Learning.
- Cache generated-sentence analysis silently so users can start the breakdown later without sending a duplicate request.
- Stream analysis progress with Server-Sent Events.
- Reject Chinese text and oversized input at the server boundary.
- Render initial page content and card transitions with particle morph effects.
- Render generated text with a Pretext-powered canvas reveal layer before committing it to the textarea.
- Navigate breakdown cards with directional particle flow.

## Tech Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS
- Express
- SQLite
- Prisma
- Server-Sent Events
- `@chenglou/pretext` for text measurement and layout
- `motion` for view transitions

## Project Structure

```text
src/
  components/        React UI components and animation layers
  hooks/             Sentence generation, analysis, cache, and navigation state
  services/          Browser API/SSE client helpers
  types.ts           Shared breakdown data types

server/
  auth.ts            Invite-code beta session helpers
  db.ts              Prisma client and SQLite adapter
  learningRoutes.ts  Learning-record API routes
  learningRepository.ts Learning-session and vocabulary persistence
  paths.ts           Client dist path resolution
  sse.ts             SSE event formatting helpers
  webai.ts           OpenAI-compatible API integration

tests/
  openaiStream.test.mjs
  auth.test.mjs
  learningRepository.test.mjs
  vocabulary.test.mjs

server.ts            Express API and production static server
vite.config.ts       Vite config and dev proxy
```

## Requirements

- Node.js 20+
- npm
- An OpenAI-compatible API gateway configured through environment variables

## Environment

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required values:

```env
WEBAI2API_BASE_URL="http://your-api-host:3000"
WEBAI2API_API_KEY="YOUR_TOKEN"
WEBAI2API_MODEL="gemini-2.0-flash"
PORT="8787"
RATE_LIMIT_PER_MINUTE="20"
DATABASE_URL="file:./data/sentencebreak.db"
BETA_INVITE_CODES="alpha2026,beta2026"
API_PROXY_TARGET="http://localhost:8787"
```

Do not commit real API keys or tokens.

## Development

Install dependencies:

```bash
npm install
```

Generate Prisma client and initialize the local SQLite database:

```bash
npm run db:generate
npm run db:push
```

Run the API server:

```bash
npm run dev:api
```

Run the Vite frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production Build

Build frontend and server:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

The production server serves the built frontend and API from the same Express process.

## Scripts

```text
npm run dev           Start Vite on port 3000
npm run dev:api       Start the Express API with tsx
npm run build         Build frontend and server
npm run build:server  Type-check/build server output
npm run preview       Preview the Vite build
npm start             Start the compiled production server
npm run lint          Type-check the frontend
npm run db:generate   Generate Prisma client
npm run db:push       Sync SQLite schema for local development
npm run db:migrate    Create and apply Prisma migrations
npm test              Run server build and tests
```

## API Endpoints

```text
POST /api/sentence
POST /api/sentence/stream
POST /api/breakdown
POST /api/breakdown/stream
POST /api/test-users/session
POST /api/learning-sessions
GET  /api/learning-sessions
GET  /api/vocabulary
PATCH /api/vocabulary/:id/mastery
GET  /api/health
```

Streaming endpoints use Server-Sent Events. The frontend uses the streaming variants for generated examples and sentence analysis.

## Validation And Security

The server:

- Limits JSON request size.
- Applies per-IP rate limiting.
- Rejects empty, non-string, oversized, or Chinese-containing sentence input.
- Validates beta invite sessions before reading or writing learning records.
- Keeps each user's learning sessions and vocabulary isolated by server-derived user identity.
- Sets common security headers, including CSP, frame protection, and content-type protection.
- Keeps API credentials on the server side.

## Testing

Run:

```bash
npm test
```

Current tests cover SSE formatting, OpenAI stream payload parsing, server dist path resolution, vocabulary normalization, beta auth helpers, and learning-record persistence.

## Notes

- `.env` is local-only and must not be committed.
- `node_modules`, build output, logs, and local notes should stay out of commits.
- `main` should remain deployable; use focused commits and verify with `npm run build` and `npm test` before pushing.
