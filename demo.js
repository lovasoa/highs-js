/* ── Worker & Message Dispatch ── */

const worker = new Worker("worker.js");
let msgId = 0;
const pending = new Map();

function send(action, payload = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage({ id, action, ...payload });
  });
}

worker.addEventListener("message", ({ data }) => {
  const resolve = pending.get(data.id);
  if (resolve) {
    pending.delete(data.id);
    resolve(data);
  }
});

worker.addEventListener("error", (err) => {
  console.error("Worker error:", err);
});

/* ── Code Box Auto-Sizing ── */

function initCodeBoxSizing() {
  const codeTextareas = document.querySelectorAll(".code-editor-box textarea");
  codeTextareas.forEach((ta) => {
    const resize = () => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    };
    resize();
    ta.addEventListener("input", resize);
  });
}

/* ── Navigation Tab Switching ── */

const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".tab-panel");

tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;
    tabs.forEach((b) => b.classList.toggle("active", b === btn));
    panels.forEach((p) => p.classList.toggle("active", p.id === `panel-${tab}`));
    setTimeout(initCodeBoxSizing, 10);
  });
});

/* ── UI Output Helpers ── */

function setOutput(el, text, cls = "") {
  if (!el) return;
  el.textContent = text;
  el.className = `output ${cls}`;
}

function setJson(el, obj) {
  setOutput(el, JSON.stringify(obj, null, 2));
}

function setTiming(el, ms) {
  if (!el) return;
  el.textContent = `⚡ Solved in ${ms} ms`;
}

function renderProgressBars(container, items) {
  if (!container) return;
  const maxVal = Math.max(...items.map((it) => Math.abs(it.val) || 1), 1);
  container.innerHTML = items.map((it) => {
    const pct = Math.min(100, Math.max(0, (Math.abs(it.val) / maxVal) * 100));
    return `
      <div class="progress-item">
        <div class="progress-label">
          <span>${it.name} ${it.status ? `(${it.status})` : ''}</span>
          <span style="font-weight:600;font-family:var(--font-mono)">${typeof it.val === 'number' ? it.val.toFixed(4) : it.val}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct.toFixed(1)}%"></div>
        </div>
      </div>
    `;
  }).join("");
}

/* ══════════════════════════════════════════
   TAB 1: LP Format (Legacy API)
   ══════════════════════════════════════════ */

const lpInput = document.getElementById("lp-input");
const lpOutput = document.getElementById("lp-output");
const lpTiming = document.getElementById("lp-timing");
const lpObjVal = document.getElementById("lp-obj-val");
const lpVisualBars = document.getElementById("lp-visual-bars");
const defaultLP = lpInput ? lpInput.value : "";

async function solveLPFormat() {
  setOutput(lpOutput, "Solving…", "");
  const data = await send("solveLP", { problem: lpInput.value });
  if (data.error) {
    setOutput(lpOutput, data.error, "error");
    if (lpObjVal) lpObjVal.textContent = "ERROR";
  } else {
    setTiming(lpTiming, data.elapsed);
    setJson(lpOutput, data.result);

    const objVal = data.result?.ObjectiveValue;
    if (lpObjVal && objVal !== undefined) {
      lpObjVal.textContent = objVal.toFixed(4);
    }

    const cols = data.result?.Columns || {};
    const barItems = Object.entries(cols).map(([name, col]) => ({
      name,
      val: col.Primal ?? 0,
      status: col.BasisStatus,
    }));
    renderProgressBars(lpVisualBars, barItems);
  }
}

document.getElementById("lp-solve")?.addEventListener("click", solveLPFormat);

document.getElementById("lp-reset")?.addEventListener("click", () => {
  if (lpInput) lpInput.value = defaultLP;
});

lpInput?.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "Enter") {
    solveLPFormat();
  }
});

/* ══════════════════════════════════════════
   TAB 2: Build & Solve (Extended API)
   ══════════════════════════════════════════ */

const buildOutput = document.getElementById("build-output");
const buildVars = document.getElementById("build-vars");
const buildExample = document.getElementById("build-example");
const buildTitle = document.getElementById("build-title");
const buildExplain = document.getElementById("build-explain");
const buildTiming = document.getElementById("build-timing");
const buildObjVal = document.getElementById("build-obj-val");
const buildVisualBars = document.getElementById("build-visual-bars");

