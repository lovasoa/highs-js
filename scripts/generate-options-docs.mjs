#!/usr/bin/env node
/**
 * Generates docs/options.md from the live HiGHS runtime.
 *
 * Loads the built highs.js, creates a model, iterates every option, and writes
 * a Markdown reference table.  Run after `npm run build`:
 *
 *   node scripts/generate-options-docs.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const HIGHS_JS = join(ROOT, "build", "highs.js");
const OUT_FILE = join(ROOT, "docs", "options.md");

if (!existsSync(HIGHS_JS)) {
  console.error("build/highs.js not found. Run `npm run build` first.");
  process.exit(1);
}

async function main() {
  // Load the CJS module — it exports a factory that returns the runtime.
  const require = createRequire(import.meta.url);
  const loadHighs = require(HIGHS_JS);
  const wasmBinary = await readFile(join(ROOT, "build", "highs.wasm"));
  const highs = await loadHighs({ wasmBinary });

  const model = highs.createModel();
  const names = model.options.names();

  const rows = [];
  for (const name of names) {
    try {
      const d = model.options.describe(name);
      rows.push({
        name,
        type: d.type,
        current: JSON.stringify(d.current),
        default: JSON.stringify(d.default),
        min: d.minimum !== undefined ? JSON.stringify(d.minimum) : "",
        max: d.maximum !== undefined ? JSON.stringify(d.maximum) : "",
      });
    } catch {
      /* skip options that fail to describe */
    }
  }
  model.dispose();

  const typeOrder = { boolean: 0, integer: 1, double: 2, string: 3 };
  rows.sort((a, b) => {
    const t = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    return t !== 0 ? t : a.name.localeCompare(b.name);
  });

  const lines = [
    "---",
    "layout: docs",
    "title: Solver options reference",
    "description: Complete reference of every HiGHS option available in highs-js.",
    "permalink: /docs/options/",
    "---",
    "",
    "# Solver options reference",
    "",
    "These are all the options exposed by the HiGHS runtime compiled into",
    "highs-js.  You can browse them live (and change them) in the",
    "[Options tab of the web demo]({{ '/' | relative_url }}).",
    "",
    "Options use HiGHS `snake_case` names.  Set them on a persistent model via",
    "`model.options.set(name, value)` or `model.options.set({ ... })`.  The",
    "single-threaded WebAssembly build rejects thread, parallel, and file-path",
    "options — those are intentionally excluded from this list.",
    "",
    "| Name | Type | Default | Min | Max |",
    "| --- | --- | --- | --- | --- |",
  ];

  for (const r of rows) {
    lines.push(`| \`${r.name}\` | ${r.type} | ${r.default} | ${r.min} | ${r.max} |`);
  }

  lines.push("");
  lines.push(`_Generated from ${rows.length} options._`);

  await writeFile(OUT_FILE, lines.join("\n") + "\n", "utf8");
  console.log(`Wrote ${OUT_FILE} (${rows.length} options).`);
}

main().catch((err) => {
  console.error("Failed to generate options docs:", err);
  process.exit(1);
});
