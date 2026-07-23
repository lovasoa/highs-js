#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "api/highs-c-api.json");
const exportsPath = join(root, "exported_functions.json");
const expandedPath = join(root, "api/highs-c-api.generated.json");

function fail(message) {
  throw new Error(message);
}

function parseArguments(argv) {
  const result = { check: false, writeExports: false, outDir: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--check") result.check = true;
    else if (argument === "--write-exports") result.writeExports = true;
    else if (argument === "--out-dir") result.outDir = argv[++index];
    else if (argument === "--help") {
      console.log(
        "Usage: node scripts/generate-highs-api.mjs [--check] [--out-dir DIR] [--write-exports]",
      );
      process.exit(0);
    } else fail(`Unknown argument: ${argument}`);
  }
  if (result.outDir && result.writeExports) {
    fail("--out-dir and write modes are mutually exclusive");
  }
  if (!result.check && !result.outDir && !result.writeExports) {
    fail("Choose --check, --out-dir DIR, or --write-exports");
  }
  return result;
}

function normalizeSpace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function splitParameters(value) {
  const normalized = normalizeSpace(value);
  if (normalized === "void" || normalized === "") return [];
  const parameters = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    if (normalized[index] === "(") depth += 1;
    if (normalized[index] === ")") depth -= 1;
    if (normalized[index] === "," && depth === 0) {
      parameters.push(normalized.slice(start, index).trim());
      start = index + 1;
    }
  }
  parameters.push(normalized.slice(start).trim());
  return parameters;
}

