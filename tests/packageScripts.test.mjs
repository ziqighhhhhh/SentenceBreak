import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("server build generates Prisma Client before TypeScript compilation", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.match(packageJson.scripts["build:server"], /^prisma generate && tsc -p tsconfig\.server\.json$/);
});