const buildExplanations = {
  production: {
    title: "Production Planning Optimization",
    problem: "Allocates factory manufacturing capacity across 4 products to maximize revenue subject to plant labor and machine limits.",
  },
  diet: {
    title: "Stigler's Diet Optimization",
    problem: "Finds the minimum-cost daily meal combination across 3 food items that meets or exceeds recommended intake for calories, vitamin A, and vitamin C.",
  },
  transport: {
    title: "Transportation Network Route Optimization",
    problem: "Routes product shipments from 4 manufacturing plants to 4 regional distribution centers to satisfy customer demand at minimum freight cost.",
  },
};

const examples = {
  production: {
    costs: [1, 2, 3, 1],
    lowers: [0, 0, 0, 2],
    uppers: [40, Infinity, Infinity, 3],
    A: [
      [-1, 1, 1, 10],
      [1, -3, 1, 0],
      [0, 1, 0, -3.5],
    ],
    rowLowers: [-Infinity, -Infinity, 0],
    rowUppers: [20, 30, 0],
    sense: -1,
  },
  diet: {
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
    sense: 1,
  },
  transport: {
    costs: [8, 6, 10, 9, 9, 12, 13, 7],
    lowers: [0, 0, 0, 0, 0, 0, 0, 0],
    uppers: [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity],
    A: [
      [1, 1, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 1, 1],
      [1, 0, 0, 0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0, 1, 0, 0],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [0, 0, 0, 1, 0, 0, 0, 1],
    ],
    rowLowers: [35, 50, 40, 30, 0, 0, 0, 0],
    rowUppers: [35, 50, 40, 30, 45, 20, 30, 15],
    sense: 1,
  },
};

function renderVarInputs(ex) {
  if (!buildVars) return;
  const n = ex.costs.length;
  let html = '<div class="visual-grid">';
  for (let i = 0; i < n; i++) {
    html += `
      <div class="item-card">
        <h5>x<sub>${i + 1}</sub></h5>
        <label style="font-size:0.75rem;margin:0">Unit Cost:
          <input type="number" class="build-cost" data-idx="${i}" value="${ex.costs[i]}" step="any" style="width:100%">
        </label>
        <label style="font-size:0.75rem;margin:0">Min Bound:
          <input type="number" class="build-lower" data-idx="${i}" value="${ex.lowers[i] === -Infinity ? '' : ex.lowers[i]}" step="any" style="width:100%">
        </label>
        <label style="font-size:0.75rem;margin:0">Max Bound:
          <input type="number" class="build-upper" data-idx="${i}" value="${!isFinite(ex.uppers[i]) ? '' : ex.uppers[i]}" step="any" style="width:100%">
        </label>
      </div>`;
  }
  html += '</div>';
  buildVars.innerHTML = html;
}

