import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const build = resolve(root, "build");
const demo = resolve(root, "demo");

let runtime;
try {
  const loadHighs = (await import(pathToFileURL(resolve(build, "highs.js")).href)).default;
  runtime = await loadHighs({ locateFile: (file) => resolve(build, file) });
} catch (error) {
  throw new Error(`Cannot load build/highs.js. Run npm run build first.\n${error instanceof Error ? error.message : error}`);
}

if (typeof runtime.createModel !== "function" || !runtime.constants?.callbackType) {
  throw new Error("build/highs.js does not contain the extended API. Run npm run build before npm run build:demo.");
}

await mkdir(demo, { recursive: true });
await Promise.all([
  copyFile(resolve(build, "highs.js"), resolve(demo, "highs.js")),
  copyFile(resolve(build, "highs.wasm"), resolve(demo, "highs.wasm")),
]);
