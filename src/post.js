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
  const status = UTF8ToString(
    _Highs_highsModelStatusToChar(highs, _Highs_getModelStatus(highs, 0))
  );
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

function parseResult(lines, Status) {
  let headers = lineValues(lines[1]);
  var result = { Status, ["Columns"]: {}, ["Rows"]: [] };
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