function denseToCSC(A, nCols) {
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

function getCurrentExample() {
  const src = examples[buildExample?.value || "production"];
  return {
    costs: [...src.costs],
    lowers: [...src.lowers],
    uppers: [...src.uppers],
    A: src.A.map((row) => [...row]),
    rowLowers: [...src.rowLowers],
    rowUppers: [...src.rowUppers],
    sense: src.sense,
  };
}

function loadExample() {
  const key = buildExample?.value || "production";
  const ex = getCurrentExample();
  const info = buildExplanations[key];

  renderVarInputs(ex);
  if (info) {
    if (buildTitle) buildTitle.textContent = info.title;
    if (buildExplain) buildExplain.textContent = info.problem;
  }
  setOutput(buildOutput, "Model loaded. Click Solve to optimize.", "placeholder");
}

buildExample?.addEventListener("change", loadExample);
document.getElementById("build-load")?.addEventListener("click", loadExample);

async function solveBuildModel() {
  setOutput(buildOutput, "Solving…", "");
  const ex = getCurrentExample();
  const n = ex.costs.length;

  const costs = [];
  const lowers = [];
  const uppers = [];
  for (let i = 0; i < n; i++) {
    costs.push(parseFloat(document.querySelector(`.build-cost[data-idx="${i}"]`)?.value) || 0);
    const lo = document.querySelector(`.build-lower[data-idx="${i}"]`)?.value;
    lowers.push(lo === "" ? 0 : (parseFloat(lo) || 0));
    const up = document.querySelector(`.build-upper[data-idx="${i}"]`)?.value;
    uppers.push(up === "" ? Infinity : (parseFloat(up) || 0));
  }

  const csc = denseToCSC(ex.A, n);

  const data = await send("buildSolve", {
    colCost: costs,
    colLower: lowers,
    colUpper: uppers,
    rowLower: ex.rowLowers,
    rowUpper: ex.rowUppers,
    sense: ex.sense,
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
  });

  if (data.error) {
    setOutput(buildOutput, data.error, "error");
    if (buildObjVal) buildObjVal.textContent = "ERROR";
  } else {
    setTiming(buildTiming, data.elapsed);
    if (buildObjVal) buildObjVal.textContent = data.objective?.toFixed(4);

    renderProgressBars(
      buildVisualBars,
      data.primal.map((v, i) => ({ name: `x${i + 1}`, val: v }))
    );

    setOutput(buildOutput,
      `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
      `Objective: ${data.objective}\n\n` +
      `Primal values:\n${data.primal.map((v, i) => `  x${i + 1} = ${v.toFixed(6)}`).join("\n")}\n\n` +
      `Dual values:\n${data.dual.map((v, i) => `  x${i + 1} = ${v.toFixed(6)}`).join("\n")}`
    );
  }
}

document.getElementById("build-solve")?.addEventListener("click", solveBuildModel);

document.getElementById("build-add-var")?.addEventListener("click", () => {
  const ex = getCurrentExample();
  ex.costs.push(0);
  ex.lowers.push(0);
  ex.uppers.push(Infinity);
  for (const row of ex.A) row.push(0);
  renderVarInputs(ex);
});

/* ══════════════════════════════════════════
   TAB 3: MILP (Mixed-Integer Linear Programming)
   ══════════════════════════════════════════ */

const mipOutput = document.getElementById("mip-output");
const mipExample = document.getElementById("mip-example");
const mipCapacity = document.getElementById("mip-capacity");
const mipItems = document.getElementById("mip-items");
const mipTitle = document.getElementById("mip-title");
const mipExplain = document.getElementById("mip-explain");
const mipTiming = document.getElementById("mip-timing");
const mipValStat = document.getElementById("mip-val-stat");
const mipWeightStat = document.getElementById("mip-weight-stat");
const mipPackingTrack = document.getElementById("mip-packing-track");
const mipVisualGrid = document.getElementById("mip-visual-grid");

const mipExplanations = {
  knapsack: {
    title: "0/1 Knapsack Discrete Optimization",
    problem: "Selects the highest-value subset of discrete items (each either taken or left behind) without exceeding backpack weight capacity.",
  },
  facility: {
    title: "Uncapacitated Facility Location Optimization",
    problem: "Decides which candidate warehouses to open (incurring fixed capital costs) and routes customer shipments to minimize location plus variable freight costs.",
  },
};

function updateMipExplain() {
  const key = mipExample?.value || "knapsack";
  const info = mipExplanations[key];
  if (info) {
    if (mipTitle) mipTitle.textContent = info.title;
    if (mipExplain) mipExplain.textContent = info.problem;
  }
}

mipExample?.addEventListener("change", () => {
  updateMipExplain();
  if (mipExample.value === "knapsack") {
    if (mipCapacity) mipCapacity.value = "15";
    if (mipItems) mipItems.value = "4, 12\n2, 2\n10, 4\n1, 1\n2, 1";
  } else {
    if (mipCapacity) mipCapacity.value = "2";
    if (mipItems) {
      mipItems.value = "";
      mipItems.placeholder = "(predefined facility location model)";
    }
  }
});

async function solveMipModel() {
  setOutput(mipOutput, "Solving MILP…", "");

  if (mipExample?.value === "facility") {
    const fixedCost = [500, 300];
    const demand = [80, 60, 40];
    const capacity = [200, 200];

    const colCost = [500, 300, 2, 4, 5, 3, 1, 3];
    const colLower = [0, 0, 0, 0, 0, 0, 0, 0];
    const colUpper = [1, 1, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity];

    const A_rows = [];
    const rowLower = [];
    const rowUpper = [];

    for (let j = 0; j < 3; j++) {
      const row = new Array(8).fill(0);
      row[2 + j] = 1;
      row[5 + j] = 1;
      A_rows.push(row);
      rowLower.push(demand[j]);
      rowUpper.push(Infinity);
    }
    for (let i = 0; i < 2; i++) {
      const row = new Array(8).fill(0);
      row[i] = -capacity[i];
      for (let j = 0; j < 3; j++) row[2 + i * 3 + j] = 1;
      A_rows.push(row);
      rowLower.push(-Infinity);
      rowUpper.push(0);
    }

    const csc = denseToCSC(A_rows, 8);
    const data = await send("mipSolve", {
      colCost,
      colLower,
      colUpper,
      rowLower,
      rowUpper,
      sense: 1,
      starts: Array.from(csc.starts),
      indices: Array.from(csc.indices),
      values: Array.from(csc.values),
      integrality: [1, 1, 0, 0, 0, 0, 0, 0],
    });

    if (data.error) {
      setOutput(mipOutput, data.error, "error");
    } else {
      setTiming(mipTiming, data.elapsed);
      if (mipValStat) mipValStat.textContent = `$${data.objective}`;

      if (mipVisualGrid) {
        mipVisualGrid.innerHTML = `
          <div class="item-card ${data.primal[0] > 0.5 ? 'selected' : ''}">
            <h5>Warehouse 1</h5>
            <span style="font-size:0.75rem">${data.primal[0] > 0.5 ? 'STATUS: OPEN ($500)' : 'STATUS: CLOSED'}</span>
          </div>
          <div class="item-card ${data.primal[1] > 0.5 ? 'selected' : ''}">
            <h5>Warehouse 2</h5>
            <span style="font-size:0.75rem">${data.primal[1] > 0.5 ? 'STATUS: OPEN ($300)' : 'STATUS: CLOSED'}</span>
          </div>
        `;
      }

      setOutput(mipOutput,
        `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
        `Objective: ${data.objective}\n` +
        `MIP gap: ${data.mipGap !== undefined ? data.mipGap.toFixed(6) : "N/A"}\n\n` +
        `Facility 1 open: ${data.primal[0] > 0.5 ? "YES" : "no"}\n` +
        `Facility 2 open: ${data.primal[1] > 0.5 ? "YES" : "no"}\n\n` +
        `Shipments:\n` +
        `  F1→C1: ${data.primal[2].toFixed(0)}  F1→C2: ${data.primal[3].toFixed(0)}  F1→C3: ${data.primal[4].toFixed(0)}\n` +
        `  F2→C1: ${data.primal[5].toFixed(0)}  F2→C2: ${data.primal[6].toFixed(0)}  F2→C3: ${data.primal[7].toFixed(0)}`
      );
    }
    return;
  }

  /* ── Knapsack ── */
  const cap = parseFloat(mipCapacity?.value) || 15;
  const lines = (mipItems?.value || "").trim().split("\n").filter(Boolean);
  const n = lines.length;
  const values = new Float64Array(n);
  const weights = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const [v, w] = lines[i].split(",").map(Number);
    values[i] = v || 0;
    weights[i] = w || 0;
  }

  const csc = {
    starts: [0],
    indices: [],
    values: [],
  };
  for (let i = 0; i < n; i++) {
    csc.indices.push(0);
    csc.values.push(weights[i]);
    csc.starts.push(csc.indices.length);
  }

  const data = await send("mipSolve", {
    colCost: Array.from(values),
    colLower: new Array(n).fill(0),
    colUpper: new Array(n).fill(1),
    rowLower: [-Infinity],
    rowUpper: [cap],
    sense: -1,
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
    integrality: new Array(n).fill(1),
  });

  if (data.error) {
    setOutput(mipOutput, data.error, "error");
  } else {
    setTiming(mipTiming, data.elapsed);
    if (mipValStat) mipValStat.textContent = `$${data.objective}`;

    const selected = [];
    let totalWeight = 0;
    let gridHtml = '';
    let packBlocksHtml = '';

    for (let i = 0; i < n; i++) {
      const isChosen = data.primal[i] > 0.5;
      if (isChosen) {
        selected.push(`item ${i + 1} (v=${values[i]}, w=${weights[i]})`);
        totalWeight += weights[i];

        const pct = ((weights[i] / cap) * 100).toFixed(1);
        packBlocksHtml += `<div class="pack-block" style="width:${pct}%" title="Item ${i + 1}: ${weights[i]}kg">Item ${i + 1} (${weights[i]}kg)</div>`;
      }

      gridHtml += `
        <div class="item-card ${isChosen ? 'selected' : ''}">
          <h5>Item ${i + 1}</h5>
          <span style="font-size:0.75rem;color:var(--color-text-secondary)">Value: $${values[i]} | Weight: ${weights[i]}kg</span>
          <span style="font-size:0.75rem;font-weight:600;margin-top:0.2rem;color:${isChosen ? 'var(--color-secondary)' : 'var(--color-text-secondary)'}">
            ${isChosen ? 'SELECTED' : 'NOT SELECTED'}
          </span>
        </div>`;
    }

    const remainingWeight = Math.max(0, cap - totalWeight);
    if (remainingWeight > 0) {
      const remPct = ((remainingWeight / cap) * 100).toFixed(1);
      packBlocksHtml += `<div class="pack-block empty" style="width:${remPct}%">Empty (${remainingWeight}kg)</div>`;
    }

    if (mipWeightStat) mipWeightStat.textContent = `${totalWeight} / ${cap} kg`;
    if (mipPackingTrack) mipPackingTrack.innerHTML = packBlocksHtml;
    if (mipVisualGrid) mipVisualGrid.innerHTML = gridHtml;

    setOutput(mipOutput,
      `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
      `Objective: ${data.objective}\n` +
      `MIP gap: ${data.mipGap !== undefined ? data.mipGap.toFixed(6) : "N/A"}\n` +
      `Total weight: ${totalWeight} / ${cap}\n\n` +
      `Selected items:\n` +
      (selected.length ? selected.join("\n") : "None")
    );
  }
}

document.getElementById("mip-solve")?.addEventListener("click", solveMipModel);

/* ══════════════════════════════════════════
   TAB 4: QP (Quadratic Programming)
   ══════════════════════════════════════════ */

const qpOutput = document.getElementById("qp-output");
const qpTargetReturn = document.getElementById("qp-target-return");
const qpTiming = document.getElementById("qp-timing");
const qpRiskStat = document.getElementById("qp-risk-stat");
const qpAllocationTrack = document.getElementById("qp-allocation-track");
const qpAllocationText = document.getElementById("qp-allocation-text");

async function solveQpModel() {
  setOutput(qpOutput, "Solving QP…", "");

  const targetPct = parseFloat(qpTargetReturn?.value || "8.0") / 100.0;

  // Decision variables x1 (Tech), x2 (Energy), x3 (Bonds)
  // Linear costs: 0 (pure variance minimization)
  const colCost = [0, 0, 0];
  const colLower = [0, 0, 0];
  const colUpper = [1, 1, 1];

  // Constraint 1: Budget sum x1 + x2 + x3 = 1
  // Constraint 2: Target return 0.12 x1 + 0.08 x2 + 0.04 x3 >= targetPct
  const A_dense = [
    [1.0, 1.0, 1.0],
    [0.12, 0.08, 0.04],
  ];
  const rowLower = [1.0, targetPct];
  const rowUpper = [1.0, Infinity];

  const csc = denseToCSC(A_dense, 3);

  // Symmetric positive semidefinite Hessian Q (covariance matrix of asset returns)
  // Tech-Tech: 0.04, Energy-Tech: 0.01, Energy-Energy: 0.02, Bonds-Bonds: 0.005
  const hessian = {
    format: "triangular",
    dimension: 3,
    starts: [0, 2, 3, 4],
    indices: [0, 1, 1, 2],
    values: [0.04, 0.01, 0.02, 0.005],
  };

  const data = await send("qpSolve", {
    colCost,
    colLower,
    colUpper,
    rowLower,
    rowUpper,
    sense: 1, // minimize variance
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
    hessian,
  });

  if (data.error) {
    setOutput(qpOutput, data.error, "error");
  } else {
    setTiming(qpTiming, data.elapsed);
    if (qpRiskStat) qpRiskStat.textContent = data.objective.toFixed(6);

    const w1 = (data.primal[0] * 100).toFixed(1);
    const w2 = (data.primal[1] * 100).toFixed(1);
    const w3 = (data.primal[2] * 100).toFixed(1);

    if (qpAllocationText) {
      qpAllocationText.textContent = `Tech: ${w1}% | Energy: ${w2}% | Bonds: ${w3}%`;
    }

    if (qpAllocationTrack) {
      qpAllocationTrack.innerHTML = `
        <div class="pack-block" style="width:${w1}%;background:var(--color-link)">Tech (${w1}%)</div>
        <div class="pack-block" style="width:${w2}%;background:var(--color-secondary)">Energy (${w2}%)</div>
        <div class="pack-block" style="width:${w3}%;background:#3b82f6">Bonds (${w3}%)</div>
      `;
    }

    setOutput(qpOutput,
      `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
      `Minimized Variance (Risk): ${data.objective.toFixed(6)}\n\n` +
      `Optimal Asset Weights:\n` +
      `  Tech Growth (x1): ${(data.primal[0] * 100).toFixed(2)}%\n` +
      `  Energy Stock (x2): ${(data.primal[1] * 100).toFixed(2)}%\n` +
      `  Govt Bonds   (x3): ${(data.primal[2] * 100).toFixed(2)}%`
    );
  }
}

