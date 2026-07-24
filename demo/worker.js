importScripts("highs.js");

const runtimePromise = Module();

let model;

/* ── Utility Helpers ── */

function arrayFrom(v) {
  return v ? Array.from(v) : [];
}

function describeStatus(highs, code) {
  const entry = Object.entries(highs.constants.modelStatus).find(
    ([, v]) => v === code,
  );
  return entry ? entry[0] : `code ${code}`;
}

function resolveObjectiveSense(highs, name) {
  const sense = highs.constants.objectiveSense[name];
  if (sense === undefined) throw new TypeError(`Unknown objective sense: ${name}`);
  return sense;
}

function resolveVariableTypes(highs, names) {
  return names.map((name) => {
    const type = highs.constants.variableType[name];
    if (type === undefined) throw new TypeError(`Unknown variable type: ${name}`);
    return type;
  });
}

function describeIisBound(highs, code) {
  const name = Object.entries(highs.constants.iis).find(
    ([key, value]) => key.startsWith("bound") && value === code,
  )?.[0];
  return name ? name.slice("bound".length).toLowerCase() : `code ${code}`;
}

function modelSnapshot(model) {
  const { numCols, numRows } = model.getDimensions();
  const columns = numCols ? model.getCols({ kind: "range", from: 0, to: numCols - 1 }) : { cost: [], lower: [], upper: [] };
  const rows = numRows ? model.getRows({ kind: "range", from: 0, to: numRows - 1 }) : { lower: [], upper: [] };
  return {
    colNames: Array.from({ length: numCols }, (_, index) => model.getColName(index) || `x${index}`),
    rowNames: Array.from({ length: numRows }, (_, index) => model.getRowName(index) || `r${index}`),
    colCost: arrayFrom(columns.cost),
    colLower: arrayFrom(columns.lower),
    colUpper: arrayFrom(columns.upper),
    rowLower: arrayFrom(rows.lower),
    rowUpper: arrayFrom(rows.upper),
  };
}

function rangingRecord(record) {
  return {
    value: arrayFrom(record.value),
    objective: arrayFrom(record.objective),
    inVariable: arrayFrom(record.inVariable),
    outVariable: arrayFrom(record.outVariable),
  };
}

/* ── Legacy Solve ── */

async function solveLP(data) {
  const highs = await runtimePromise;
  const t0 = performance.now();
  const result = highs.solve(data.problem, { output_flag: false });
  const elapsed = (performance.now() - t0).toFixed(1);
  return { elapsed, result: JSON.parse(JSON.stringify(result)) };
}

/* ── Extended API: Build & Solve (LP) ── */

async function buildSolve(data) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    return { error: "This build does not include the extended API." };
  }

  if (model) {
    model.dispose();
    model = null;
  }
  model = highs.createModel();

  const { colCost, colLower, colUpper, rowLower, rowUpper, starts, indices, values } = data;

  model.passModel({
    numCols: colCost.length,
    numRows: rowLower.length,
    sense: resolveObjectiveSense(highs, data.sense),
    colCost,
    colLower,
    colUpper,
    rowLower,
    rowUpper,
    matrix: {
      format: "csc",
      numRows: rowLower.length,
      numCols: colCost.length,
      starts,
      indices,
      values,
    },
  });

  model.options.set("output_flag", false);
  const t0 = performance.now();
  const run = model.run();
  const elapsed = (performance.now() - t0).toFixed(1);

  return {
    elapsed,
    status: run.status,
    modelStatus: describeStatus(highs, run.modelStatus),
    objective: model.getObjectiveValue(),
    primal: arrayFrom(model.getSolution().colValue),
    dual: arrayFrom(model.getSolution().colDual),
    basis: {
      colStatus: arrayFrom(model.getBasis().colStatus),
      rowStatus: arrayFrom(model.getBasis().rowStatus),
    },
  };
}

/* ── Extended API: Quadratic Programming (QP) ── */

