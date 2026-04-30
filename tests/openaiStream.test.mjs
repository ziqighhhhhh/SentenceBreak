import assert from "node:assert/strict";
import { parseOpenAIStreamPayload } from "../dist-server/server/openaiStream.js";
import { formatSseEvent } from "../dist-server/server/sse.js";

function test(name, run) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("parseOpenAIStreamPayload extracts streamed delta text", () => {
  const payload = JSON.stringify({
    choices: [
      {
        delta: {
          content: "Although ",
        },
      },
    ],
  });

  assert.equal(parseOpenAIStreamPayload(payload), "Although ");
});

test("parseOpenAIStreamPayload ignores the done marker", () => {
  assert.equal(parseOpenAIStreamPayload("[DONE]"), "");
});

test("parseOpenAIStreamPayload rejects malformed stream JSON", () => {
  assert.throws(() => parseOpenAIStreamPayload("{not json"), /Invalid streamed AI response/);
});

test("formatSseEvent serializes event name and JSON payload", () => {
  assert.equal(formatSseEvent("progress", { message: "Preparing analysis..." }), 'event: progress\ndata: {"message":"Preparing analysis..."}\n\n');
});

test("formatSseEvent rejects invalid event names", () => {
  assert.throws(() => formatSseEvent("bad event", {}), /Invalid SSE event name/);
});