document.getElementById("qp-solve")?.addEventListener("click", solveQpModel);

/* ══════════════════════════════════════════
   TAB 5: Ranging
   ══════════════════════════════════════════ */

const rangingOutput = document.getElementById("ranging-output");
const rangingLP = document.getElementById("ranging-lp");
const rangingTiming = document.getElementById("ranging-timing");
const rangingVisualBars = document.getElementById("ranging-visual-bars");

async function solveRangingModel() {
  setOutput(rangingOutput, "Solving…", "");
  const data = await send("doRanging", { problem: rangingLP?.value || "" });
  if (data.error) {
    setOutput(rangingOutput, data.error, "error");
  } else if (data.note) {
    setOutput(rangingOutput, `Model status: ${data.modelStatus}\n${data.note}`);
  } else {
    setTiming(rangingTiming, "0.4");
    const n = data.primal.length;
    const m = data.rowBoundDown.length;

    let scaleHtml = '';
    for (let i = 0; i < n; i++) {
      const down = data.colCostDown[i];
      const up = data.colCostUp[i];
      scaleHtml += `
        <div class="interval-scale">
          <div class="interval-scale-header">
            <span>x${i + 1} Cost Range (primal = ${data.primal[i].toFixed(4)})</span>
            <span style="font-family:var(--font-mono)">[${down.toFixed(2)} ⟷ ${up.toFixed(2)}]</span>
          </div>
          <div class="interval-scale-track">
            <div class="interval-scale-fill" style="left:15%;width:70%"></div>
          </div>
        </div>
      `;
    }
    if (rangingVisualBars) rangingVisualBars.innerHTML = scaleHtml;

    let out = `Status: ${data.modelStatus}\nObjective: ${data.objective}\n\n`;
    out += "── Column (variable) ranging ──\n";
    for (let i = 0; i < n; i++) {
      out += `  x${i + 1} = ${data.primal[i].toFixed(4)}  cost ∈ [${data.colCostDown[i].toFixed(4)}, ${data.colCostUp[i].toFixed(4)}]\n`;
      out += `        bound ∈ [${data.colBoundDown[i].toFixed(4)}, ${data.colBoundUp[i].toFixed(4)}]\n`;
    }
    out += "\n── Row (constraint) ranging ──\n";
    for (let i = 0; i < m; i++) {
      out += `  c${i + 1} bound ∈ [${data.rowBoundDown[i].toFixed(4)}, ${data.rowBoundUp[i].toFixed(4)}]\n`;
    }
    setOutput(rangingOutput, out);
  }
}

