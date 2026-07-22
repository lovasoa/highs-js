import fs from "node:fs";

const MAX_GZIP_GROWTH_PERCENT = 10;
const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  throw new Error("Usage: node benchmarks/compare-size.mjs BASELINE.json CANDIDATE.json");
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
if (!(baseline.totalGzipBytes > 0) || !(candidate.totalGzipBytes > 0)) {
  throw new Error("Reports must contain positive totalGzipBytes values");
}

const growthPercent =
  ((candidate.totalGzipBytes - baseline.totalGzipBytes) /
    baseline.totalGzipBytes) *
  100;
const result = {
  thresholdPercent: MAX_GZIP_GROWTH_PERCENT,
  baselineGzipBytes: baseline.totalGzipBytes,
  candidateGzipBytes: candidate.totalGzipBytes,
  growthPercent,
  passed: growthPercent <= MAX_GZIP_GROWTH_PERCENT,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.passed) process.exitCode = 1;
