import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const directory = path.resolve(process.argv[2] ?? "build");
const names = ["highs.js", "highs.mjs", "highs.wasm"];
const artifacts = {};
for (const name of names) {
  const file = path.join(directory, name);
  if (!fs.existsSync(file)) continue;
  const bytes = fs.readFileSync(file);
  artifacts[name] = {
    bytes: bytes.byteLength,
    gzipBytes: zlib.gzipSync(bytes, { level: 9 }).byteLength,
  };
}
if (!artifacts["highs.wasm"] || !artifacts["highs.js"]) {
  throw new Error(`${directory} must contain highs.js and highs.wasm`);
}

process.stdout.write(
  `${JSON.stringify(
    {
      schemaVersion: 1,
      directory,
      artifacts,
      totalBytes: Object.values(artifacts).reduce((sum, item) => sum + item.bytes, 0),
      totalGzipBytes: Object.values(artifacts).reduce(
        (sum, item) => sum + item.gzipBytes,
        0,
      ),
    },
    null,
    2,
  )}\n`,
);
