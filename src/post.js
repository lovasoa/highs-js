let legacySolveSequence = 0;

Module.Highs_readModel = Module["cwrap"]("Highs_readModel", "number", [
  "number",
  "string",
]);
const Highs_setIntOptionValue = Module["cwrap"](
  "Highs_setIntOptionValue",
  "number",
  ["number", "string", "number"]
);
const Highs_setDoubleOptionValue = Module["cwrap"](
  "Highs_setDoubleOptionValue",
  "number",
  ["number", "string", "number"]
);
const Highs_setStringOptionValue = Module["cwrap"](
  "Highs_setStringOptionValue",
  "number",
  ["number", "string", "string"]
);
const Highs_setBoolOptionValue = Module["cwrap"](
  "Highs_setBoolOptionValue",
  "number",
  ["number", "string", "number"]
);
const Highs_getOptionType = Module["cwrap"]("Highs_getOptionType", "number", [
  "number",
  "string",
  "number",
]);

const Highs_getNumCol = Module["cwrap"]("Highs_getNumCol", "number", [
  "number",
]);
const Highs_getNumRow = Module["cwrap"]("Highs_getNumRow", "number", [
  "number",
]);
const Highs_getObjectiveValue = Module["cwrap"](
  "Highs_getObjectiveValue",
  "number",
  ["number"]
);
const Highs_getInfinity = Module["cwrap"]("Highs_getInfinity", "number", []);
const Highs_getSolution = Module["cwrap"]("Highs_getSolution", "number", [
  "number",
  "number",
  "number",
  "number",
  "number",
]);
const Highs_getBasis = Module["cwrap"]("Highs_getBasis", "number", [
  "number",
  "number",
  "number",
]);
const Highs_getColsByRange = Module["cwrap"](
  "Highs_getColsByRange",
  "number",
  [
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
  ]
);
const Highs_getRowsByRange = Module["cwrap"](
  "Highs_getRowsByRange",
  "number",
  [
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
  ]
);
const Highs_getColIntegrality = Module["cwrap"](
  "Highs_getColIntegrality",
  "number",
  ["number", "number", "number"]
);
const Highs_js_getColName = Module["cwrap"](
  "Highs_js_getColName",
  "number",
  ["number", "number", "number", "number", "number"]
);
const Highs_js_getRowName = Module["cwrap"](
  "Highs_js_getRowName",
  "number",
  ["number", "number", "number", "number", "number"]
);

const MODEL_STATUS_CODES = /** @type {const} */ ({
  0: "Not Set",
  1: "Load error",
  2: "Model error",
  3: "Presolve error",
  4: "Solve error",
  5: "Postsolve error",
  6: "Empty",
  7: "Optimal",
  8: "Infeasible",
  9: "Primal infeasible or unbounded",
  10: "Unbounded",
  11: "Bound on objective reached",
  12: "Target for objective reached",
  13: "Time limit reached",
  14: "Iteration limit reached",
  15: "Unknown",
});

/** @typedef {Object} Highs */

var /** @type {()=>Highs} */ _Highs_create,
  /** @type {(arg0:Highs)=>void} */ _Highs_run,
  /** @type {(arg0:Highs)=>void} */ _Highs_destroy,
  /** @type {(arg0:Highs)=>(keyof (typeof MODEL_STATUS_CODES))} */ _Highs_getModelStatus,
  /** @type {any} */ FS;

/**
 * Map HiGHS C API kHighsBasisStatus integers to the legacy text format.
 * 0=kLower, 1=kBasic, 2=kUpper, 3=kZero, 4=kNonbasic
 */
const BASIS_STATUS_RAW = { 0: "LB", 1: "BS", 2: "UB", 3: "FX" };
function basisLabel(basisCode, lower, upper) {
  if (basisCode === 3) return "FX";
  if (basisCode === 2 && lower === upper) return "FX";
  return BASIS_STATUS_RAW[basisCode] || "";
}

/**
 * Model statuses for which the solver did not produce a feasible
 * primal solution and therefore Primal/Status/Dual are omitted.
 */
const NO_SOLUTION_STATUSES = new Set([
  "Not Set",
  "Load error",
  "Model error",
  "Presolve error",
  "Solve error",
  "Postsolve error",
  "Empty",
  "Infeasible",
  "Unknown",
]);

/**
 * Solve a model in the CPLEX LP file format.
 * @param {string} model_str The problem to solve in the .lp format
 * @param {undefined | import("../types").HighsOptions} highs_options Options to pass the solver. See https://github.com/ERGO-Code/HiGHS/blob/v1.14.0/src/lp_data/HighsOptions.h
 * @returns {import("../types").HighsSolution} The solution
 */