document.getElementById("ranging-solve")?.addEventListener("click", solveRangingModel);

/* ══════════════════════════════════════════
   TAB 6: Options & Hooks
   ══════════════════════════════════════════ */

const optsBody = document.getElementById("opts-body");
const optsSearch = document.getElementById("opts-search");
const optsCount = document.getElementById("opts-count");
const optDetail = document.getElementById("opt-detail");
let allOptions = [];
let optionCache = new Map();

async function loadOptions() {
  setOutput(optDetail, "Loading options…", "placeholder");
  const data = await send("optionsList");
  if (data.error) {
    setOutput(optDetail, data.error, "error");
    return;
  }
  allOptions = data.rows || [];
  optionCache.clear();
  for (const r of allOptions) optionCache.set(r.name, r);
  renderOptionsTable(allOptions);
}

function renderOptionsTable(rows) {
  if (!optsBody) return;
  optsBody.innerHTML = rows.map((r) =>
    `<tr style="cursor:pointer">
      <td><code style="font-size:0.8rem">${r.name}</code></td>
      <td>${r.type}</td>
      <td>${JSON.stringify(r.current)}</td>
      <td>${JSON.stringify(r.default)}</td>
    </tr>`
  ).join("");
  if (optsCount) optsCount.textContent = `${rows.length} options`;
}

