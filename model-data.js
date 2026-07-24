export const buildExplanations = {
  production: {
    title: "Production planning with reusable model data",
    problem: "Use this pattern when prices, capacities, or bounds change between solves. Four continuous decision variables represent production quantities, row bounds encode labor and machine capacity, and the persistent model keeps the sparse matrix in memory for later mutation instead of reparsing LP text.",
  },
  diet: {
    title: "Minimum-cost diet as a covering LP",
    problem: "Use a covering model when requirements are minimums that several activities can satisfy together. Food quantities are continuous columns, nutrient contributions are matrix coefficients, and lower row bounds enforce minimum intake. Add integrality only if servings must be indivisible.",
  },
  transport: {
    title: "Transportation as a sparse network LP",
    problem: "Use this structure for minimum-cost flow between supply and demand locations. Each column is one shipping route, the first rows cap plant supply, and equality rows require each destination's demand. Network models are naturally sparse, so CSC input avoids storing the many zero coefficients.",
  },
};

const exampleDefaults = {
  production: {
    names: ["x", "y"],
    rowNames: ["labor", "wood"],
    costs: [45, 80],
    lowers: [0, 0],
    uppers: [Infinity, Infinity],
    A: [
      [4, 6],
      [3, 5],
    ],
    rowLowers: [-Infinity, -Infinity],
    rowUppers: [240, 180],
    sense: "maximize",
  },
  diet: {
    names: ["oats", "tofu", "lentils"],
    rowNames: ["calories", "protein", "fiber"],
    costs: [3, 2.5, 1.5],
    lowers: [0, 0, 0],
    uppers: [Infinity, Infinity, Infinity],
    A: [
      [500, 300, 200],
      [10, 20, 15],
      [30, 20, 10],
    ],
    rowLowers: [2000, 50, 40],
    rowUppers: [Infinity, Infinity, Infinity],
    sense: "minimize",
  },
  transport: {
    names: ["A→1", "A→2", "A→3", "A→4", "B→1", "B→2", "B→3", "B→4"],
    rowNames: ["supply A", "supply B", "demand 1", "demand 2", "demand 3", "demand 4"],
    costs: [8, 6, 10, 9, 9, 12, 13, 7],
    lowers: [0, 0, 0, 0, 0, 0, 0, 0],
    uppers: [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity],
    A: [
      [1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 0, 1, 0, 0, 0, 1],
    ],
    rowLowers: [0, 0, 45, 20, 30, 15],
    rowUppers: [80, 75, 45, 20, 30, 15],
    sense: "minimize",
  },
};

export function readNumber(id, fallback) {
  const value = Number(document.getElementById(id)?.value);
  return Number.isFinite(value) ? value : fallback;
}

export function getExample(key) {
  const base = exampleDefaults[key];
  if (key === "production") return {
    ...base,
    costs: [readNumber("production-chair-profit", 45), readNumber("production-table-profit", 80)],
    A: [
      [readNumber("production-chair-labor", 4), readNumber("production-table-labor", 6)],
      [readNumber("production-chair-wood", 3), readNumber("production-table-wood", 5)],
    ],
    rowUppers: [readNumber("production-labor-capacity", 240), readNumber("production-wood-capacity", 180)],
  };
  if (key === "diet") return {
    ...base,
    costs: [readNumber("diet-oats-cost", 3), readNumber("diet-tofu-cost", 2.5), readNumber("diet-lentils-cost", 1.5)],
    rowLowers: [readNumber("diet-calories", 2000), readNumber("diet-protein", 50), readNumber("diet-fiber", 40)],
  };
  if (key === "transport") return {
    ...base,
    costs: ["a1", "a2", "a3", "a4", "b1", "b2", "b3", "b4"].map((route, index) => readNumber(`transport-${route}`, base.costs[index])),
    rowLowers: [0, 0, 1, 2, 3, 4].map((_, index) => index < 2 ? 0 : readNumber(`transport-demand-${index - 1}`, base.rowLowers[index])),
    rowUppers: [readNumber("transport-supply-a", 80), readNumber("transport-supply-b", 75), ...[1, 2, 3, 4].map((town, index) => readNumber(`transport-demand-${town}`, base.rowUppers[index + 2]))],
  };
  return base;
}

export function denseToCSC(A, nCols) {
  const nRows = A.length;
  const starts = new Int32Array(nCols + 1);
  const indices = [];
  const values = [];
  let nnz = 0;
  for (let j = 0; j < nCols; j++) {
    starts[j] = nnz;
    for (let i = 0; i < nRows; i++) {
      if (A[i][j] !== 0) {
        indices.push(i);
        values.push(A[i][j]);
        nnz++;
      }
    }
  }
  starts[nCols] = nnz;
  return { starts, indices: new Int32Array(indices), values: new Float64Array(values) };
}

export function displayNumber(value) {
  if (!Number.isFinite(value)) return value < 0 ? "-∞" : "∞";
  return Number(value.toFixed(4)).toString();
}

export const vizColors = ["#b44a55", "#2f7774", "#5479a8", "#b07a38", "#76588f", "#4f8463", "#c45f76", "#527f8d"];

export function getFacilityDefinition() {
  return {
    fixedCosts: [readNumber("facility-fixed-a", 500), readNumber("facility-fixed-b", 300)],
    demand: [readNumber("facility-demand-a", 80), readNumber("facility-demand-b", 60), readNumber("facility-demand-c", 40)],
    capacity: [readNumber("facility-capacity-a", 200), readNumber("facility-capacity-b", 200)],
    shippingCosts: [
      [readNumber("facility-a1", 2), readNumber("facility-a2", 4), readNumber("facility-a3", 5)],
      [readNumber("facility-b1", 3), readNumber("facility-b2", 1), readNumber("facility-b3", 3)],
    ],
  };
}

export function buildFacilityPayload() {
  const { fixedCosts, demand, capacity, shippingCosts } = getFacilityDefinition();
  const columnCount = fixedCosts.length + fixedCosts.length * demand.length;
  const rows = [];
  const rowLower = [];
  const rowUpper = [];
  for (let customer = 0; customer < demand.length; customer++) {
    const row = new Array(columnCount).fill(0);
    for (let facility = 0; facility < fixedCosts.length; facility++) {
      row[fixedCosts.length + facility * demand.length + customer] = 1;
    }
    rows.push(row);
    rowLower.push(demand[customer]);
    rowUpper.push(Infinity);
  }
  for (let facility = 0; facility < fixedCosts.length; facility++) {
    const row = new Array(columnCount).fill(0);
    row[facility] = -capacity[facility];
    for (let customer = 0; customer < demand.length; customer++) {
      row[fixedCosts.length + facility * demand.length + customer] = 1;
    }
    rows.push(row);
    rowLower.push(-Infinity);
    rowUpper.push(0);
  }
  const csc = denseToCSC(rows, columnCount);
  return {
    colCost: [...fixedCosts, ...shippingCosts.flat()],
    colLower: new Array(columnCount).fill(0),
    colUpper: [...new Array(fixedCosts.length).fill(1), ...new Array(columnCount - fixedCosts.length).fill(Infinity)],
    rowLower,
    rowUpper,
    sense: "minimize",
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
    integrality: [...new Array(fixedCosts.length).fill("integer"), ...new Array(columnCount - fixedCosts.length).fill("continuous")],
  };
}
