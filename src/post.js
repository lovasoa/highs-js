const MODEL_FILENAME = "m.lp";

Module.Highs_readModel = Module["cwrap"]("Highs_readModel", "number", [
  "number",
  "string",
]);
Module.Highs_setHighsIntOptionValue = Module["cwrap"](
  "Highs_setHighsIntOptionValue",
  "number",
  ["number", "string", "number"]
);
Module.Highs_writeSolutionPretty = Module["cwrap"](
  "Highs_writeSolutionPretty",
  "number",
  ["number", "string"]
);

/**
 * Solve a model in the CPLEX LP file format.
 */
Module["solve"] = function (model_str) {
  FS.writeFile(MODEL_FILENAME, model_str);
  const highs = _Highs_create();
  assert_ok(
    () => Module.Highs_readModel(highs, MODEL_FILENAME),
    "read LP model (see http://web.mit.edu/lpsolve/doc/CPLEX-format.htm)"
  );
  assert_ok(
    () => Module.Highs_setHighsIntOptionValue(highs, "message_level", 0),
    "set option"
  );
  assert_ok(() => _Highs_run(highs), "solve the problem");
  const status = UTF8ToString(
    _Highs_highsModelStatusToChar(highs, _Highs_getModelStatus(highs, 0))
  );
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

function lineValues(s) {
  return s.split(/\s+/).slice(1);
}

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

function parseResult(lines, status) {
  if (lines.length < 3)
    throw new Error("Unable to parse solution. Too few lines.");
  let headers = lineValues(lines[1]);
  var result = { "Status": status, "Columns": {}, "Rows": [] };
  for (var i = 2; lines[i] != "Rows"; i++) {
    const obj = lineToObj(headers, lines[i]);
    result["Columns"][obj["Name"]] = obj;
  }
  headers = lineValues(lines[i + 1]);
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