Module["solve"] = function (model_str, highs_options) {
  const solveId = ++legacySolveSequence;
  const modelFilename = `highs-model-${solveId}.lp`;
  let highs;
  const allocations = [];

  /**
   * Allocate wasm memory and track it for cleanup.
   * @param {number} size
   * @returns {number}
   */
  function alloc(size) {
    const ptr = _malloc(size);
    if (!ptr) throw new Error("malloc failed");
    allocations.push(ptr);
    return ptr;
  }

  /**
   * Retrieve a column name via the bridge function.
   * @param {number} highsPtr
   * @param {number} index
   * @returns {string}
   */
  function getColName(highsPtr, index) {
    const reqPtr = alloc(Int32Array.BYTES_PER_ELEMENT);
    let st = Highs_js_getColName(highsPtr, index, 0, 0, reqPtr);
    if (st !== 0 && st !== 1) return "";
    const capacity = HEAP32[reqPtr >> 2];
    if (capacity <= 0) return "";
    const buf = _malloc(capacity);
    allocations.push(buf);
    st = Highs_js_getColName(highsPtr, index, buf, capacity, reqPtr);
    if (st !== 0 && st !== 1) return "";
    return UTF8ToString(buf);
  }

  /**
   * Retrieve a row name via the bridge function.
   * @param {number} highsPtr
   * @param {number} index
   * @returns {string}
   */
  function getRowName(highsPtr, index) {
    const reqPtr = alloc(Int32Array.BYTES_PER_ELEMENT);
    let st = Highs_js_getRowName(highsPtr, index, 0, 0, reqPtr);
    if (st !== 0 && st !== 1) return "";
    const capacity = HEAP32[reqPtr >> 2];
    if (capacity <= 0) return "";
    const buf = _malloc(capacity);
    allocations.push(buf);
    st = Highs_js_getRowName(highsPtr, index, buf, capacity, reqPtr);
    if (st !== 0 && st !== 1) return "";
    return UTF8ToString(buf);
  }

  try {
    FS.writeFile(modelFilename, model_str);
    highs = _Highs_create();
    if (!highs) throw new Error("Unable to create the HiGHS solver");
    assert_ok(
      () => Module.Highs_readModel(highs, modelFilename),
      "read LP model (see http://web.mit.edu/lpsolve/doc/CPLEX-format.htm)"
    );
    const options = highs_options || {};
    for (const option_name in options) {
      const option_value = options[option_name];
      const type = typeof option_value;
      let setoption;
      if (type === "number") setoption = setNumericOption;
      else if (type === "boolean") setoption = Highs_setBoolOptionValue;
      else if (type === "string") setoption = Highs_setStringOptionValue;
      else
        throw new Error(
          `Unsupported option value type ${option_value} for '${option_name}'`
        );
      assert_ok(
        () => setoption(highs, option_name, option_value),
        `set option '${option_name}'`
      );
    }
    assert_ok(() => _Highs_run(highs), "solve the problem");

    const statusCode = _Highs_getModelStatus(highs);
    const status = MODEL_STATUS_CODES[statusCode] || "Unknown";

    if (status === "Empty") {
      return { Columns: {}, Rows: [], ObjectiveValue: 0, Status: "Empty" };
    }

    const numCol = Highs_getNumCol(highs);
    const numRow = Highs_getNumRow(highs);
    const infinity = Highs_getInfinity();

    let objValue = Highs_getObjectiveValue(highs);
    if (Math.abs(objValue) >= infinity * 0.5) {
      objValue = objValue > 0 ? Infinity : -Infinity;
    }

    // Allocate solution buffers
    const colValuePtr =
      numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
    const colDualPtr =
      numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
    const rowValuePtr =
      numRow > 0 ? alloc(numRow * Float64Array.BYTES_PER_ELEMENT) : 0;
    const rowDualPtr =
      numRow > 0 ? alloc(numRow * Float64Array.BYTES_PER_ELEMENT) : 0;

    assert_ok(
      () =>
        Highs_getSolution(
          highs,
          colValuePtr,
          colDualPtr,
          rowValuePtr,
          rowDualPtr
        ),
      "get solution"
    );

    // Try to get basis (not available for MIP)
    const colBasisPtr =
      numCol > 0 ? alloc(numCol * Int32Array.BYTES_PER_ELEMENT) : 0;
    const rowBasisPtr =
      numRow > 0 ? alloc(numRow * Int32Array.BYTES_PER_ELEMENT) : 0;
    let hasBasis = false;
    const basisResult = Highs_getBasis(highs, colBasisPtr, rowBasisPtr);
    if (basisResult === 0 || basisResult === 1) {
      hasBasis = true;
    }

    // Get column bounds
    const numColOutPtr = alloc(Int32Array.BYTES_PER_ELEMENT);
    const colCostPtr =
      numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
    const colLowerPtr =
      numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
    const colUpperPtr =
      numCol > 0 ? alloc(numCol * Float64Array.BYTES_PER_ELEMENT) : 0;
    Highs_getColsByRange(
      highs,
      0,
      numCol - 1,
      numColOutPtr,
      colCostPtr,
      colLowerPtr,
      colUpperPtr,
      0,
      0,
      0,
      0
    );

    // Get row bounds
    const numRowOutPtr = alloc(Int32Array.BYTES_PER_ELEMENT);
    const rowLowerPtr =
      numRow > 0 ? alloc(numRow * Float64Array.BYTES_PER_ELEMENT) : 0;
    const rowUpperPtr =
      numRow > 0 ? alloc(numRow * Float64Array.BYTES_PER_ELEMENT) : 0;
    Highs_getRowsByRange(
      highs,
      0,
      numRow - 1,
      numRowOutPtr,
      rowLowerPtr,
      rowUpperPtr,
      0,
      0,
      0,
      0
    );

    // Integrality scratch buffer
    const integPtr = alloc(Int32Array.BYTES_PER_ELEMENT);

    const hasPrimal = !NO_SOLUTION_STATUSES.has(status);

    // MIP models use a different column/row shape without Status/Dual.
    let isMip = false;
    for (let i = 0; i < numCol && !isMip; i++) {
      Highs_getColIntegrality(highs, i, integPtr);
      if (HEAP32[integPtr >> 2] !== 0) isMip = true;
    }

    // Build columns
    const columns = {};
    for (let i = 0; i < numCol; i++) {
      /** @type {Record<string, any>} */
      const col = {
        Index: i,
        Lower: HEAPF64[(colLowerPtr >> 3) + i],
        Upper: HEAPF64[(colUpperPtr >> 3) + i],
      };

      Highs_getColIntegrality(highs, i, integPtr);
      col.Type = HEAP32[integPtr >> 2] === 1 ? "Integer" : "Continuous";

      if (hasPrimal) {
        col.Primal = HEAPF64[(colValuePtr >> 3) + i];
      }
      if (hasBasis && hasPrimal && !isMip) {
        const basisCode = HEAP32[(colBasisPtr >> 2) + i];
        col.Status = basisLabel(basisCode, col.Lower, col.Upper);
        col.Dual = HEAPF64[(colDualPtr >> 3) + i];
      }
      col.Name = getColName(highs, i);
      columns[col.Name] = col;
    }

    // Build rows
    const rows = [];
    for (let i = 0; i < numRow; i++) {
      /** @type {Record<string, any>} */
      const row = {
        Index: i,
        Name: getRowName(highs, i),
        Lower: HEAPF64[(rowLowerPtr >> 3) + i],
        Upper: HEAPF64[(rowUpperPtr >> 3) + i],
      };
      if (hasPrimal) {
        row.Primal = HEAPF64[(rowValuePtr >> 3) + i];
      }
      if (hasBasis && hasPrimal && !isMip) {
        const basisCode = HEAP32[(rowBasisPtr >> 2) + i];
        row.Status = basisLabel(basisCode, row.Lower, row.Upper);
        row.Dual = HEAPF64[(rowDualPtr >> 3) + i];
      }
      rows.push(row);
    }

    return {
      Status: status,
      ObjectiveValue: objValue,
      Columns: columns,
      Rows: rows,
    };
  } finally {
    if (highs) _Highs_destroy(highs);
    try {
      FS.unlink(modelFilename);
    } catch (_) {}
    for (let i = allocations.length - 1; i >= 0; i--) {
      try {
        _free(allocations[i]);
      } catch (_) {}
    }
  }
};

function setNumericOption(highs, option_name, option_value) {
  const typePointer = _malloc(Int32Array.BYTES_PER_ELEMENT);
  if (!typePointer) return -1;
  try {
    const status = Highs_getOptionType(highs, option_name, typePointer);
    if (status !== 0 && status !== 1) return status;
    const optionType = HEAP32[typePointer >> 2];
    if (optionType === 1) {
      if (
        !Number.isSafeInteger(option_value) ||
        option_value < -2147483648 ||
        option_value > 2147483647
      )
        return -1;
      return Highs_setIntOptionValue(highs, option_name, option_value);
    }
    if (optionType === 2)
      return Highs_setDoubleOptionValue(highs, option_name, option_value);
    return -1;
  } finally {
    _free(typePointer);
  }
}

function assert_ok(fn, action) {
  let err;
  try {
    err = fn();
  } catch (e) {
    err = e;
  }
  // Allow HighsStatus::kOk (0) and HighsStatus::kWarning (1) but
  // disallow other values, such as e.g. HighsStatus::kError (-1).
  if (err !== 0 && err !== 1)
    throw new Error("Unable to " + action + ". HiGHS error " + err);
}
