import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const options = {
    module: "build/highs.js",
    mode: "legacy",
    fixture: "tests/life_goe.mod.lp",
    warmup: 3,
    samples: 21,
    iterations: 3,
    label: "working-tree",
  };
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]?.replace(/^--/, "");
    if (!(key in options) || argv[index + 1] === undefined) {
      throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    }
    options[key] = argv[index + 1];
  }
  for (const key of ["warmup", "samples", "iterations"]) {
    options[key] = Number.parseInt(options[key], 10);
    if (!Number.isSafeInteger(options[key]) || options[key] < 1) {
      throw new Error(`--${key} must be a positive integer`);
    }
  }
  if (!new Set(["legacy", "persistent"]).has(options.mode)) {
    throw new Error("--mode must be legacy or persistent");
  }
  return options;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

const options = parseArgs(process.argv.slice(2));
const root = path.resolve(import.meta.dirname, "..");
const modulePath = path.resolve(root, options.module);
const fixturePath = path.resolve(root, options.fixture);
const imported = await import(pathToFileURL(modulePath).href);
const loader = imported.default ?? imported;
if (typeof loader !== "function") throw new Error(`${modulePath} has no loader`);

const highs = await loader({ print: () => {}, printErr: () => {} });
const problem = fs.readFileSync(fixturePath);
let run;
let cleanup = () => {};

if (options.mode === "legacy") {
  run = () => highs.solve(problem, { output_flag: false, log_to_console: false });
} else {
  if (typeof highs.createModel !== "function") {
    throw new Error("persistent benchmark requested, but createModel is unavailable");
  }
  const model = highs.createModel({ format: "lp", data: problem });
  model.options.set({ output_flag: false, log_to_console: false });
  run = () => {
    model.clearSolver();
    model.run();
  };
  cleanup = () => model.dispose();
}

for (let index = 0; index < options.warmup; index += 1) run();
const samples = [];
for (let sample = 0; sample < options.samples; sample += 1) {
  const started = performance.now();
  for (let index = 0; index < options.iterations; index += 1) run();
  samples.push((performance.now() - started) / options.iterations);
}
cleanup();

process.stdout.write(
  `${JSON.stringify(
    {
      schemaVersion: 1,
      label: options.label,
      mode: options.mode,
      workload: path.relative(root, fixturePath),
      module: path.relative(root, modulePath),
      medianMs: median(samples),
      samplesMs: samples,
      iterationsPerSample: options.iterations,
    },
    null,
    2,
  )}\n`,
);
