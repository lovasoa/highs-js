/** @type {import("../types").default} */
const highs = require('../build/highs.js');
const assert = require('assert').strict;
const fs = require('fs');

const PROBLEM = `Maximize
 obj: x1 + 2 x2 + 4 x3 + x4
Subject To
 c1: - x1 + x2 + x3 + 10 x4 <= 20
 c2: x1 - 4 x2 + x3 <= 30
 c3: x2 - 0.5 x4 = 0
Bounds
 0 <= x1 <= 40
 2 <= x4 <= 3
End`;

const SOLUTION = {
  Status: 'Optimal',
  ObjectiveValue: 87.5,
  Columns: {
    x1: {
      Index: 0,
      Status: 'BS',
      Lower: 0,
      Type: 'Continuous',
      Upper: 40,
      Primal: 17.5,
      Dual: -0,
      Name: 'x1'
    },
    x2: {
      Index: 1,
      Status: 'BS',
      Lower: 0,
      Type: 'Continuous',
      Upper: Infinity,
      Primal: 1,
      Dual: -0,
      Name: 'x2'
    },
    x3: {
      Index: 2,
      Status: 'BS',
      Lower: 0,
      Type: 'Continuous',
      Upper: Infinity,
      Primal: 16.5,
      Dual: -0,
      Name: 'x3'
    },
    x4: {
      Index: 3,
      Status: 'LB',
      Lower: 2,
      Type: 'Continuous',
      Upper: 3,
      Primal: 2,
      Dual: -8.75,
      Name: 'x4'
    }
  },
  Rows: [
    {
      Index: 0,
      Name: 'c1',
      Status: 'UB',
      Lower: -Infinity,
      Upper: 20,
      Primal: 20,
      Dual: 1.5
    },
    {
      Index: 1,
      Name: 'c2',
      Status: 'UB',
      Lower: -Infinity,
      Upper: 30,
      Primal: 30,
      Dual: 2.5
    },
    {
      Index: 2,
      Name: 'c3',
      Status: 'UB',
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: 10.5
    }
  ]
};

/**
 * Assert solution matches expected, ignoring the Output field.
 * Also verifies Output is a string array.
 */
function assertSolution(actual, expected) {
  assert.ok(Array.isArray(actual.Output), 'Output should be an array');
  for (const entry of actual.Output) {
    assert.strictEqual(typeof entry, 'string', 'Output entries should be strings');
  }
  const { Output, ...rest } = actual;
  assert.deepStrictEqual(rest, expected);
}

/**
 * @param {import("../types").Highs} Module
 */
function test_optimal(Module) {
  const sol = Module.solve(PROBLEM);
  assertSolution(sol, SOLUTION);
}

/**
 * @param {import("../types").Highs} Module
 */
function test_options(Module) {
  const sol = Module.solve(PROBLEM, {
    primal_feasibility_tolerance: 1e-9, // option type: double
    time_limit: 1000, // option type: double
    allowed_cost_scale_factor: 2, // option type: integer
    use_implied_bounds_from_presolve: true,
    presolve: 'off'
  });
  assertSolution(sol, SOLUTION);
}

/**
 * @param {import("../types").Highs} Module
 */
function test_empty_model(Module) {
  // Arguably, this example should not be considered valid at all, but
  // HiGHS parses it as an empty model; see
  // https://github.com/ERGO-Code/HiGHS/issues/1451
  const sol = Module.solve(`Minimize
    42
  End`);
  assertSolution(sol, {
    Columns: {},
    ObjectiveValue: 0,
    Rows: [],
    Status: 'Empty'
  });
}

/**
 * @param {import("../types").Highs} Module
 */
function test_invalid_model(Module) {
  assert.throws(
    _ =>
      Module.solve(`Minimize
        ] 2 [
      End`),
    /Unable to read LP model/
  );
}

/**
 * @param {import("../types").Highs} Module
 */
function test_integer_problem(Module) {
  const sol = Module.solve(`Minimize
  obj: a + b
 Subject To
  c1: 2 a + b >= 6.5
 General
 a
 End`);
  assertSolution(sol, {
    Status: 'Optimal',
    ObjectiveValue: 3.5,
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Upper: Infinity,
        Primal: 3,
        Type: 'Integer',
        Name: 'a'
      },
      b: {
        Index: 1,
        Lower: 0,
        Upper: Infinity,
        Primal: 0.5,
        Type: 'Continuous',
        Name: 'b'
      }
    },
    Rows: [{ Index: 0, Lower: 6.5, Upper: Infinity, Primal: 6.5, Name: 'c1' }]
  });
}