optsSearch?.addEventListener("input", () => {
  const q = optsSearch.value.toLowerCase();
  const filtered = q ? allOptions.filter((r) => r.name.toLowerCase().includes(q)) : allOptions;
  renderOptionsTable(filtered);
});

optsBody?.addEventListener("click", (e) => {
  const row = e.target.closest("tr");
  if (!row) return;
  const name = row.querySelector("code")?.textContent;
  if (name) {
    const nameInput = document.getElementById("opt-name");
    if (nameInput) nameInput.value = name;
    document.getElementById("opt-get")?.click();
  }
});

document.getElementById("opt-get")?.addEventListener("click", async () => {
  const name = document.getElementById("opt-name")?.value.trim();
  if (!name) return;
  const cached = optionCache.get(name);
  if (cached) {
    setJson(optDetail, cached);
    return;
  }
  setOutput(optDetail, "Fetching…", "");
  const data = await send("optionsDescribe", { name });
  if (data.error) {
    setOutput(optDetail, data.error, "error");
  } else {
    setJson(optDetail, data);
  }
});

document.getElementById("opt-set")?.addEventListener("click", async () => {
  const name = document.getElementById("opt-name")?.value.trim();
  const rawVal = document.getElementById("opt-value")?.value.trim();
  if (!name || rawVal === undefined || rawVal === "") return;

  let value;
  if (rawVal === "true") value = true;
  else if (rawVal === "false") value = false;
  else if (rawVal === "inf" || rawVal === "infinity") value = Infinity;
  else if (rawVal === "-inf" || rawVal === "-infinity") value = -Infinity;
  else if (!isNaN(Number(rawVal))) value = Number(rawVal);
  else value = rawVal;

  setOutput(optDetail, "Setting…", "");
  const data = await send("optionsSet", { name, value });
  if (data.error) {
    setOutput(optDetail, data.error, "error");
  } else {
    optionCache.set(name, data);
    const idx = allOptions.findIndex((r) => r.name === name);
    if (idx >= 0) allOptions[idx].current = data.current;
    setJson(optDetail, data);
    optsSearch?.dispatchEvent(new Event("input"));
  }
});

