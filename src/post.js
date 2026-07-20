const MODEL_FILENAME = "m.lp";
const SOLUTION_FILENAME = "solution.txt";

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
Module.Highs_writeSolutionPretty = Module["cwrap"](
  "Highs_writeSolutionPretty",
  "number",
  ["number", "string"]
);
const Highs_getNumCol = Module["cwrap"]("Highs_getNumCol", "number", [
  "number",
]);
const Highs_getNumRow = Module["cwrap"]("Highs_getNumRow", "number", [
  "number",
]);
// Highs_getRanging takes the Highs pointer followed by 24 output array
// pointers (6 ranging records, each made of a value, objective, in-variable
// and out-variable array). See
// https://github.com/ERGO-Code/HiGHS/blob/master/highs/interfaces/highs_c_api.h
const Highs_getRanging = Module["cwrap"](
  "Highs_getRanging",
  "number",
  ["number"].concat(new Array(24).fill("number"))
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
  /** @type {(size:number)=>number} */ _malloc,
  /** @type {(ptr:number)=>void} */ _free,
  /** @type {Float64Array} */ HEAPF64,
  /** @type {Int32Array} */ HEAP32,
  /** @type {any}*/ FS;

/**
 * Solve a model in the CPLEX LP file format.
 * @param {string} model_str The problem to solve in the .lp format
 * @param {undefined | import("../types").HighsOptions} highs_options Options to pass the solver. See https://github.com/ERGO-Code/HiGHS/blob/v1.14.0/src/lp_data/HighsOptions.h
 * @returns {import("../types").HighsSolution} The solution
 */
Module["solve"] = function (model_str, highs_options) {
  FS.writeFile(MODEL_FILENAME, model_str);
  const highs = _Highs_create();
  assert_ok(
    () => Module.Highs_readModel(highs, MODEL_FILENAME),
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
  const status =
    MODEL_STATUS_CODES[_Highs_getModelStatus(highs)] || "Unknown";
  assert_ok(
    () => Module.Highs_writeSolutionPretty(highs, SOLUTION_FILENAME),
    "write and extract solution"
  );
  const solution = FS.readFile(SOLUTION_FILENAME, { encoding: "utf8" });
  const output = parseResult(solution.split(/\r?\n/), status);
  if (options["ranging"] === "on") {
    output["Ranging"] = getRanging(highs);
  }
  _Highs_destroy(highs);
  FS.unlink(SOLUTION_FILENAME);
  return output;
};

/**
 * Reads the ranging (sensitivity analysis) information for the last solved
 * model out of the Highs instance by calling the Highs_getRanging C API.
 * @param {Highs} highs A pointer to the Highs instance
 * @returns {import("../types").HighsRanging} The ranging information
 */
function getRanging(highs) {
  const num_col = Highs_getNumCol(highs);
  const num_row = Highs_getNumRow(highs);

  // Each ranging record is made of four arrays: value and objective are
  // doubles, in_var and ou_var are (32 bit) integers. Allocate one buffer per
  // array and remember how to read it back.
  const buffers = [];
  /**
   * @param {number} length Number of elements the array should hold
   * @param {"f64" | "i32"} kind The element type stored in the array
   * @returns {number} The pointer to the freshly allocated array
   */
  function allocArray(length, kind) {
    const bytes_per_element = kind === "f64" ? 8 : 4;
    const ptr = _malloc(Math.max(1, length) * bytes_per_element);
    buffers.push({ ptr, length, kind });
    return ptr;
  }
  /**
   * @param {number} ptr The pointer to read from
   * @param {number} length Number of elements to read
   * @param {"f64" | "i32"} kind The element type stored in the array
   * @returns {number[]} The values read out of the WebAssembly heap
   */
  function readArray(ptr, length, kind) {
    const heap = kind === "f64" ? HEAPF64 : HEAP32;
    const shift = kind === "f64" ? 3 : 2;
    const base = ptr >> shift;
    const values = new Array(length);
    for (let i = 0; i < length; i++) values[i] = heap[base + i];
    return values;
  }
  /**
   * Allocate the four arrays that make up a single ranging record.
   * @param {number} length Number of entries (columns or rows)
   * @returns {{value:number, objective:number, in_var:number, ou_var:number}}
   */
  function allocRecord(length) {
    return {
      value: allocArray(length, "f64"),
      objective: allocArray(length, "f64"),
      in_var: allocArray(length, "i32"),
      ou_var: allocArray(length, "i32"),
    };
  }

  const col_cost_up = allocRecord(num_col);
  const col_cost_dn = allocRecord(num_col);
  const col_bound_up = allocRecord(num_col);
  const col_bound_dn = allocRecord(num_col);
  const row_bound_up = allocRecord(num_row);
  const row_bound_dn = allocRecord(num_row);

  try {
    assert_ok(
      () =>
        Highs_getRanging(
          highs,
          col_cost_up.value, col_cost_up.objective, col_cost_up.in_var, col_cost_up.ou_var,
          col_cost_dn.value, col_cost_dn.objective, col_cost_dn.in_var, col_cost_dn.ou_var,
          col_bound_up.value, col_bound_up.objective, col_bound_up.in_var, col_bound_up.ou_var,
          col_bound_dn.value, col_bound_dn.objective, col_bound_dn.in_var, col_bound_dn.ou_var,
          row_bound_up.value, row_bound_up.objective, row_bound_up.in_var, row_bound_up.ou_var,
          row_bound_dn.value, row_bound_dn.objective, row_bound_dn.in_var, row_bound_dn.ou_var
        ),
      "compute ranging (requires an optimal basic solution)"
    );

    /**
     * Turn a pair of up/down record pointers into an array of records, one per
     * column or row.
     * @param {{value:number, objective:number, in_var:number, ou_var:number}} up
     * @param {{value:number, objective:number, in_var:number, ou_var:number}} dn
     * @param {number} length
     * @returns {import("../types").HighsRangingRecord[]}
     */
    function toRecords(up, dn, length) {
      const up_value = readArray(up.value, length, "f64");
      const up_objective = readArray(up.objective, length, "f64");
      const up_in_var = readArray(up.in_var, length, "i32");
      const up_ou_var = readArray(up.ou_var, length, "i32");
      const dn_value = readArray(dn.value, length, "f64");
      const dn_objective = readArray(dn.objective, length, "f64");
      const dn_in_var = readArray(dn.in_var, length, "i32");
      const dn_ou_var = readArray(dn.ou_var, length, "i32");
      const records = new Array(length);
      for (let i = 0; i < length; i++) {
        records[i] = {
          "up_value": up_value[i],
          "up_objective": up_objective[i],
          "up_in_variable": up_in_var[i],
          "up_out_variable": up_ou_var[i],
          "dn_value": dn_value[i],
          "dn_objective": dn_objective[i],
          "dn_in_variable": dn_in_var[i],
          "dn_out_variable": dn_ou_var[i],
        };
      }
      return records;
    }

    return {
      "cost": toRecords(col_cost_up, col_cost_dn, num_col),
      "column_bound": toRecords(col_bound_up, col_bound_dn, num_col),
      "row_bound": toRecords(row_bound_up, row_bound_dn, num_row),
    };
  } finally {
    for (const buffer of buffers) _free(buffer.ptr);
  }
}

function setNumericOption(highs, option_name, option_value) {
  let result = Highs_setDoubleOptionValue(highs, option_name, option_value);
  if (result === -1 && option_value === (option_value | 0))
    result = Highs_setIntOptionValue(highs, option_name, option_value);
  return result;
}

function parseNum(s) {
  if (s === "inf") return 1 / 0;
  else if (s === "-inf") return -1 / 0;
  else return +s;
}

const known_columns = {
  "Index": (s) => parseInt(s),
  "Lower": parseNum,
  "Upper": parseNum,
  "Primal": parseNum,
  "Dual": parseNum,
};

/**
 * @param {string} s
 * @returns {string[]} The values (words) of a line
 */
function lineValues(s) {
  return s.match(/[^\s]+/g) || [];
}

/**
 *
 * @param {string[]} headers
 * @param {string} line
 * @returns {Record<string, string | number>}
 */
function lineToObj(headers, line) {
  const values = lineValues(line);
  /** @type {Record<string, string | number>} */
  const result = {};
  for (let idx = 0; idx < values.length; idx++) {
    if (idx >= headers.length)
      throw new Error("Unable to parse solution line: " + line);
    const value = values[idx];
    const header = headers[idx];
    const parser = known_columns[header];
    const parsed = parser ? parser(value) : value;
    result[header] = parsed;
  }
  return result;
}

/**
 * Parse HiGHS output lines
 * @param {string[]} lines stdout from highs
 * @param {import("../types").HighsModelStatus} status status
 * @returns {import("../types").HighsSolution} The solution
 */
function parseResult(lines, status) {
  lines = lines.filter((line) => !line.startsWith("WARNING:"));

  if (lines.length < 3)
    throw new Error("Unable to parse solution. Too few lines.");

  let headers = headersForNonEmptyColumns(lines[1], lines[2]);

  var result = {
    "Status": /** @type {"Infeasible"} */ (status),
    "Columns": {},
    "Rows": [],
    "ObjectiveValue": NaN,
  };

  // Parse columns
  for (var i = 2; lines[i] != "Rows"; i++) {
    const obj = lineToObj(headers, lines[i]);
    if (!obj["Type"]) obj["Type"] = "Continuous";
    result["Columns"][obj["Name"]] = obj;
  }

  // Parse rows
  headers = headersForNonEmptyColumns(lines[i + 1], lines[i + 2]);
  for (var j = i + 2; lines[j] != ""; j++) {
    result["Rows"].push(lineToObj(headers, lines[j]));
  }

  // Parse objective value
  result["ObjectiveValue"] = parseNum(
    lines[j + 3].match(/Objective value: (.+)/)[1]
  );
  return result;
}

/**
 * Finds the non headers for non-empty columns in a HiGHS output
 * @param {string} headerLine The line containing the header names
 * @param {string} firstDataLine The line immediately below the header line
 * @returns {string[]} The headers for which there is data available
 */
function headersForNonEmptyColumns(headerLine, firstDataLine) {
  // Headers can correspond to empty columns. The contents of a column can be left or right
  // aligned, so we determine if a given header should be included by looking at whether
  // the row immediately below the header has any contents.
  return [...headerLine.matchAll(/[^\s]+/g)]
    .filter(
      (match) =>
        firstDataLine[match.index] !== " " ||
        firstDataLine[match.index + match[0].length - 1] !== " "
    )
    .map((match) => match[0]);
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