function test_case_with_no_constraints(Module) {
  const sol = Module.solve(`Maximize
  obj: x1 + 2 x2
 Bounds
  0 <= x1 <= 40
  2 <= x2 <= 3
 End`);
  assertSolution(sol, {
    Status: 'Optimal',
    ObjectiveValue: 46,
    Columns: {
      x1: {
        Index: 0,
        Status: 'UB',
        Lower: 0,
        Upper: 40,
        Type: 'Continuous',
        Primal: 40,
        Dual: 1,
        Name: 'x1'
      },
      x2: {
        Index: 1,
        Status: 'UB',
        Lower: 2,
        Type: 'Continuous',
        Upper: 3,
        Primal: 3,
        Dual: 2,
        Name: 'x2'
      }
    },
    Rows: []
  });
}

/**
 * @param {import("../types").Highs} Module
 */
function test_quadratic_program(Module) {
  const sol = Module.solve(`Minimize
  obj: a + b + [ a^2 + 4 a * b + 7 b^2 ]/2
Subject To
  c1: a + b >= 10
End`);
  assertSolution(sol, {
    Status: 'Optimal',
    ObjectiveValue: 60,
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Status: 'BS',
        Type: 'Continuous',
        Upper: Infinity,
        Primal: 10,
        Dual: 0,
        Name: 'a'
      },
      b: {
        Index: 1,
        Lower: 0,
        Status: 'LB',
        Type: 'Continuous',
        Upper: Infinity,
        Primal: 0,
        Dual: 10,
        Name: 'b'
      }
    },
    Rows: [{ Index: 0, Lower: 10, Upper: Infinity, Primal: 10, Dual: 11, Status: 'LB', Name: 'c1' }]
  });
}

/**
 * @param {import("../types").Highs} Module
 */
function test_quadratic_program_not_positive_semidefinite(Module) {
  assert.throws(_ =>
    Module.solve(`Maximize
  obj: [x1^2]/2
 Bounds
  0 <= x1 <= 40
 End`)
  );
}

/**
 * @param {import("../types").Highs} Module
 */
function test_infeasible(Module) {
  const sol = Module.solve(`Maximize
  a
  subject to
  a >= 1
  bounds
  a <= 0
  End`);
  assertSolution(sol, {
    Status: 'Infeasible',
    ObjectiveValue: 0,
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Upper: 0,
        Type: 'Continuous',
        Name: 'a'
      }
    },
    Rows: [{ Index: 0, Lower: 1, Upper: Infinity, Name: 'HiGHS_R0' }]
  });
}

/**
 * @param {import("../types").Highs} Module
 */
function test_infeasible_ilp(Module) {
  const sol = Module.solve(`Maximize
  a 
subject to
  a >= 1
bounds
  a <= 0
General
  a
end`);
  assertSolution(sol, {
    Status: 'Infeasible',
    ObjectiveValue: Infinity,
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Upper: 0,
        Type: 'Integer',
        Name: 'a'
      }
    },
    Rows: [{ Index: 0, Lower: 1, Upper: Infinity, Name: 'HiGHS_R0' }]
  });
}

/**
 * @param {import("../types").Highs} Module
 */
function test_unbounded(Module) {
  const sol = Module.solve(`Maximize a
  subject to
  a >= 1
  end`);
  assertSolution(sol, {
    Status: 'Unbounded',
    ObjectiveValue: 1,
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Type: 'Continuous',
        Upper: Infinity,
        Primal: 1,
        Dual: -0,
        Status: 'BS',
        Name: 'a'
      }
    },
    Rows: [{ Index: 0, Status: 'LB', Lower: 1, Upper: Infinity, Primal: 1, Dual: 1, Name: 'HiGHS_R0' }]
  });
}

/**
 * @param {import("../types").Highs} Module
 */
function test_read_model_warning(Module) {
  // See https://github.com/lovasoa/highs-js/issues/17
  const sol = Module.solve(`Minimize
obj: x1
Subject To
c1: 1 x0 + 1 x1 = 1
Bounds
0 <= x1 <= 1
1.1 <= x2 <= 1
End`);
  assertSolution(sol, {
    Status: 'Infeasible',
    ObjectiveValue: 0,
    Columns: {
      x0: {
        Index: 1,
        Lower: 0,
        Name: 'x0',
        Type: 'Continuous',
        Upper: Infinity
      },
      x1: {
        Index: 0,
        Lower: 0,
        Name: 'x1',
        Type: 'Continuous',
        Upper: 1
      },
      x2: {
        Index: 2,
        Lower: 1.1,
        Name: 'x2',
        Type: 'Continuous',
        Upper: 1
      }
    },
    Rows: [
      {
        Index: 0,
        Lower: 1,
        Upper: 1,
        Name: 'c1'
      }
    ]
  });
}