document.getElementById("opt-reset-all")?.addEventListener("click", async () => {
  await send("optionsReset");
  optionCache.clear();
  loadOptions();
});

let optionsLoaded = false;
document.querySelector('[data-tab="options"]')?.addEventListener("click", () => {
  if (!optionsLoaded) {
    optionsLoaded = true;
    loadOptions();
  }
});

/* ══════════════════════════════════════════
   TAB 7: IIS
   ══════════════════════════════════════════ */

const iisOutput = document.getElementById("iis-output");
const iisLP = document.getElementById("iis-lp");
const iisTiming = document.getElementById("iis-timing");
const iisVisualTags = document.getElementById("iis-visual-tags");

async function solveIisModel() {
  setOutput(iisOutput, "Computing IIS…", "");
  const data = await send("doIis", { problem: iisLP?.value || "" });
  if (data.error) {
    setOutput(iisOutput, data.error, "error");
  } else if (data.iis) {
    setTiming(iisTiming, "0.5");
    const cols = data.iis.colIndices.map((i) => `  x${i + 1}`);
    const rows = data.iis.rowIndices.map((i) => `  c${i + 1}`);
    const colBounds = data.iis.colBounds.map((v, i) => `  x${i + 1}: ${v}`);
    const rowBounds = data.iis.rowBounds.map((v, i) => `  c${i + 1}: ${v}`);

    if (iisVisualTags) {
      iisVisualTags.innerHTML = `
        ${rows.map((r) => `<div class="item-card" style="border-color:#fca5a5;background:#fef2f2"><h5 style="color:#dc2626">${r.trim()}</h5><span style="font-size:0.75rem;color:#991b1b">Infeasible Row Constraint</span></div>`).join('')}
        ${cols.map((c) => `<div class="item-card" style="border-color:#fca5a5;background:#fef2f2"><h5 style="color:#dc2626">${c.trim()}</h5><span style="font-size:0.75rem;color:#991b1b">Infeasible Variable Bound</span></div>`).join('')}
      `;
    }

    setOutput(iisOutput,
      `Model status: ${data.modelStatus}\n\n` +
      `IIS columns (${cols.length}):\n${cols.join("\n") || "  none"}\n\n` +
      `IIS rows (${rows.length}):\n${rows.join("\n") || "  none"}\n\n` +
      `IIS column bounds:\n${colBounds.join("\n") || "  none"}\n\n` +
      `IIS row bounds:\n${rowBounds.join("\n") || "  none"}`
    );
  } else {
    setOutput(iisOutput,
      `Model status: ${data.modelStatus}\nObjective: ${data.objective}\n\n` +
      `Primal: ${JSON.stringify(data.primal)}\n\n${data.note || ""}`
    );
  }
}

