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

/** @type {Record<number, import("../types").HighsModelStatus>} */
const MODEL_STATUS_CODES = {
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
};

/**
 * Solve a model in the CPLEX LP file format.
 * @param {string} model_str The problem to solve in the .lp format
 * @param {undefined | import("../types").HighsOptions} highs_options Options to pass the solver. Only integer, boolean and string options are supported at the moment.  See https://github.com/ERGO-Code/HiGHS/blob/c70854d/src/lp_data/HighsOptions.h
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
    if (type === "number" && type === type | 0) setoption = Highs_setIntOptionValue;
    else if (type === "boolean") setoption = Highs_setBoolOptionValue;
    else if (type === "string") setoption = Highs_setStringOptionValue;
    else throw new Error(`Unsupported option value type ${option_value} for '${option_name}'`);
    assert_ok(
      () => setoption(highs, option_name, option_value),
      `set option '${option_name}'`
    );
  }
  assert_ok(() => _Highs_run(highs), "solve the problem");
  const status = MODEL_STATUS_CODES[_Highs_getModelStatus(highs, 0)] || "Unrecognised HiGHS model status";
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
  let headers = lineValues(lines[1]);
  // There is no value for "status" and "dual" when the problem contains integer variables
  const headersFilter =
    headers.indexOf("Type") > 0
      ? (h => h !== "Status" && h !== "Dual")
      : _ => true;
  headers = headers.filter(headersFilter);
  var result = { "Status": status, "Columns": {}, "Rows": [] };
  for (var i = 2; lines[i] != "Rows"; i++) {
    const obj = lineToObj(headers, lines[i]);
    result["Columns"][obj["Name"]] = obj;
  }
  headers = lineValues(lines[i + 1]).filter(headersFilter);
  for (var j = i + 2; j < lines.length; j++) {
    result["Rows"].push(lineToObj(headers, lines[j]));
  }
  return result;
}

function assert_ok(fn, action) {
  let err;
  try {
    err = fn();
  } catch (e) {
    err = e;
  }
  if (err !== 0)
    throw new Error("Unable to " + action + ". HiGHS error " + err);
}
