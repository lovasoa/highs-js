import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "highs-package-"),
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`,
    );
  }
  return result.stdout;
}

try {
  const packOutput = JSON.parse(
    run("npm", [
      "pack",
      "--json",
      "--pack-destination",
      temporaryDirectory,
    ]),
  );
  const packReport = Array.isArray(packOutput)
    ? packOutput[0]
    : typeof packOutput?.filename === "string"
      ? packOutput
      : Object.values(packOutput).find(
          (entry) => typeof entry?.filename === "string",
        );
  assert.equal(typeof packReport?.filename, "string");
  const archive = path.join(temporaryDirectory, packReport.filename);

  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--prefix",
      temporaryDirectory,
      archive,
    ],
    { cwd: temporaryDirectory },
  );

  const installed = path.join(temporaryDirectory, "node_modules", "highs");
  for (const requiredFile of [
    "build/highs.js",
    "build/highs.mjs",
    "build/highs.wasm",
    "types.d.ts",
    "HiGHS/LICENSE.txt",
    "HiGHS/THIRD_PARTY_NOTICES.md",
  ]) {
    assert.ok(
      fs.existsSync(path.join(installed, requiredFile)),
      `${requiredFile} is missing from the packed package`,
    );
  }

  const commonJsTest = path.join(temporaryDirectory, "consumer.cjs");
  fs.writeFileSync(
    commonJsTest,
    String.raw`
const assert = require("node:assert/strict");
const fs = require("node:fs");
const loadHighs = require("highs");
const wasm = fs.readFileSync(require.resolve("highs/runtime"));
const problem = "Maximize\n obj: x\nSubject To\n c: x <= 2\nBounds\n 0 <= x\nEnd";

(async () => {
  for (const options of [
    { wasmBinary: wasm },
    { wasmModule: new WebAssembly.Module(wasm) },
  ]) {
    const highs = await loadHighs({ ...options, print() {}, printErr() {} });
    assert.equal(typeof highs.createModel, "function");
    assert.equal(highs.solve(problem).ObjectiveValue, 2);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`,
  );
  run(process.execPath, [commonJsTest], { cwd: temporaryDirectory });

  const moduleTest = path.join(temporaryDirectory, "consumer.mjs");
  fs.writeFileSync(
    moduleTest,
    String.raw`
import assert from "node:assert/strict";
import loadHighs from "highs";

const highs = await loadHighs({ print() {}, printErr() {} });
assert.equal(typeof highs.solve, "function");
assert.equal(typeof highs.createModel, "function");
`,
  );
  run(process.execPath, [moduleTest], { cwd: temporaryDirectory });

  process.stdout.write(
    `Packed package passed CommonJS, ESM, wasmBinary, wasmModule, and notice-file checks.\n`,
  );
} finally {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}