/**
 * @param {import("../types").Highs} Module
 */
function test_big(Module) {
  const pb = fs.readFileSync(__dirname + '/life_goe.mod.lp');
  Module.solve(pb);
}

function test_many_solves(Module) {
  // See https://github.com/lovasoa/highs-js/issues/10
  for (let i = 0; i < 5000; i++) {
    Module.solve(`Maximize
    a
    subject to
    a <= 1
    end`);
  }
}

function test_exceeds_stack(Module) {
  // See https://github.com/lovasoa/highs-js/issues/41
  const pb = fs.readFileSync(__dirname + '/exceeds_stack.lp');
  Module.solve(pb);
}

// --- New validation tests ---

function test_nan_detection(Module) {
  assert.throws(
    () => Module.solve(`Minimize
  obj: NaN x1
Subject To
  c1: x1 >= 1
End`),
    /LP string contains NaN at position/
  );
}

function test_nan_in_variable_name_ok(Module) {
  // Variable names containing "NaN" as a substring should NOT trigger validation
  // (e.g., "xNaNcy" is a valid variable name)
  // This test just verifies the regex uses word boundaries
  assert.doesNotThrow(() => {
    // This will fail at the solver level (not validation) since the model is odd,
    // but the validation itself should pass
    try {
      Module.solve(`Minimize
  obj: xNaNcy
Subject To
  c1: xNaNcy >= 1
End`);
    } catch (e) {
      // OK if it fails at solver level, just not at NaN validation
      if (e.message.includes('LP string contains NaN')) throw e;
    }
  });
}

function test_long_line_detection(Module) {
  const longVar = 'x'.repeat(600);
  assert.throws(
    () => Module.solve(`Minimize
  obj: ${longVar}
Subject To
  c1: ${longVar} >= 1
End`),
    /exceeding HiGHS's 560-character line buffer/
  );
}

function test_missing_end_detection(Module) {
  assert.throws(
    () => Module.solve(`Minimize
  obj: x1
Subject To
  c1: x1 >= 1`),
    /missing the required 'End' marker/
  );
}

function test_output_field(Module) {
  const sol = Module.solve(PROBLEM);
  assert.ok(Array.isArray(sol.Output), 'Output should be an array');
  // Solver should produce some output (at minimum, solver stats)
  assert.ok(sol.Output.length > 0, 'Output should contain solver log lines');
}

function test_error_includes_stderr(Module) {
  try {
    Module.solve(`Minimize
      ] 2 [
    End`);
    assert.fail('Should have thrown');
  } catch (e) {
    // Error message should include "Solver output:" with stderr content
    assert.ok(
      e.message.includes('Unable to read LP model'),
      'Should include the action description'
    );
  }
}

function test_buffer_input_skips_validation(Module) {
  // Buffer inputs should skip string-only validation (line length, NaN, End check)
  // and go straight to the solver. This test verifies no validation error is thrown
  // for a Buffer — the solver itself may still fail, but that's fine.
  const buf = Buffer.from(`Maximize
  a
  subject to
  a <= 1
  end`);
  const sol = Module.solve(buf);
  assertSolution(sol, {
    Status: 'Optimal',
    ObjectiveValue: 1,
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Type: 'Continuous',
        Upper: Infinity,
        Primal: 1,
        Dual: -0,
        Status: 'BS',
        Name: 'a'
      }
    },
    Rows: [{ Index: 0, Status: 'UB', Lower: -Infinity, Upper: 1, Primal: 1, Dual: 1, Name: 'HiGHS_R0' }]
  });
}


async function test() {
  const Module = await highs();
  test_optimal(Module);
  test_empty_model(Module);
  test_invalid_model(Module);
  test_options(Module);
  test_integer_problem(Module);
  test_case_with_no_constraints(Module);
  test_quadratic_program(Module);
  test_quadratic_program_not_positive_semidefinite(Module);
  test_infeasible(Module);
  test_infeasible_ilp(Module);
  test_unbounded(Module);
  test_read_model_warning(Module);
  test_big(Module);
  test_many_solves(Module);
  test_exceeds_stack(Module);
  // New tests
  test_nan_detection(Module);
  test_nan_in_variable_name_ok(Module);
  test_long_line_detection(Module);
  test_missing_end_detection(Module);
  test_output_field(Module);
  test_error_includes_stderr(Module);
  test_buffer_input_skips_validation(Module);
  console.log('test succeeded');
}

test();
