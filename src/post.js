const MODEL_FILENAME = "m.lp";
const LP_MAX_LINE_LENGTH = 560;

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
  /** @type {(arg0:Highs, arg1:number)=>(keyof (typeof MODEL_STATUS_CODES))} */ _Highs_getModelStatus,
  /** @type {any}*/ FS;

/**
 * Validate an LP string for known issues that cause opaque HiGHS parse failures.
 * Only validates when the input is a string (Buffer inputs are skipped).
 * @param {string} model_str
 */
function validateLP(model_str) {
  if (typeof model_str !== "string") return;

  // Check for NaN literals (word-boundary match to avoid false positives on variable names)
  const nanMatch = model_str.match(/\bNaN\b/);
  if (nanMatch) {
    const pos = nanMatch.index;
    const context = model_str.substring(
      Math.max(0, pos - 30),
      Math.min(model_str.length, pos + 30)
    );
    throw new Error(
      `LP string contains NaN at position ${pos}: ...${context}...`
    );
  }

  // Check for lines exceeding HiGHS's internal buffer (LP_MAX_LINE_LENGTH = 560)
  const lines = model_str.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > LP_MAX_LINE_LENGTH) {
      const preview = lines[i].substring(0, 80);
      throw new Error(
        `LP line ${i + 1} is ${lines[i].length} characters, exceeding HiGHS's ` +
          `${LP_MAX_LINE_LENGTH}-character line buffer. ` +
          `Use continuation lines to split long expressions. ` +
          `Line preview: "${preview}..."`
      );
    }
  }

  // Check for missing End marker (case-insensitive)
  if (!/^\s*end\s*$/im.test(model_str)) {
    throw new Error(
      "LP string is missing the required 'End' marker"
    );
  }
}

/**
 * Solve a model in the CPLEX LP file format.
 * @param {string} model_str The problem to solve in the .lp format
 * @param {undefined | import("../types").HighsOptions} highs_options Options to pass the solver. See https://github.com/ERGO-Code/HiGHS/blob/v1.14.0/highs/lp_data/HighsOptions.h
 * @returns {import("../types").HighsSolution} The solution
 */
Module["solve"] = function (model_str, highs_options) {
  // Clear buffers at the start to prevent stale data from prior solves
  stdout_lines.length = 0;
  stderr_lines.length = 0;

  validateLP(model_str);

  FS.writeFile(MODEL_FILENAME, model_str);
  const highs = _Highs_create();
  try {
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
      MODEL_STATUS_CODES[_Highs_getModelStatus(highs, 0)] || "Unknown";

    // Snapshot solver logs before clearing stdout for solution parsing
    const solverOutput = stderr_lines.slice();

    // Flush stdout before writing solution to get a clean stream
    stdout_lines.length = 0;
    assert_ok(
      () => Module.Highs_writeSolutionPretty(highs, ""),
      "write and extract solution"
    );

    const output = parseResult(stdout_lines, status);
    output["Output"] = solverOutput;
    return output;
  } finally {
    _Highs_destroy(highs);
    stdout_lines.length = 0;
    stderr_lines.length = 0;
  }
};

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
  if (err !== 0 && err !== 1) {
    let message = "Unable to " + action + ". HiGHS error " + err;
    if (stderr_lines.length > 0) {
      message += "\nSolver output:\n" + stderr_lines.join("\n");
    }
    throw new Error(message);
  }
}
