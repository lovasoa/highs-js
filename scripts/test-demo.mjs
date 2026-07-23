#!/usr/bin/env node
/**
 * Headless-browser smoke test for the highs-js demo page.
 *
 * Serves the demo/ directory over HTTP, loads it in Chromium via Playwright,
 * and verifies that:
 *
 *  1. HiGHS loads successfully (the initial legacy LP solve completes).
 *  2. Every extended-API tab works — no "This build does not include the
 *     extended API" error ever appears.
 *
 * The demo directory must contain fresh build artifacts (highs.js, highs.wasm)
 * before running.  In CI these are copied from build/; locally you can run:
 *
 *   cp build/highs.* demo/
 *
 * Usage:
 *   node scripts/test-demo.mjs
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEMO_DIR = join(ROOT, "demo");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

/* ── pre-flight: ensure build artifacts are present ── */

for (const f of ["highs.js", "highs.wasm", "worker.js", "index.html", "demo.js"]) {
  if (!existsSync(join(DEMO_DIR, f))) {
    console.error(`Missing ${f} in demo/. Run "cp build/highs.* demo/" first.`);
    process.exit(1);
  }
}

/* ── static file server ── */

function createStaticServer(root) {
  return createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split("?")[0]);
      if (urlPath === "/") urlPath = "/index.html";
      // Prevent path traversal.
      const filePath = join(root, urlPath);
      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
      res.end(data);
    } catch (err) {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}

/* ── test harness ── */

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  ok:  ${message}`);
  }
}

async function waitForOutput(page, selector, { timeout = 15000 } = {}) {
  // Wait until the output element is no longer in "placeholder" or "loading" state.
  await page.waitForFunction(
    (sel) => {
      const el = document.getElementById(sel);
      if (!el) return false;
      const text = el.textContent || "";
      if (el.classList.contains("placeholder")) return false;
      if (/loading|Loading|Solving|Computing|Fetching|Setting|^\s*$/.test(text)) return false;
      return true;
    },
    selector.replace("#", ""),
    { timeout },
  );
}

async function checkNoExtendedApiError(page, label) {
  const bodyText = await page.evaluate(() => document.body.innerText);
  assert(
    !bodyText.includes("This build does not include the extended API"),
    `${label}: extended API is available (no "This build does not include the extended API" error)`,
  );
}

async function checkOutputNotError(page, outputId, label) {
  const isError = await page.evaluate((id) => {
    const el = document.getElementById(id);
    return el ? el.classList.contains("error") : true;
  }, outputId);
  assert(!isError, `${label}: output has no error class`);
}

/* ── main ── */

async function main() {
  const { chromium } = await import("playwright");

  const server = createStaticServer(DEMO_DIR);
  const port = await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
  const baseUrl = `http://127.0.0.1:${port}/`;
  console.log(`Serving demo from ${DEMO_DIR} at ${baseUrl}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Collect console errors.
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  try {
    console.log("\n─ Loading demo page ─");
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });

    // ── Test 1: Legacy LP solve (runs automatically on page load) ──
    console.log("\n─ Tab: LP Format (legacy API) ─");
    await waitForOutput(page, "#lp-output", { timeout: 30000 });
    await checkOutputNotError(page, "lp-output", "LP solve");
    await checkNoExtendedApiError(page, "LP solve");
    const lpText = await page.evaluate(() => document.getElementById("lp-output").textContent);
    assert(lpText.length > 10, "LP solve produced output");
    assert(/Status|Optimal|Objective/i.test(lpText), "LP solve output looks like a result");

    // ── Test 2: Build & Solve (extended API) ──
    console.log("\n─ Tab: Build & Solve (extended API) ─");
    await page.click('[data-tab="build"]');
    await page.waitForTimeout(200);
    await page.click("#build-load");
    await page.click("#build-solve");
    await waitForOutput(page, "#build-output");
    await checkOutputNotError(page, "build-output", "Build & Solve");
    await checkNoExtendedApiError(page, "Build & Solve");
    const buildText = await page.evaluate(() => document.getElementById("build-output").textContent);
    assert(/Status|Objective/i.test(buildText), "Build & Solve produced a result");

    // ── Test 3: MIP ──
    console.log("\n─ Tab: MIP ──");
    await page.click('[data-tab="mip"]');
    await page.waitForTimeout(200);
    await page.click("#mip-solve");
    await waitForOutput(page, "#mip-output");
    await checkOutputNotError(page, "mip-output", "MIP solve");
    await checkNoExtendedApiError(page, "MIP solve");
    const mipText = await page.evaluate(() => document.getElementById("mip-output").textContent);
    assert(/Status|Objective|Selected/i.test(mipText), "MIP solve produced a result");

    // ── Test 4: Ranging ──
    console.log("\n─ Tab: Ranging ─");
    await page.click('[data-tab="ranging"]');
    await page.waitForTimeout(200);
    await page.click("#ranging-solve");
    await waitForOutput(page, "#ranging-output");
    await checkOutputNotError(page, "ranging-output", "Ranging");
    await checkNoExtendedApiError(page, "Ranging");

    // ── Test 5: Options ──
    console.log("\n─ Tab: Options ─");
    await page.click('[data-tab="options"]');
    // Options load lazily when the tab is first opened.
    await page.waitForFunction(() => {
      const body = document.getElementById("opts-body");
      return body && body.children.length > 10;
    }, { timeout: 15000 });
    const optCount = await page.evaluate(() => document.getElementById("opts-body").children.length);
    assert(optCount > 50, `Options table loaded (${optCount} options)`);
    await checkNoExtendedApiError(page, "Options");

    // ── Test 6: IIS ──
    console.log("\n─ Tab: IIS ─");
    await page.click('[data-tab="iis"]');
    await page.waitForTimeout(200);
    await page.click("#iis-solve");
    await waitForOutput(page, "#iis-output");
    await checkOutputNotError(page, "iis-output", "IIS");
    await checkNoExtendedApiError(page, "IIS");

    // ── Test 7: Model I/O ──
    console.log("\n─ Tab: Model I/O ─");
    await page.click('[data-tab="io"]');
    await page.waitForTimeout(200);
    await page.click("#io-load");
    await waitForOutput(page, "#io-output");
    await checkOutputNotError(page, "io-output", "Model I/O load");
    await checkNoExtendedApiError(page, "Model I/O");
    // Also test the solve button.
    await page.click("#io-solve");
    await waitForOutput(page, "#io-output");
    await checkOutputNotError(page, "io-output", "Model I/O solve");

    // ── Console errors ──
    console.log("\n─ Console errors ─");
    if (consoleErrors.length > 0) {
      console.error(`  FAIL: ${consoleErrors.length} console errors detected:`);
      for (const e of consoleErrors.slice(0, 10)) console.error(`    ${e}`);
      failures += consoleErrors.length;
    } else {
      console.log("  ok:  no console errors");
    }

    // ── Final screenshot for debugging ──
    const screenshotPath = join(ROOT, "build", "demo-screenshot.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\nScreenshot saved to ${screenshotPath}`);
  } finally {
    await browser.close();
    server.close();
  }

  console.log("");
  if (failures > 0) {
    console.error(`✗ ${failures} test(s) failed.`);
    process.exit(1);
  } else {
    console.log("✓ All demo tests passed.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
