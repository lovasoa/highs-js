import { createServer } from "node:http";
import { access, readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../demo");
const port = Number(process.env.PORT || 4173);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
};
const requiredAssets = [
  "highs.js",
  "highs.wasm",
  "index.html",
  "coi-serviceworker.js",
  "css/base.css",
  "css/examples.css",
  "css/navigation.css",
  "demo.js",
  "live-examples.js",
  "navigation.js",
  "worker-client.js",
  "ui.js",
  "model-data.js",
  "visualizations.js",
  "concepts/irreducible-infeasible-subsystem/index.html",
  ...[
    "solve-lp-text",
    "build-sparse-models",
    "mixed-integer-models",
    "portfolio-quadratic-program",
    "grid-multiple-objectives",
    "traveling-salesperson-callbacks",
    "lp-sensitivity-analysis",
    "inspect-solver-options",
    "diagnose-infeasibility",
    "import-export-model",
  ].flatMap((directory) => ["ui.js", "ui.template.html", "worker.js"].map((file) => `${directory}/${file}`)),
  "extended/index.html",
  "extended/demo.js",
  "extended/worker.js",
];

try {
  await Promise.all(requiredAssets.map((file) => access(resolve(root, file))));
} catch (error) {
  throw new Error(`Demo assets are missing. Run "npm run build:demo" first.\n${error}`);
}

const server = createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const filePath = resolve(root, `.${pathname}`);
    if (relative(root, filePath).startsWith("..")) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
