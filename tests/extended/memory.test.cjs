const assert = require("node:assert/strict");
const test = require("node:test");
const { loadRuntime, makeModel, requireExtended } = require("./helpers.cjs");

test("repeated model lifecycles do not continuously grow the Wasm heap", async (t) => {
  const highs = await loadRuntime();
  if (!requireExtended(t, highs)) return;
  if (!highs.HEAPU8?.buffer) {
    t.skip("this build does not expose an observable Wasm heap");
    return;
  }

  const exercise = () => {
    const model = highs.createModel(makeModel());
    model.options.set({ output_flag: false, log_to_console: false });
    model.run();
    model.releaseMemory();
    model.dispose();
  };

  for (let index = 0; index < 25; index += 1) exercise();
  const warmedBytes = highs.HEAPU8.buffer.byteLength;
  for (let index = 0; index < 200; index += 1) exercise();
  const finalBytes = highs.HEAPU8.buffer.byteLength;

  assert.ok(
    finalBytes - warmedBytes <= 8 * 1024 * 1024,
    `Wasm heap grew by ${finalBytes - warmedBytes} bytes after warm-up`,
  );
});