async function qpSolve(data) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    return { error: "This build does not include the extended API." };
  }

  if (model) {
    model.dispose();
    model = null;
  }
  model = highs.createModel();

  const { colCost, colLower, colUpper, rowLower, rowUpper, starts, indices, values, hessian } = data;

  model.passModel({
    numCols: colCost.length,
    numRows: rowLower.length,
    sense: resolveObjectiveSense(highs, data.sense),
    colCost,
    colLower,
    colUpper,
    rowLower,
    rowUpper,
    matrix: {
      format: "csc",
      numRows: rowLower.length,
      numCols: colCost.length,
      starts,
      indices,
      values,
    },
  });

  if (hessian) {
    model.passHessian({
      format: hessian.format || "triangular",
      dimension: hessian.dimension || colCost.length,
      starts: hessian.starts,
      indices: hessian.indices,
      values: hessian.values,
    });
  }

  model.options.set("output_flag", false);
  const t0 = performance.now();
  const run = model.run();
  const elapsed = (performance.now() - t0).toFixed(1);

  return {
    elapsed,
    status: run.status,
    modelStatus: describeStatus(highs, run.modelStatus),
    objective: model.getObjectiveValue(),
    primal: arrayFrom(model.getSolution().colValue),
  };
}

/* ── Extended API: MIP Solve ── */

async function mipSolve(data) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    return { error: "This build does not include the extended API." };
  }

  if (model) {
    model.dispose();
    model = null;
  }
  model = highs.createModel();

  model.passModel({
    numCols: data.colCost.length,
    numRows: data.rowLower.length,
    sense: resolveObjectiveSense(highs, data.sense),
    colCost: data.colCost,
    colLower: data.colLower,
    colUpper: data.colUpper,
    rowLower: data.rowLower,
    rowUpper: data.rowUpper,
    matrix: {
      format: "csc",
      numRows: data.rowLower.length,
      numCols: data.colCost.length,
      starts: data.starts,
      indices: data.indices,
      values: data.values,
    },
    integrality: resolveVariableTypes(highs, data.integrality),
  });

  model.options.set("output_flag", false);
  const t0 = performance.now();
  const run = model.run();
  const elapsed = (performance.now() - t0).toFixed(1);

  const sol = model.getSolution();
  const obj = model.getObjectiveValue();
  const info = model.info;

  return {
    elapsed,
    status: run.status,
    modelStatus: describeStatus(highs, run.modelStatus),
    objective: obj,
    primal: arrayFrom(sol.colValue),
    mipGap: typeof info.get === "function" ? Number(info.get("mip_gap")) : undefined,
  };
}

/* ── Extended API: Ranging ── */

async function doRanging(data) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    return { error: "This build does not include the extended API." };
  }

  if (model) {
    model.dispose();
    model = null;
  }
  model = highs.createModel({ format: "lp", data: data.problem });
  model.options.set("output_flag", false);
  const t0 = performance.now();
  const run = model.run();
  const elapsed = (performance.now() - t0).toFixed(1);

  if (run.modelStatus !== highs.constants.modelStatus.optimal) {
    return {
      modelStatus: describeStatus(highs, run.modelStatus),
      elapsed,
      note: "Ranging is only available for optimal solutions.",
    };
  }

  const ranging = model.getRanging();
  const solution = model.getSolution();
  const basis = model.getBasis();
  return {
    modelStatus: describeStatus(highs, run.modelStatus),
    elapsed,
    objective: model.getObjectiveValue(),
    sense: model.getObjectiveSense() === highs.constants.objectiveSense.maximize ? "maximize" : "minimize",
    model: modelSnapshot(model),
    solution: {
      colValue: arrayFrom(solution.colValue),
      rowValue: arrayFrom(solution.rowValue),
      colDual: arrayFrom(solution.colDual),
      rowDual: arrayFrom(solution.rowDual),
    },
    basis: {
      colStatus: arrayFrom(basis.colStatus),
      rowStatus: arrayFrom(basis.rowStatus),
    },
    ranging: {
      colCostDown: rangingRecord(ranging.colCostDown),
      colCostUp: rangingRecord(ranging.colCostUp),
      colBoundDown: rangingRecord(ranging.colBoundDown),
      colBoundUp: rangingRecord(ranging.colBoundUp),
      rowBoundDown: rangingRecord(ranging.rowBoundDown),
      rowBoundUp: rangingRecord(ranging.rowBoundUp),
    },
  };
}

/* ── Extended API: Options ── */

async function optionsList() {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    return { error: "This build does not include the extended API." };
  }
  if (!model) model = highs.createModel();

  const names = model.options.names();
  const rows = [];
  for (const name of names) {
    try {
      const d = model.options.describe(name);
      rows.push({ name, type: d.type, current: d.current, default: d.default, min: d.minimum, max: d.maximum });
    } catch {
      /* ignore options that cannot be described */
    }
  }
  return { rows };
}

