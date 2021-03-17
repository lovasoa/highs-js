const MODEL_FILENAME = "m.lp";

/**
 * Solve a model in the CPLEX LP file format.
 */
Module["solve"] = function (model_str) {
  FS.writeFile(MODEL_FILENAME, model_str);
  const highs = _Highs_create();
  assert_ok(
    Module.ccall(
      "Highs_readModel",
      "number",
      ["number", "string"],
      [highs, MODEL_FILENAME]
    )
  );
  assert_ok(
    Module.ccall(
      "Highs_setHighsIntOptionValue",
      "number",
      ["number", "string", "number"],
      [highs, "message_level", 0]
    )
  );
  assert_ok(_Highs_run(highs));
  const status = _Highs_getModelStatus(highs, 0);
  assert_ok(
    Module.ccall(
      "Highs_writeSolutionPretty",
      "number",
      ["number", "string"],
      [highs, "/dev/stderr"]
    )
  );
  _Highs_destroy(highs);
  const output = parseResult(stderr_lines, status);
  stderr_lines.length = 0;
  return output;
};

function parseNum(s) {
  if (s === "inf") return 1 / 0;
  else if (s === "-inf") return -1 / 0;
  else return +s;
}

const known_columns = {
  ["Index"]: (s) => parseInt(s),
  ["Lower"]: parseNum,
  ["Upper"]: parseNum,
  ["Primal"]: parseNum,
  ["Dual"]: parseNum,
};

function lineValues(s) {
  return s.split(/\s+/).slice(1);
}

function lineToObj(headers, line) {
  const values = lineValues(line);
  return Object.fromEntries(
    values.map((value, idx) => {
      const header = headers[idx];
      const parser = known_columns[header];
      const parsed = parser ? parser(value) : value;
      return [header, parsed];
    })
  );
}

const status_codes = {
  1: "LOAD_ERROR",
  2: "MODEL_ERROR",
  0: "NOTSET",
  3: "PRESOLVE_ERROR",
  4: "SOLVE_ERROR",
  5: "POSTSOLVE_ERROR",
  6: "MODEL_EMPTY",
  7: "PRIMAL_INFEASIBLE",
  8: "PRIMAL_UNBOUNDED",
  9: "OPTIMAL",
  10: "REACHED_DUAL_OBJECTIVE_VALUE_UPPER_BOUND",
  11: "REACHED_TIME_LIMIT",
  12: "REACHED_ITERATION_LIMIT",
  13: "PRIMAL_DUAL_INFEASIBLE",
  14: "DUAL_INFEASIBLE",
};

function parseResult(lines, status_code) {
  let headers = lineValues(lines[1]);
  const status = status_codes[status_code];
  var result = { ["Columns"]: {}, ["Rows"]: [], status };
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

function assert_ok(n) {
  if (n !== 0) throw new Error("Highs error " + n);
}