function parseHeader(header, deprecatedBoundary) {
  const boundaryIndex = header.indexOf(deprecatedBoundary);
  if (boundaryIndex < 0) fail(`Could not find deprecated boundary: ${deprecatedBoundary}`);
  const stable = header.slice(0, boundaryIndex).replace(/\/\*[\s\S]*?\*\//g, "");
  const declarations = [];
  const pattern = /(?:^|\n)\s*((?:const\s+)?(?:void|char|double|HighsInt)(?:\s*\*)?)\s+(Highs_[A-Za-z0-9_]+)\s*\(([\s\S]*?)\)\s*;/g;
  let match;
  while ((match = pattern.exec(stable)) !== null) {
    const returnType = normalizeSpace(match[1]).replace(/\s+\*/g, "*");
    const parameters = splitParameters(match[3]);
    declarations.push({
      cName: match[2],
      returnType,
      parameters,
      signature: `${returnType} ${match[2]}(${parameters.join(", ")})`,
    });
  }
  return declarations;
}

function parseConstants(header, deprecatedBoundary) {
  const boundaryIndex = header.indexOf(deprecatedBoundary);
  if (boundaryIndex < 0) fail(`Could not find deprecated boundary: ${deprecatedBoundary}`);
  const stable = header.slice(0, boundaryIndex).replace(/\/\*[\s\S]*?\*\//g, "");
  const constants = [];
  const pattern = /(?:^|\n)\s*(?:static\s+)?const\s+HighsInt\s+(kHighs[A-Za-z0-9_]+)\s*=\s*(-?\d+)\s*;/g;
  let match;
  while ((match = pattern.exec(stable)) !== null) {
    constants.push({ cName: match[1], value: Number(match[2]), jsName: match[1] });
  }
  return constants;
}

function defaultRawName(cName) {
  const bare = cName.slice("Highs_".length);
  return bare[0].toLowerCase() + bare.slice(1);
}

function expandConstants(policy, constants) {
  const values = new Map(constants.map((entry) => [entry.cName, entry.value]));
  const classified = new Set();
  const contract = {};
  for (const [groupName, members] of Object.entries(policy.constantPolicy.groups)) {
    contract[groupName] = {};
    for (const [jsName, cName] of Object.entries(members)) {
      if (!values.has(cName)) fail(`Unknown constant in policy: ${cName}`);
      if (classified.has(cName)) fail(`Constant classified more than once: ${cName}`);
      classified.add(cName);
      contract[groupName][jsName] = values.get(cName);
    }
  }
  for (const cName of Object.keys(policy.constantPolicy.excluded)) {
    if (!values.has(cName)) fail(`Unknown excluded constant: ${cName}`);
    if (classified.has(cName)) fail(`Constant classified more than once: ${cName}`);
    classified.add(cName);
  }
  const missing = constants
    .map((entry) => entry.cName)
    .filter((cName) => !classified.has(cName));
  if (missing.length) fail(`Unclassified stable C constants: ${missing.join(", ")}`);
  return contract;
}

function expandManifest(policy, declarations, constants) {
  const declarationByName = new Map(declarations.map((entry) => [entry.cName, entry]));
  const classified = new Map();
  for (const group of policy.groups) {
    for (const cName of group.functions) {
      if (classified.has(cName)) fail(`${cName} is classified more than once`);
      if (!declarationByName.has(cName)) fail(`${cName} is not a stable function in ${policy.header}`);
      classified.set(cName, group);
    }
  }
  const unclassified = declarations
    .map((entry) => entry.cName)
    .filter((cName) => !classified.has(cName));
  if (unclassified.length) fail(`Unclassified stable C functions: ${unclassified.join(", ")}`);

  const unknownOverrides = Object.keys(policy.overrides).filter(
    (cName) => !declarationByName.has(cName),
  );
  if (unknownOverrides.length) fail(`Overrides for unknown functions: ${unknownOverrides.join(", ")}`);

  const functions = declarations.map((declaration) => {
    const group = classified.get(declaration.cName);
    const override = policy.overrides[declaration.cName] || {};
    const rawName = Object.prototype.hasOwnProperty.call(override, "rawName")
      ? override.rawName
      : defaultRawName(declaration.cName);
    const defaultJs =
      group.exposure === "raw-runtime" && rawName
        ? [`RawRuntimeApi.${rawName}`]
        : group.exposure === "raw-model" && rawName
          ? [`RawModel.${rawName}`]
          : [];
    return {
      ...declaration,
      family: group.family,
      exposure: group.exposure,
      rawName,
      js: override.js ?? defaultJs,
      wasmExport: group.wasmExport ?? policy.defaults.wasmExport,
      returnPolicy: group.returnPolicy ?? policy.defaults.returnPolicy,
      arrayPolicy: policy.defaults.arrayPolicy,
      ...override,
    };
  });
  const rawRuntimeMethods = new Set();
  const rawModelMethods = new Set();
  for (const entry of functions) {
    for (const js of entry.js) {
      const match = /^(RawRuntimeApi|RawModel)\.([A-Za-z0-9_]+)/.exec(js);
      if (!match) continue;
      (match[1] === "RawRuntimeApi" ? rawRuntimeMethods : rawModelMethods).add(
        match[2],
      );
    }
  }
  rawRuntimeMethods.add("createModel");
  rawModelMethods.add("dispose");

  return {
    schemaVersion: policy.schemaVersion,
    generatedFrom: policy.header,
    deprecatedFunctionsIncluded: false,
    functionCount: functions.length,
    constantCount: constants.length,
    constants,
    constantContract: expandConstants(policy, constants),
    runtimeContract: {
      rawRuntimeMethods: [...rawRuntimeMethods].sort(),
      rawModelMethods: [...rawModelMethods].sort(),
    },
    functions,
  };
}

function renderExports(policy, expanded) {
  const names = [
    ...expanded.functions.filter((entry) => entry.wasmExport).map((entry) => `_${entry.cName}`),
    ...policy.compatibilityExports,
    ...policy.generatedExports,
    ...policy.bridgeExports,
  ];
  return `${JSON.stringify([...new Set(names)].sort(), null, 2)}\n`;
}

async function writeOutput(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

const arguments_ = parseArguments(process.argv.slice(2));
const policy = JSON.parse(await readFile(manifestPath, "utf8"));
const header = await readFile(join(root, policy.header), "utf8");
const declarations = parseHeader(header, policy.deprecatedBoundary);
const constants = parseConstants(header, policy.deprecatedBoundary);
const expanded = expandManifest(policy, declarations, constants);
const expandedJson = `${JSON.stringify(expanded, null, 2)}\n`;
const generatedExports = renderExports(policy, expanded);

if (arguments_.check) {
  const second = expandManifest(policy, parseHeader(header, policy.deprecatedBoundary), parseConstants(header, policy.deprecatedBoundary));
  if (`${JSON.stringify(second, null, 2)}\n` !== expandedJson) fail("Manifest generation is not deterministic");
  if (renderExports(policy, second) !== generatedExports) fail("Export generation is not deterministic");
  if ((await readFile(expandedPath, "utf8")) !== expandedJson)
    fail("api/highs-c-api.generated.json has drifted; run --write-exports");
  if ((await readFile(exportsPath, "utf8")) !== generatedExports)
    fail("exported_functions.json has drifted; run --write-exports");
  JSON.parse(generatedExports);
  console.log(
    `Validated ${expanded.functionCount} stable C functions and ${expanded.constantCount} numeric constants; ${expanded.functions.filter((entry) => entry.wasmExport).length} WASM exports; deterministic output.`,
  );
}

if (arguments_.outDir) {
  const outputRoot = resolve(root, arguments_.outDir);
  await writeOutput(join(outputRoot, "highs-c-api.generated.json"), expandedJson);
  await writeOutput(join(outputRoot, "exported_functions.json"), generatedExports);
}

if (arguments_.writeExports) {
  await writeOutput(expandedPath, expandedJson);
  await writeOutput(exportsPath, generatedExports);
}