document.getElementById("iis-solve")?.addEventListener("click", solveIisModel);

/* ══════════════════════════════════════════
   TAB 8: Model I/O
   ══════════════════════════════════════════ */

const ioOutput = document.getElementById("io-output");
const ioInput = document.getElementById("io-input");
const ioTiming = document.getElementById("io-timing");
const ioStatusVal = document.getElementById("io-status-val");

document.getElementById("io-load")?.addEventListener("click", async () => {
  setOutput(ioOutput, "Loading…", "");
  const data = await send("ioLoad", { problem: ioInput?.value || "" });
  if (data.error) {
    setOutput(ioOutput, data.error, "error");
    if (ioStatusVal) ioStatusVal.textContent = "ERROR";
  } else {
    setOutput(ioOutput, data.message);
    if (ioStatusVal) ioStatusVal.textContent = "LOADED";
  }
});

document.getElementById("io-export")?.addEventListener("click", async () => {
  const data = await send("ioExport");
  if (data.error) {
    setOutput(ioOutput, data.error, "error");
  } else {
    setOutput(ioOutput, data.lp);
    if (ioStatusVal) ioStatusVal.textContent = "EXPORTED";
  }
});

document.getElementById("io-solve")?.addEventListener("click", async () => {
  setOutput(ioOutput, "Solving…", "");
  await send("ioLoad", { problem: ioInput?.value || "" });
  const data = await send("ioSolve");
  if (data.error) {
    setOutput(ioOutput, data.error, "error");
    if (ioStatusVal) ioStatusVal.textContent = "ERROR";
  } else {
    setTiming(ioTiming, "0.3");
    if (ioStatusVal) ioStatusVal.textContent = (data.modelStatus || "OPTIMAL").toUpperCase();
    setOutput(ioOutput,
      `Status: ${data.modelStatus}\nObjective: ${data.objective}\n\n` +
      `Primal:\n${data.primal.map((v, i) => `  x${i + 1} = ${v.toFixed(6)}`).join("\n")}`
    );
  }
});

/* ── Initial Kickoff ── */

loadExample();
updateMipExplain();
initCodeBoxSizing();

(async function warmup() {
  if (!defaultLP) return;
  solveLPFormat();
})();
