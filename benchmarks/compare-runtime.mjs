import fs from "node:fs";

const MAX_REGRESSION_PERCENT = 5;
const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  throw new Error("Usage: node benchmarks/compare-runtime.mjs BASELINE.json CANDIDATE.json");
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
for (const key of ["mode", "workload"]) {
  if (baseline[key] !== candidate[key]) {
    throw new Error(`Cannot compare different ${key} values: ${baseline[key]} and ${candidate[key]}`);
  }
}
if (!(baseline.medianMs > 0) || !(candidate.medianMs > 0)) {
  throw new Error("Reports must contain positive medianMs values");
}

const regressionPercent =
  ((candidate.medianMs - baseline.medianMs) / baseline.medianMs) * 100;
const result = {
  thresholdPercent: MAX_REGRESSION_PERCENT,
  baselineMedianMs: baseline.medianMs,
  candidateMedianMs: candidate.medianMs,
  regressionPercent,
  passed: regressionPercent <= MAX_REGRESSION_PERCENT,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.passed) process.exitCode = 1;
