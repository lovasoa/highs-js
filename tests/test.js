/** @type {import("../types").default} */
const highs = require("../build/highs.js");
const assert = require('assert').strict;
const fs = require("fs");

const PROBLEM = `Maximize
 obj: x1 + 2 x2 + 3 x3 + x4
Subject To
 c1: - x1 + x2 + x3 + 10 x4 <= 20
 c2: x1 - 3 x2 + x3 <= 30
 c3: x2 - 3.5 x4 = 0
Bounds
 0 <= x1 <= 40
 2 <= x4 <= 3
End`;

const SOLUTION = {
  IsLinear: true,
  IsQuadratic: false,
  Status: 'Optimal',
  Columns: {
    x1: {
      Index: 0,
      Status: 'UB',
      Lower: 0,
      Upper: 40,
      Primal: 40,
      Dual: 1.29167,
      Name: 'x1'
    },
    x2: {
      Index: 1,
      Status: 'BS',
      Lower: 0,
      Upper: Infinity,
      Primal: 10.2083,
      Dual: -0,
      Name: 'x2'
    },
    x3: {
      Index: 2,
      Status: 'BS',
      Lower: 0,
      Upper: Infinity,
      Primal: 20.625,
      Dual: -0,
      Name: 'x3'
    },
    x4: {
      Index: 3,
      Status: 'BS',
      Lower: 2,
      Upper: 3,
      Primal: 2.91667,
      Dual: -0,
      Name: 'x4'
    }
  },
  Rows: [
    {
      Index: 0,
      Status: 'UB',
      Lower: -Infinity,
      Upper: 20,
      Primal: 20,
      Dual: 1.64583
    },
    {
      Index: 1,
      Status: 'UB',
      Lower: -Infinity,
      Upper: 30,
      Primal: 30,
      Dual: 1.35417
    },
    {
      Index: 2,
      Status: 'UB',
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: 4.41667
    }
  ]
};

/**
 * @param {import("../types").Highs} Module 
 */
function test_optimal(Module) {
  const sol = Module.solve(PROBLEM);
  assert.deepStrictEqual(sol, SOLUTION);
}

/**
 * @param {import("../types").Highs} Module
 */
function test_options(Module) {
  const sol = Module.solve(PROBLEM, {
    "primal_feasibility_tolerance": 1e-9,// option type: double
    "time_limit": 1000, // option type: double
    "allowed_cost_scale_factor": 2, // option type: integer
    "use_implied_bounds_from_presolve": true,
    "presolve": "off",
  });
  assert.deepStrictEqual(sol, SOLUTION);
}

/**
 * @param {import("../types").Highs} Module
 */
function test_invalid_model(Module) {
  assert.throws(
    (_) => Module.solve("blah blah not a good file"),
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
  assert.deepStrictEqual(sol, {
    IsLinear: false,
    IsQuadratic: false,
    Status: 'Optimal',
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
    Rows: [
      { Index: 0, Lower: 6.5, Upper: Infinity, Primal: 6.5 }
    ]
  });
}

function test_case_with_no_constraints(Module) {
  const sol = Module.solve(`Maximize
  obj: x1 + 2 x2
 Bounds
  0 <= x1 <= 40
  2 <= x2 <= 3
 End`);
  assert.deepStrictEqual(sol, {
    "IsLinear": true,
    "IsQuadratic": false,
    "Status": "Optimal",
    "Columns": {
      "x1": {
        "Index": 0,
        "Status": "UB",
        "Lower": 0,
        "Upper": 40,
        "Primal": 40,
        "Dual": 1,
        "Name": "x1"
      },
      "x2": {
        "Index": 1,
        "Status": "UB",
        "Lower": 2,
        "Upper": 3,
        "Primal": 3,
        "Dual": 2,
        "Name": "x2"
      }
    },
    "Rows": [],
  })

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
  assert.deepStrictEqual(sol, {
    IsLinear: false,
    IsQuadratic: true,
    Status: 'Optimal',
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Upper: Infinity,
        Primal: 10,
        Dual: 0,
        Name: 'a'
      },
      b: {
        Index: 1,
        Lower: 0,
        Upper: Infinity,
        Primal: 0,
        Dual: 10,
        Name: 'b'
      }
    },
    Rows: [ { Index: 0, Lower: 10, Upper: Infinity, Primal: 10, Dual: 11 } ]
  });
}


/**
 * @param {import("../types").Highs} Module
 */
 function test_quadratic_program_not_positive_semidefinite(Module) {
  assert.throws(
    (_) => Module.solve(`Maximize
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
  const sol = Module.solve(`Maximize a subject to a >= 1 bounds a <= 0`);
  assert.deepStrictEqual(sol, {
    IsLinear: true,
    IsQuadratic: false,
    Status: 'Infeasible',
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Upper: 0,
        Name: 'a'
      }
    },
    Rows: [
      { Index: 0, Lower: 1, Upper: Infinity }
    ]
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
  assert.deepStrictEqual(sol, {
    IsLinear: false,
    IsQuadratic: false,
    Status: 'Infeasible',
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Upper: 0,
        Type: 'Integer',
        Name: 'a'
      }
    },
    Rows: [
      { Index: 0, Lower: 1, Upper: Infinity }
    ]
  });
}


/**
 * @param {import("../types").Highs} Module
 */
function test_unbounded(Module) {
  const sol = Module.solve(`Maximize a subject to a >= 1`);
  assert.deepStrictEqual(sol, {
    IsLinear: true,
    IsQuadratic: false,
    Status: 'Unbounded',
    Columns: {
      a: {
        Index: 0,
        Lower: 0,
        Upper: Infinity,
        Primal: 1,
        Dual: -0,
        Status: 'BS',
        Name: 'a'
      }
    },
    Rows: [{ Index: 0, Status: 'LB', Lower: 1, Upper: Infinity, Primal: 1, Dual: 1 }
    ]
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
  assert.deepStrictEqual(sol, {
    IsLinear: true,
    IsQuadratic: false,
    Status: 'Infeasible',
    Columns: {
      x0: {
        Index: 1,
        Lower: 0,
        Name: 'x0',
        Upper: Infinity
      },
      x1: {
        Index: 0,
        Lower: 0,
        Name: 'x1',
        Upper: 1
      },
      x2: {
        Index: 2,
        Lower: 1.1,
        Name: 'x2',
        Upper: 1
      }
    },
    IsLinear: true,
    IsQuadratic: false,
    Rows: [
      {
        Index: 0,
        Lower: 1,
        Upper: 1
      }
    ]
  });
}


/**
 * @param {import("../types").Highs} Module
 */
function test_big(Module) {
  const pb = fs.readFileSync(__dirname + "/life_goe.mod.lp");
  Module.solve(pb);
}

function test_many_solves(Module) {
  // See https://github.com/lovasoa/highs-js/issues/10
  for (let i = 0; i < 5000; i++) {
    Module.solve(`Maximize a subject to a <= 1`);
  }
}

async function test() {
  const Module = await highs();
  test_optimal(Module);
  test_invalid_model(Module);
  test_options(Module);
  test_integer_problem(Module);
  test_case_with_no_constraints(Module);
  test_quadratic_program(Module);
  test_quadratic_program_not_positive_semidefinite(Module);
  test_infeasible(Module);
  test_infeasible_ilp(Module);
  test_unbounded(Module);
  test_big(Module);
  test_many_solves(Module);
  test_read_model_warning(Module);
  console.log("test succeeded");
}

test()
