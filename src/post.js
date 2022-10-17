const MODEL_FILENAME = "m.lp";

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

var
/** @type {()=>Highs} */ _Highs_create,
/** @type {(Highs)=>void} */ _Highs_run,
/** @type {(Highs)=>void} */ _Highs_destroy,
/** @type {(Highs, number)=>(keyof (typeof MODEL_STATUS_CODES))} */ _Highs_getModelStatus,
/** @type {any}*/ FS;

/**
 * Solve a model in the CPLEX LP file format.
 * @param {string} model_str The problem to solve in the .lp format
 * @param {undefined | import("../types").HighsOptions} highs_options Options to pass the solver. See https://github.com/ERGO-Code/HiGHS/blob/c70854d/src/lp_data/HighsOptions.h
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
    else throw new Error(`Unsupported option value type ${option_value} for '${option_name}'`);
    assert_ok(
      () => setoption(highs, option_name, option_value),
      `set option '${option_name}'`
    );
  }
  assert_ok(() => _Highs_run(highs), "solve the problem");
  const status = MODEL_STATUS_CODES[_Highs_getModelStatus(highs, 0)] || "Unknown";
  // Flush the content of stdout in order to have a clean stream before writing the solution in it
  stdout_lines.length = 0;
  assert_ok(
    () => Module.Highs_writeSolutionPretty(highs, ""),
    "write and extract solution"
  );
  _Highs_destroy(highs);
  const output = parseResult(stdout_lines, status);
  // Flush the content of stdout and stderr because these streams are not used anymore
  stdout_lines.length = 0;
  stderr_lines.length = 0;
  return output;
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

  // We identity whether the problem is a QP by the available headers: For infeasible
  // problems, "Status", "Dual", and "Primal" are missing, for integer linear programs,
  // "Status" and "Dual" are missing, and for QPs, only "Status" is missing
  const isQuadratic = !headers.includes("Status") && headers.includes("Dual");
  const isLinear = !headers.includes("Type") && !isQuadratic;

  var result = {
    "Status": /** @type {"Infeasible"} */(status),
    "Columns": {},
    "Rows": [],
    "IsLinear": isLinear,
    "IsQuadratic": isQuadratic,
    "ObjectiveValue": NaN
  };

  // Parse columns
  for (var i = 2; lines[i] != "Rows"; i++) {
    const obj = lineToObj(headers, lines[i]);
    result["Columns"][obj["Name"]] = obj;
  }

  // Parse rows
  headers = headersForNonEmptyColumns(lines[i + 1], lines[i + 2]);
  for (var j = i + 2; lines[j] != ""; j++) {
    result["Rows"].push(lineToObj(headers, lines[j]));
  }

  // Parse objective value
  result["ObjectiveValue"] = parseNum(lines[j + 3].match(/Objective value: (.+)/)[1]);
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
  return [...headerLine.matchAll(/[^\s]+/g)].filter(match =>
    firstDataLine[match.index] !== ' ' ||
    firstDataLine[match.index + match[0].length - 1] !== ' '
  ).map(match => match[0])
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