async function optionsDescribe(data) {
  const highs = await runtimePromise;
  if (!model) model = highs.createModel();
  try {
    const d = model.options.describe(data.name);
    return { name: d.name, type: d.type, current: d.current, default: d.default, min: d.minimum, max: d.maximum };
  } catch (e) {
    return { error: e.message || String(e) };
  }
}

async function optionsSet(data) {
  const highs = await runtimePromise;
  if (!model) model = highs.createModel();
  try {
    model.options.set(data.name, data.value);
    const d = model.options.describe(data.name);
    return { name: d.name, type: d.type, current: d.current, default: d.default };
  } catch (e) {
    return { error: e.message || String(e) };
  }
}

async function optionsReset() {
  const highs = await runtimePromise;
  if (!model) model = highs.createModel();
  model.options.reset();
  return { ok: true };
}

/* ── Extended API: IIS ── */

async function doIis(data) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    return { error: "This build does not include the extended API." };
  }

  if (model) {
    model.dispose();
    model = null;
  }
  model = highs.createModel({ format: "lp", data: data.problem });
  model.options.set("output_flag", false);
  model.options.set("iis_strategy", 8);
  const t0 = performance.now();
  const run = model.run();

  if (run.modelStatus !== highs.constants.modelStatus.infeasible) {
    return {
      modelStatus: describeStatus(highs, run.modelStatus),
      objective: run.modelStatus === highs.constants.modelStatus.optimal ? model.getObjectiveValue() : undefined,
      primal: run.modelStatus === highs.constants.modelStatus.optimal ? arrayFrom(model.getSolution().colValue) : undefined,
      note: run.modelStatus === highs.constants.modelStatus.optimal || run.modelStatus === highs.constants.modelStatus.unbounded
        ? "The model is feasible, so there is no conflict to isolate."
        : "Infeasibility was not proved, so no IIS was requested.",
      elapsed: (performance.now() - t0).toFixed(1),
    };
  }

  try {
    const iis = model.getIis();
    const snapshot = modelSnapshot(model);
    return {
      modelStatus: describeStatus(highs, run.modelStatus),
      elapsed: (performance.now() - t0).toFixed(1),
      iis: {
        ...snapshot,
        colIndices: arrayFrom(iis.colIndex),
        rowIndices: arrayFrom(iis.rowIndex),
        colBoundCodes: arrayFrom(iis.colBound),
        rowBoundCodes: arrayFrom(iis.rowBound),
        colBounds: arrayFrom(iis.colBound).map((code) => describeIisBound(highs, code)),
        rowBounds: arrayFrom(iis.rowBound).map((code) => describeIisBound(highs, code)),
        colStatus: arrayFrom(iis.colStatus),
        rowStatus: arrayFrom(iis.rowStatus),
      },
    };
  } catch (e) {
    return {
      modelStatus: describeStatus(highs, run.modelStatus),
      error: `IIS computation failed: ${e.message || e}`,
    };
  }
}

/* ── Extended API: Model I/O ── */

async function ioLoad(data) {
  const highs = await runtimePromise;
  if (typeof highs.createModel !== "function") {
    return { error: "This build does not include the extended API." };
  }
  if (model) {
    model.dispose();
    model = null;
  }
  model = highs.createModel({ format: "lp", data: data.problem });
  return { message: "Model loaded successfully." };
}

async function ioExport() {
  const highs = await runtimePromise;
  if (!model) return { error: "Load a model first." };
  return { lp: model.exportModel("lp") };
}

async function ioSolve() {
  const highs = await runtimePromise;
  if (!model) return { error: "Load a model first." };
  model.options.set("output_flag", false);
  const t0 = performance.now();
  const run = model.run();
  return {
    status: run.status,
    modelStatus: describeStatus(highs, run.modelStatus),
    objective: model.getObjectiveValue(),
    primal: arrayFrom(model.getSolution().colValue),
    elapsed: (performance.now() - t0).toFixed(1),
  };
}

/* ── Message Router ── */

const handlers = {
  solveLP,
  buildSolve,
  qpSolve,
  mipSolve,
  doRanging,
  optionsList,
  optionsDescribe,
  optionsSet,
  optionsReset,
  doIis,
  ioLoad,
  ioExport,
  ioSolve,
};

self.addEventListener("message", async ({ data }) => {
  const { id, action } = data;
  const handler = handlers[action];
  if (!handler) {
    self.postMessage({ id, error: `Unknown action: ${action}` });
    return;
  }
  try {
    const result = await handler(data);
    self.postMessage({ id, ...result });
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
  }
});
