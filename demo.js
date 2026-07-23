/* ── Worker & Message Dispatch ── */

const worker = new Worker("worker.js");
let msgId = 0;
const pending = new Map();

function send(action, payload = {}) {
  const id = ++msgId;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ error: `The solver did not respond to "${action}".` });
    }, 30000);
    pending.set(id, { resolve, timer });
    worker.postMessage({ id, action, ...payload });
  });
}

worker.addEventListener("message", ({ data }) => {
  const request = pending.get(data.id);
  if (request) {
    pending.delete(data.id);
    clearTimeout(request.timer);
    request.resolve(data);
  }
});

worker.addEventListener("error", (err) => {
  console.error("Worker error:", err);
  for (const request of pending.values()) {
    clearTimeout(request.timer);
    request.resolve({ error: "The solver worker failed to load." });
  }
  pending.clear();
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

/* ── Example Navigation ── */

const navItems = document.querySelectorAll("#tabs [data-tab]");
const panels = document.querySelectorAll(".tab-panel");
const navigationHandlers = new Map();

function activateNavigation(item) {
  const { tab, example } = item.dataset;
  navItems.forEach((candidate) => {
    const active = candidate === item;
    candidate.classList.toggle("active", active);
    candidate.setAttribute("aria-selected", String(active));
    candidate.tabIndex = active ? 0 : -1;
  });
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === `panel-${tab}`));
  navigationHandlers.get(tab)?.(example);
  setTimeout(initCodeBoxSizing, 10);
}

navItems.forEach((item, index) => {
  item.addEventListener("click", () => activateNavigation(item));
  item.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = navItems[(index + offset + navItems.length) % navItems.length];
    activateNavigation(next);
    next.focus();
  });
});

/* ── UI Output Helpers ── */

function setOutput(el, text, cls = "") {
  if (!el) return;
  el.textContent = text;
  el.className = `output ${cls}`;
}

function setJson(el, obj) {
  if (!el) return;
  el.innerHTML = highlightCode(JSON.stringify(obj, null, 2), "json");
  el.className = "output syntax-output";
}

function setTiming(el, ms) {
  if (!el) return;
  el.textContent = `Solved locally in ${ms} ms`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlightCode(source, language) {
  const grammar = window.Prism?.languages[language];
  return grammar ? window.Prism.highlight(source, grammar, language) : escapeHtml(source);
}

function enhanceSyntaxEditors() {
  document.querySelectorAll(".code-editor-box textarea").forEach((textarea) => {
    const code = document.createElement("pre");
    code.id = textarea.id;
    code.className = "highlighted-code language-js";
    code.innerHTML = highlightCode(textarea.value, "javascript");
    code.setAttribute("aria-label", "JavaScript example");
    textarea.replaceWith(code);
  });

  document.querySelectorAll(".hero-sample pre").forEach((code) => {
    code.innerHTML = highlightCode(code.textContent, "javascript");
  });

  for (const id of ["lp-input", "ranging-lp", "iis-lp", "io-input"]) {
    const textarea = document.getElementById(id);
    if (!textarea) continue;
    const wrapper = document.createElement("div");
    wrapper.className = "syntax-editor language-lp";
    const highlight = document.createElement("pre");
    highlight.setAttribute("aria-hidden", "true");
    const sync = () => {
      highlight.innerHTML = `${highlightCode(textarea.value, "lp")}\n`;
    };
    textarea.before(wrapper);
    wrapper.append(highlight, textarea);
    textarea.addEventListener("input", sync);
    textarea.addEventListener("scroll", () => {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    });
    sync();
  }
}

function setStatus(el, value) {
  if (el) el.textContent = String(value || "unknown").toUpperCase();
}

function renderProgressBars(container, items) {
  if (!container) return;
  const maxVal = Math.max(...items.map((it) => Math.abs(it.val) || 1), 1);
  container.innerHTML = items.map((it) => {
    const pct = Math.min(100, Math.max(0, (Math.abs(it.val) / maxVal) * 100));
    return `
      <div class="progress-item">
        <div class="progress-label">
          <span>${escapeHtml(it.name)} ${it.status ? `(${escapeHtml(it.status)})` : ''}</span>
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
const lpStatus = document.getElementById("lp-status");
const defaultLP = lpInput ? lpInput.value : "";

async function solveLPFormat() {
  setOutput(lpOutput, "Solving…", "");
  setStatus(lpStatus, "solving");
  const data = await send("solveLP", { problem: lpInput.value });
  if (data.error) {
    setOutput(lpOutput, data.error, "error");
    if (lpObjVal) lpObjVal.textContent = "ERROR";
    setStatus(lpStatus, "error");
  } else {
    setTiming(lpTiming, data.elapsed);
    setJson(lpOutput, data.result);

    const objVal = data.result?.ObjectiveValue;
    setStatus(lpStatus, data.result?.Status || "complete");
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
  if (lpInput) {
    lpInput.value = defaultLP;
    lpInput.dispatchEvent(new Event("input"));
  }
});

lpInput?.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    solveLPFormat();
  }
});

/* ══════════════════════════════════════════
   TAB 2: Build & Solve (Extended API)
   ══════════════════════════════════════════ */

const buildOutput = document.getElementById("build-output");
const buildVars = document.getElementById("build-vars");
const buildTitle = document.getElementById("build-title");
const buildExplain = document.getElementById("build-explain");
const buildTiming = document.getElementById("build-timing");
const buildObjVal = document.getElementById("build-obj-val");
const buildVisualBars = document.getElementById("build-visual-bars");
const buildStatus = document.getElementById("build-status");

const buildExplanations = {
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
    sense: "maximize",
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
    sense: "minimize",
  },
  transport: {
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

let activeExample;
let activeBuildExampleKey = "production";
let buildMatrixExplorer;
let qpMatrixExplorer;

function renderVarInputs(ex) {
  if (!buildVars) return;
  const n = ex.costs.length;
  let html = '<div class="visual-grid">';
  for (let i = 0; i < n; i++) {
    html += `
      <div class="item-card">
        <h5>x<sub>${i}</sub></h5>
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

function displayNumber(value) {
  if (!Number.isFinite(value)) return value < 0 ? "-∞" : "∞";
  return Number(value.toFixed(4)).toString();
}

function constraintExplorerConfig(key, example) {
  const columnNames = example.costs.map((_, index) => `x${index}`);
  const rowNames = example.A.map((_, index) => `r${index}`);
  return {
    title: `${buildExplanations[key].title}: matrix A`,
    description: "Follow each nonzero coefficient from a constraint into the dense matrix and then into CSC storage.",
    symbol: "A",
    dense: example.A,
    columnNames,
    rowNames,
    rowLowers: example.rowLowers,
    rowUppers: example.rowUppers,
    triangular: false,
  };
}

function hessianExplorerConfig(targetReturn = 0.08) {
  return {
    title: "Portfolio covariance: triangular Hessian Q",
    description: "The objective uses a symmetric matrix. HiGHS stores one triangle in the same column-oriented arrays instead of duplicating mirrored entries.",
    symbol: "Q",
    dense: [
      [0.08, 0.02, 0],
      [0.02, 0.04, 0],
      [0, 0, 0.01],
    ],
    columnNames: ["x0", "x1", "x2"],
    rowNames: ["x0", "x1", "x2"],
    mathRows: [
      {
        label: "minimize",
        terms: [
          { text: "0.04x0²", row: 0, column: 0 },
          { text: "+ 0.02x0x1", row: 1, column: 0 },
          { text: "+ 0.02x1²", row: 1, column: 1 },
          { text: "+ 0.005x2²", row: 2, column: 2 },
        ],
      },
      { label: "subject to", text: "x0 + x1 + x2 = 1" },
      { label: "", text: `0.12x0 + 0.08x1 + 0.04x2 ≥ ${displayNumber(targetReturn)}` },
      { label: "bounds", text: "0 ≤ x0, x1, x2 ≤ 1" },
    ],
    triangular: true,
  };
}

function createSparseExplorer(container, initialConfig) {
  if (!container) return null;
  let config;
  let entries;
  let starts;
  let step = 0;
  let timer;
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let hovered = false;
  let linkedEventsBound = false;

  function sparseData() {
    const result = [];
    const offsets = [0];
    for (let column = 0; column < config.columnNames.length; column++) {
      for (let row = 0; row < config.dense.length; row++) {
        const value = config.dense[row][column];
        if (value !== 0 && (!config.triangular || row >= column)) {
          result.push({ row, column, value });
        }
      }
      offsets.push(result.length);
    }
    return { result, offsets };
  }

  function entryIndexForCell(row, column) {
    const storedRow = config.triangular ? Math.max(row, column) : row;
    const storedColumn = config.triangular ? Math.min(row, column) : column;
    return entries.findIndex((entry) => entry.row === storedRow && entry.column === storedColumn);
  }

  function formulaMarkup(rowIndex) {
    const terms = [];
    config.dense[rowIndex].forEach((coefficient, columnIndex) => {
      if (coefficient === 0) return;
      const magnitude = Math.abs(coefficient);
      const variable = config.columnNames[columnIndex];
      const value = magnitude === 1 ? variable : `${displayNumber(magnitude)}${variable}`;
      const signed = !terms.length
        ? (coefficient < 0 ? `−${value}` : value)
        : `${coefficient < 0 ? "−" : "+"} ${value}`;
      const entryIndex = entryIndexForCell(rowIndex, columnIndex);
      terms.push(`<span class="formula-term" data-entry-index="${entryIndex}">${escapeHtml(signed)}</span>`);
    });
    const expression = terms.join(" ") || "0";
    if (config.triangular) {
      return `<span class="formula-prefix">${escapeHtml(config.symbol)} row ${escapeHtml(config.rowNames[rowIndex])}:</span> ${expression}`;
    }
    const lower = config.rowLowers[rowIndex];
    const upper = config.rowUppers[rowIndex];
    if (lower === upper) return `${expression} = ${escapeHtml(displayNumber(lower))}`;
    if (!Number.isFinite(lower)) return `${expression} ≤ ${escapeHtml(displayNumber(upper))}`;
    if (!Number.isFinite(upper)) return `${expression} ≥ ${escapeHtml(displayNumber(lower))}`;
    return `${escapeHtml(displayNumber(lower))} ≤ ${expression} ≤ ${escapeHtml(displayNumber(upper))}`;
  }

  function mathematicalRowMarkup(row, index) {
    if (!config.mathRows) return formulaMarkup(index);
    const label = row.label ? `<span class="math-role">${escapeHtml(row.label)}</span>` : '<span class="math-role"></span>';
    if (row.terms) {
      const terms = row.terms.map((term) => {
        const entryIndex = entryIndexForCell(term.row, term.column);
        return `<span class="formula-term" data-entry-index="${entryIndex}">${escapeHtml(term.text)}</span>`;
      }).join(" ");
      return `${label}<span class="math-expression">${terms}</span>`;
    }
    return `${label}<span class="math-expression">${escapeHtml(row.text)}</span>`;
  }

  function cells(values, name) {
    return values.map((value, index) =>
      `<span class="array-cell" data-array="${name}" data-index="${index}" ${name === "starts" ? `data-column-index="${Math.min(index, config.columnNames.length - 1)}"` : `data-entry-index="${index}"`}>${escapeHtml(displayNumber(value))}</span>`
    ).join("");
  }

  function renderStructure() {
    const matrixRows = config.dense.map((row, rowIndex) => `
      <tr>
        <th><span class="matrix-axis-name">${escapeHtml(config.rowNames[rowIndex])}</span></th>
        ${row.map((value, columnIndex) => {
          const entryIndex = value === 0 ? -1 : entryIndexForCell(rowIndex, columnIndex);
          return `<td class="${value === 0 ? "" : "nonzero"}" data-matrix-row="${rowIndex}" data-matrix-column="${columnIndex}" ${entryIndex >= 0 ? `data-entry-index="${entryIndex}"` : "data-zero"}>${escapeHtml(displayNumber(value))}</td>`;
        }).join("")}
      </tr>`).join("");
    const matrixHead = config.columnNames.map((name) => `<th><span class="matrix-axis-name">${escapeHtml(name)}</span></th>`).join("");
    const indices = entries.map((entry) => entry.row);
    const values = entries.map((entry) => entry.value);

    container.innerHTML = `
      <div class="sparse-explorer-header">
        <div><strong>${escapeHtml(config.title)}</strong><p>${escapeHtml(config.description)}</p></div>
        <div class="sparse-controls">
          <button class="sparse-control" data-action="previous" aria-label="Previous stored coefficient">←</button>
          <button class="sparse-control" data-action="play">${playing ? "Pause" : "Play"}</button>
          <button class="sparse-control" data-action="next" aria-label="Next stored coefficient">→</button>
        </div>
      </div>
      <div class="sparse-flow">
        <section class="sparse-stage">
          <div class="sparse-stage-label">1 · ${config.mathRows ? "Optimization model" : "Linear constraints"}</div>
          <div class="formula-list">${(config.mathRows || config.dense).map((row, index) => `<div class="formula-row ${config.mathRows ? "math-model-row" : ""}" data-formula-row="${index}">${mathematicalRowMarkup(row, index)}</div>`).join("")}</div>
        </section>
        <section class="sparse-stage">
          <div class="sparse-stage-label">2 · Dense ${escapeHtml(config.symbol)} matrix</div>
          <div class="matrix-wrap"><table class="matrix-table"><thead><tr><th></th>${matrixHead}</tr></thead><tbody>${matrixRows}</tbody></table></div>
          ${config.triangular ? '<div class="sparse-legend">Coral is stored; mint is the mirrored value implied by symmetry.</div>' : ""}
        </section>
        <section class="sparse-stage">
          <div class="sparse-stage-label">3 · ${config.triangular ? "Triangular CSC" : "CSC"} arrays</div>
          <div class="array-stack">
            <div class="array-row"><span class="array-name">starts</span><div class="array-cells">${cells(starts, "starts")}</div></div>
            <div class="array-row"><span class="array-name">indices</span><div class="array-cells">${cells(indices, "indices")}</div></div>
            <div class="array-row"><span class="array-name">values</span><div class="array-cells">${cells(values, "values")}</div></div>
          </div>
        </section>
      </div>
      <div class="sparse-narration" aria-live="polite"></div>`;

    container.querySelector('[data-action="previous"]').addEventListener("click", () => move(-1));
    container.querySelector('[data-action="next"]').addEventListener("click", () => move(1));
    container.querySelector('[data-action="play"]').addEventListener("click", togglePlay);
    if (!linkedEventsBound) {
      container.addEventListener("mouseenter", () => {
        hovered = true;
        restartTimer();
      });
      container.addEventListener("mouseleave", () => {
        hovered = false;
        renderStep();
        restartTimer();
      });
      container.addEventListener("pointerover", handleLinkedHover);
      linkedEventsBound = true;
    }
  }

  function clearHighlights() {
    container.querySelectorAll(".active, .boundary, .mirror, .zero-hover").forEach((element) =>
      element.classList.remove("active", "boundary", "mirror", "zero-hover")
    );
  }

  function markEntry(entryIndex) {
    const entry = entries[entryIndex];
    container.querySelectorAll(`[data-entry-index="${entryIndex}"]`).forEach((element) => {
      if (element.matches("td")) {
        const row = Number(element.dataset.matrixRow);
        const column = Number(element.dataset.matrixColumn);
        element.classList.add(row === entry.row && column === entry.column ? "active" : "mirror");
      } else {
        element.classList.add("active");
        element.closest(".formula-row")?.classList.add("active");
      }
    });
  }

  function entryNarration(entryIndex) {
    const entry = entries[entryIndex];
    const from = starts[entry.column];
    const to = starts[entry.column + 1];
    let source;
    if (config.mathRows) {
      const term = config.mathRows.flatMap((row) => row.terms || []).find((candidate) =>
        entryIndexForCell(candidate.row, candidate.column) === entryIndex
      );
      if (entry.row === entry.column) {
        source = `<strong>${escapeHtml(term?.text || "Quadratic term")} → ${escapeHtml(config.symbol)}[${escapeHtml(config.rowNames[entry.row])}, ${escapeHtml(config.columnNames[entry.column])}].</strong> ` +
          `HiGHS evaluates ½xᵀ${escapeHtml(config.symbol)}x, so the diagonal stores ${escapeHtml(displayNumber(entry.value))}, twice the squared-term coefficient.`;
      } else {
        source = `<strong>${escapeHtml(term?.text || "Cross-term")} → ${escapeHtml(config.symbol)}[${escapeHtml(config.rowNames[entry.row])}, ${escapeHtml(config.columnNames[entry.column])}].</strong> ` +
          `The symmetric cross-term appears twice inside ½xᵀ${escapeHtml(config.symbol)}x. Triangular storage keeps this lower-triangle value once; ${escapeHtml(config.symbol)}[${escapeHtml(config.columnNames[entry.column])}, ${escapeHtml(config.rowNames[entry.row])}] is implied.`;
      }
    } else {
      const coefficient = displayNumber(entry.value);
      source = `<strong>${escapeHtml(coefficient)}${escapeHtml(config.columnNames[entry.column])} in ${escapeHtml(config.rowNames[entry.row])} → ${escapeHtml(config.symbol)}[${escapeHtml(config.rowNames[entry.row])}, ${escapeHtml(config.columnNames[entry.column])}].</strong> `;
    }
    return `${source} CSC stores it at entry k=${entryIndex}: ` +
      `starts[${entry.column}]=${from} and starts[${entry.column + 1}]=${to} delimit the ${escapeHtml(config.columnNames[entry.column])} column; ` +
      `indices[${entryIndex}]=${entry.row} selects ${escapeHtml(config.rowNames[entry.row])}, and values[${entryIndex}]=${escapeHtml(displayNumber(entry.value))}.`;
  }

  function highlightEntries(entryIndexes, narration) {
    clearHighlights();
    entryIndexes.forEach(markEntry);
    const columns = [...new Set(entryIndexes.map((index) => entries[index].column))];
    columns.forEach((column) => {
      container.querySelector(`[data-array="starts"][data-index="${column}"]`)?.classList.add("boundary");
      container.querySelector(`[data-array="starts"][data-index="${column + 1}"]`)?.classList.add("boundary");
    });
    container.querySelector(".sparse-narration").innerHTML = narration;
  }

  function renderStep() {
    if (!entries.length) return;
    highlightEntries([step], entryNarration(step));
  }

  function handleLinkedHover(event) {
    const entryTarget = event.target.closest("[data-entry-index]");
    if (entryTarget && container.contains(entryTarget)) {
      const entryIndex = Number(entryTarget.dataset.entryIndex);
      highlightEntries([entryIndex], entryNarration(entryIndex));
      return;
    }

    const columnTarget = event.target.closest("[data-column-index]");
    if (columnTarget && container.contains(columnTarget)) {
      const column = Number(columnTarget.dataset.columnIndex);
      const entryIndexes = entries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.column === column)
        .map(({ index }) => index);
      const from = starts[column];
      const to = starts[column + 1];
      highlightEntries(entryIndexes,
        `<strong>Variable ${escapeHtml(config.columnNames[column])} uses CSC column ${column}.</strong> starts[${column}]=${from} and starts[${column + 1}]=${to}; the ${to - from} stored coefficient${to - from === 1 ? "" : "s"} for this column occupy entries ${from} through ${to - 1}.`
      );
      return;
    }

    const zero = event.target.closest("td[data-zero]");
    if (zero && container.contains(zero)) {
      clearHighlights();
      zero.classList.add("zero-hover");
      const row = Number(zero.dataset.matrixRow);
      const column = Number(zero.dataset.matrixColumn);
      if (!config.mathRows) container.querySelector(`[data-formula-row="${row}"]`)?.classList.add("active");
      container.querySelector(".sparse-narration").innerHTML =
        `<strong>${escapeHtml(config.symbol)}[${row},${column}] is zero.</strong> CSC omits zero coefficients entirely, so this cell has no entry in indices or values.`;
    }
  }

  function restartTimer() {
    clearInterval(timer);
    if (playing && !hovered && entries.length > 1) timer = setInterval(() => move(1, false), 1500);
    const playButton = container.querySelector('[data-action="play"]');
    if (playButton) playButton.textContent = playing ? "Pause" : "Play";
  }

  function move(offset, pause = true) {
    if (pause) playing = false;
    step = (step + offset + entries.length) % entries.length;
    renderStep();
    restartTimer();
  }

  function togglePlay() {
    playing = !playing;
    restartTimer();
  }

  function setConfig(nextConfig) {
    clearInterval(timer);
    config = nextConfig;
    ({ result: entries, offsets: starts } = sparseData());
    step = 0;
    renderStructure();
    renderStep();
    restartTimer();
  }

  setConfig(initialConfig);
  return { setConfig };
}

function getCurrentExample() {
  const src = activeExample || examples[activeBuildExampleKey];
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

function selectBuildExample(key = "production") {
  activeBuildExampleKey = key;
  activeExample = examples[key];
  const ex = getCurrentExample();
  const info = buildExplanations[key];
  buildMatrixExplorer?.setConfig(constraintExplorerConfig(key, ex));

  renderVarInputs(ex);
  if (info) {
    if (buildTitle) buildTitle.textContent = info.title;
    if (buildExplain) buildExplain.textContent = info.problem;
  }
  setOutput(buildOutput, "Model loaded. Click Solve to optimize.", "placeholder");
}

navigationHandlers.set("build", selectBuildExample);

async function solveBuildModel() {
  setOutput(buildOutput, "Solving…", "");
  setStatus(buildStatus, "solving");
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
    setStatus(buildStatus, "error");
  } else {
    setTiming(buildTiming, data.elapsed);
    if (buildObjVal) buildObjVal.textContent = data.objective?.toFixed(4);
    setStatus(buildStatus, data.modelStatus);

    renderProgressBars(
      buildVisualBars,
      data.primal.map((v, i) => ({ name: `x${i}`, val: v }))
    );

    setOutput(buildOutput,
      `Status: ${data.modelStatus} (${data.elapsed} ms)\n` +
      `Objective: ${data.objective}\n\n` +
      `Primal values:\n${data.primal.map((v, i) => `  x${i} = ${v.toFixed(6)}`).join("\n")}\n\n` +
      `Dual values:\n${data.dual.map((v, i) => `  x${i} = ${v.toFixed(6)}`).join("\n")}`
    );
  }
}

document.getElementById("build-solve")?.addEventListener("click", solveBuildModel);

document.getElementById("build-add-var")?.addEventListener("click", () => {
  const ex = getCurrentExample();
  for (let i = 0; i < ex.costs.length; i++) {
    const cost = document.querySelector(`.build-cost[data-idx="${i}"]`)?.value;
    const lower = document.querySelector(`.build-lower[data-idx="${i}"]`)?.value;
    const upper = document.querySelector(`.build-upper[data-idx="${i}"]`)?.value;
    ex.costs[i] = Number(cost) || 0;
    ex.lowers[i] = lower === "" ? 0 : Number(lower) || 0;
    ex.uppers[i] = upper === "" ? Infinity : Number(upper) || 0;
  }
  ex.costs.push(0);
  ex.lowers.push(0);
  ex.uppers.push(Infinity);
  for (const row of ex.A) row.push(0);
  activeExample = ex;
  renderVarInputs(ex);
});

/* ══════════════════════════════════════════
   TAB 3: MILP (Mixed-Integer Linear Programming)
   ══════════════════════════════════════════ */

const mipOutput = document.getElementById("mip-output");
const mipCapacity = document.getElementById("mip-capacity");
const mipCapacityControl = document.getElementById("mip-capacity-control");
const mipItems = document.getElementById("mip-items");
const mipTitle = document.getElementById("mip-title");
const mipExplain = document.getElementById("mip-explain");
const mipTiming = document.getElementById("mip-timing");
const mipValStat = document.getElementById("mip-val-stat");
const mipWeightStat = document.getElementById("mip-weight-stat");
const mipPackingTrack = document.getElementById("mip-packing-track");
const mipVisualGrid = document.getElementById("mip-visual-grid");
const mipStatus = document.getElementById("mip-status");
const mipGapStat = document.getElementById("mip-gap-stat");
const mipItemsLabel = document.getElementById("mip-items-label");
const mipPrimaryLabel = document.getElementById("mip-primary-label");
const mipPackingTitle = document.getElementById("mip-packing-title");
let activeMipExampleKey = "knapsack";

const mipExplanations = {
  knapsack: {
    title: "Binary selection with a 0/1 knapsack",
    problem: "Use binary columns for choices that are either selected or rejected. Each item has integer type with bounds [0, 1], its value contributes to the maximized objective, and its weight contributes to one capacity row. HiGHS proves optimality with branch-and-cut; under a stopping limit, inspect the incumbent and MIP gap instead of assuming the search completed.",
  },
  facility: {
    title: "Capacitated facility location",
    problem: "Use a fixed-charge MILP when opening a facility is a yes/no decision but shipment quantities are continuous. Binary columns pay each warehouse's fixed cost; continuous columns route demand; linking constraints enforce shipments from a warehouse <= capacity × open. This mix of discrete and continuous columns is a standard MILP pattern.",
  },
};

function updateMipExplain(key = activeMipExampleKey) {
  const info = mipExplanations[key];
  if (info) {
    if (mipTitle) mipTitle.textContent = info.title;
    if (mipExplain) mipExplain.textContent = info.problem;
  }
}

function selectMipExample(key = "knapsack") {
  activeMipExampleKey = key;
  updateMipExplain(key);
  if (key === "knapsack") {
    if (mipCapacityControl) mipCapacityControl.hidden = false;
    if (mipCapacity) mipCapacity.disabled = false;
    if (mipItems) mipItems.disabled = false;
    if (mipItems) mipItems.hidden = false;
    if (mipItemsLabel) mipItemsLabel.hidden = false;
    if (mipItemsLabel) mipItemsLabel.textContent = "Knapsack items (value, weight per line)";
    if (mipPrimaryLabel) mipPrimaryLabel.textContent = "TOTAL VALUE";
    if (mipPackingTitle) mipPackingTitle.textContent = "KNAPSACK WEIGHT DISTRIBUTION";
    if (mipCapacity) mipCapacity.value = "15";
    if (mipItems) mipItems.value = "4, 12\n2, 2\n10, 4\n1, 1\n2, 1";
  } else {
    if (mipCapacityControl) mipCapacityControl.hidden = true;
    if (mipCapacity) mipCapacity.disabled = true;
    if (mipItems) mipItems.disabled = true;
    if (mipItems) mipItems.hidden = true;
    if (mipItemsLabel) mipItemsLabel.hidden = true;
    if (mipPrimaryLabel) mipPrimaryLabel.textContent = "TOTAL COST";
    if (mipPackingTitle) mipPackingTitle.textContent = "FACILITY OPENING PLAN";
    if (mipCapacity) mipCapacity.value = "2";
    if (mipItems) {
      mipItems.value = "";
      mipItems.placeholder = "(predefined facility location model)";
    }
  }
}

navigationHandlers.set("mip", selectMipExample);

async function solveMipModel() {
  setOutput(mipOutput, "Solving MILP…", "");
  setStatus(mipStatus, "solving");

  if (activeMipExampleKey === "facility") {
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
      sense: "minimize",
      starts: Array.from(csc.starts),
      indices: Array.from(csc.indices),
      values: Array.from(csc.values),
      integrality: ["integer", "integer", "continuous", "continuous", "continuous", "continuous", "continuous", "continuous"],
    });

    if (data.error) {
      setOutput(mipOutput, data.error, "error");
      setStatus(mipStatus, "error");
    } else {
      setTiming(mipTiming, data.elapsed);
      if (mipValStat) mipValStat.textContent = `$${data.objective}`;
      setStatus(mipStatus, data.modelStatus);
      if (mipGapStat) mipGapStat.textContent = data.mipGap === undefined ? "--" : `${(data.mipGap * 100).toFixed(2)}%`;
      if (mipWeightStat) mipWeightStat.textContent = "2 candidate sites";
      if (mipPackingTrack) mipPackingTrack.innerHTML = '<div class="pack-block" style="width:100%">Facility opening and shipment plan</div>';

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
  if (!lines.length || cap <= 0 || lines.some((line) => !/^\s*\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?\s*$/.test(line))) {
    setOutput(mipOutput, "Enter at least one item as a positive value and weight, separated by a comma.", "error");
    setStatus(mipStatus, "invalid input");
    return;
  }
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
    sense: "maximize",
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
    integrality: new Array(n).fill("integer"),
  });

  if (data.error) {
    setOutput(mipOutput, data.error, "error");
    setStatus(mipStatus, "error");
  } else {
    setTiming(mipTiming, data.elapsed);
    if (mipValStat) mipValStat.textContent = `$${data.objective}`;
    setStatus(mipStatus, data.modelStatus);
    if (mipGapStat) mipGapStat.textContent = data.mipGap === undefined ? "--" : `${(data.mipGap * 100).toFixed(2)}%`;

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
const qpStatus = document.getElementById("qp-status");

qpTargetReturn?.addEventListener("input", () => {
  const target = parseFloat(qpTargetReturn.value);
  if (Number.isFinite(target)) qpMatrixExplorer?.setConfig(hessianExplorerConfig(target / 100));
});

async function solveQpModel() {
  setOutput(qpOutput, "Solving QP…", "");
  setStatus(qpStatus, "solving");

  const targetPct = parseFloat(qpTargetReturn?.value || "8.0") / 100.0;

  // Decision variables x0 (Tech), x1 (Energy), x2 (Bonds)
  // Linear costs: 0 (pure variance minimization)
  const colCost = [0, 0, 0];
  const colLower = [0, 0, 0];
  const colUpper = [1, 1, 1];

  // Row r0: Budget sum x0 + x1 + x2 = 1
  // Row r1: Target return 0.12 x0 + 0.08 x1 + 0.04 x2 >= targetPct
  const A_dense = [
    [1.0, 1.0, 1.0],
    [0.12, 0.08, 0.04],
  ];
  const rowLower = [1.0, targetPct];
  const rowUpper = [1.0, Infinity];

  const csc = denseToCSC(A_dense, 3);

  // HiGHS evaluates 1/2 x'Qx, so Q is twice the covariance matrix.
  const hessian = {
    format: "triangular",
    dimension: 3,
    starts: [0, 2, 3, 4],
    indices: [0, 1, 1, 2],
    values: [0.08, 0.02, 0.04, 0.01],
  };

  const data = await send("qpSolve", {
    colCost,
    colLower,
    colUpper,
    rowLower,
    rowUpper,
    sense: "minimize",
    starts: Array.from(csc.starts),
    indices: Array.from(csc.indices),
    values: Array.from(csc.values),
    hessian,
  });

  if (data.error) {
    setOutput(qpOutput, data.error, "error");
    setStatus(qpStatus, "error");
  } else {
    setTiming(qpTiming, data.elapsed);
    if (qpRiskStat) qpRiskStat.textContent = data.objective.toFixed(6);
    setStatus(qpStatus, data.modelStatus);

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
      `  Tech Growth (x0): ${(data.primal[0] * 100).toFixed(2)}%\n` +
      `  Energy Stock (x1): ${(data.primal[1] * 100).toFixed(2)}%\n` +
      `  Govt Bonds   (x2): ${(data.primal[2] * 100).toFixed(2)}%`
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
const rangingStatus = document.getElementById("ranging-status");
const rangingStability = document.getElementById("ranging-stability");

async function solveRangingModel() {
  setOutput(rangingOutput, "Solving…", "");
  setStatus(rangingStatus, "solving");
  const data = await send("doRanging", { problem: rangingLP?.value || "" });
  if (data.error) {
    setOutput(rangingOutput, data.error, "error");
    setStatus(rangingStatus, "error");
  } else if (data.note) {
    setOutput(rangingOutput, `Model status: ${data.modelStatus}\n${data.note}`);
    setStatus(rangingStatus, data.modelStatus);
    setStatus(rangingStability, "unavailable");
  } else {
    setTiming(rangingTiming, data.elapsed);
    setStatus(rangingStatus, data.modelStatus);
    setStatus(rangingStability, "stable");
    const n = data.primal.length;
    const m = data.rowBoundDown.length;

    let scaleHtml = '';
    for (let i = 0; i < n; i++) {
      const down = data.colCostDown[i];
      const up = data.colCostUp[i];
      scaleHtml += `
        <div class="interval-scale">
          <div class="interval-scale-header">
            <span>x${i} Cost Range (primal = ${data.primal[i].toFixed(4)})</span>
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
      out += `  x${i} = ${data.primal[i].toFixed(4)}  cost ∈ [${data.colCostDown[i].toFixed(4)}, ${data.colCostUp[i].toFixed(4)}]\n`;
      out += `        bound ∈ [${data.colBoundDown[i].toFixed(4)}, ${data.colBoundUp[i].toFixed(4)}]\n`;
    }
    out += "\n── Row (constraint) ranging ──\n";
    for (let i = 0; i < m; i++) {
      out += `  r${i} bound ∈ [${data.rowBoundDown[i].toFixed(4)}, ${data.rowBoundUp[i].toFixed(4)}]\n`;
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
      <td><code style="font-size:0.8rem">${escapeHtml(r.name)}</code></td>
      <td>${escapeHtml(r.type)}</td>
      <td>${escapeHtml(JSON.stringify(r.current))}</td>
      <td>${escapeHtml(JSON.stringify(r.default))}</td>
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
const iisStatus = document.getElementById("iis-status");

function renderIisEmpty() {
  if (!iisVisualTags) return;
  iisVisualTags.innerHTML = `
    <div class="iis-empty-state">
      <div class="iis-preview-lines" aria-hidden="true"><span></span><span></span><span></span></div>
      <div><strong>No conflict analysis yet</strong><p>Run <code>getIis()</code> to compute one irreducible conflict among the model's rows and bounds.</p></div>
    </div>`;
}

function getConstraintLines(lp) {
  const lines = lp.split("\n");
  const start = lines.findIndex((line) => /^\s*(Subject To|Such That)\s*$/i.test(line));
  if (start < 0) return [];
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\s*(Bounds|Generals?|Binar(?:y|ies)|Integers|End)\s*$/i.test(line)) break;
    if (line.trim()) rows.push(line.trim());
  }
  return rows;
}

async function solveIisModel() {
  setOutput(iisOutput, "Computing IIS…", "");
  setStatus(iisStatus, "analyzing");
  const data = await send("doIis", { problem: iisLP?.value || "" });
  if (data.error) {
    setOutput(iisOutput, data.error, "error");
    setStatus(iisStatus, "error");
  } else if (data.iis) {
    setTiming(iisTiming, data.elapsed);
    setStatus(iisStatus, data.modelStatus);
    const constraints = getConstraintLines(iisLP?.value || "");
    const cols = data.iis.colIndices.map((index) => `  x${index}`);
    const rows = data.iis.rowIndices.map((index) => `  ${constraints[index] || `r${index}`}`);
    const colBounds = data.iis.colBounds.map((value, i) => `  x${data.iis.colIndices[i]}: ${value}`);
    const rowBounds = data.iis.rowBounds.map((value, i) => `  ${constraints[data.iis.rowIndices[i]] || `r${data.iis.rowIndices[i]}`}: ${value}`);

    if (iisVisualTags) {
      const rowNodes = data.iis.rowIndices.map((index) => ({
        label: `r${index}`,
        expression: constraints[index] || `r${index}`,
        kind: "constraint",
      }));
      const colNodes = data.iis.colIndices.map((index) => ({
        label: `x${index}`,
        expression: `Variable bound on x${index}`,
        kind: "bound",
      }));
      const nodes = [...rowNodes, ...colNodes];
      iisVisualTags.innerHTML = `
        <div class="conflict-summary"><span>One irreducible conflict returned by HiGHS</span><strong>${nodes.length} member${nodes.length === 1 ? "" : "s"}</strong></div>
        <div class="conflict-list">
          ${nodes.map((node) => `<div class="conflict-node"><span>${escapeHtml(node.label)}</span><code>${escapeHtml(node.expression)}</code><small>${node.kind}</small></div>`).join("")}
        </div>
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
    setStatus(iisStatus, data.modelStatus);
    if (iisVisualTags) iisVisualTags.innerHTML = '<div class="iis-clear">The model is feasible, so there is no irreducible infeasible subsystem to show.</div>';
    setOutput(iisOutput,
      `Model status: ${data.modelStatus}\nObjective: ${data.objective}\n\n` +
      `Primal: ${JSON.stringify(data.primal)}\n\n${data.note || ""}`
    );
  }
}

document.getElementById("iis-solve")?.addEventListener("click", solveIisModel);
iisLP?.addEventListener("input", () => {
  setStatus(iisStatus, "ready");
  setOutput(iisOutput, "Click Find IIS to analyze infeasibility.", "placeholder");
  renderIisEmpty();
});

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
  const loaded = await send("ioLoad", { problem: ioInput?.value || "" });
  if (loaded.error) {
    setOutput(ioOutput, loaded.error, "error");
    if (ioStatusVal) ioStatusVal.textContent = "ERROR";
    return;
  }
  const data = await send("ioSolve");
  if (data.error) {
    setOutput(ioOutput, data.error, "error");
    if (ioStatusVal) ioStatusVal.textContent = "ERROR";
  } else {
    setTiming(ioTiming, data.elapsed);
    if (ioStatusVal) ioStatusVal.textContent = (data.modelStatus || "OPTIMAL").toUpperCase();
    setOutput(ioOutput,
      `Status: ${data.modelStatus}\nObjective: ${data.objective}\n\n` +
      `Primal:\n${data.primal.map((v, i) => `  x${i} = ${v.toFixed(6)}`).join("\n")}`
    );
  }
});

/* ── Initial Kickoff ── */

enhanceSyntaxEditors();
buildMatrixExplorer = createSparseExplorer(
  document.getElementById("build-matrix-explorer"),
  constraintExplorerConfig("production", examples.production),
);
qpMatrixExplorer = createSparseExplorer(
  document.getElementById("qp-matrix-explorer"),
  hessianExplorerConfig(),
);
selectBuildExample();
selectMipExample();
initCodeBoxSizing();

(async function warmup() {
  if (!defaultLP) return;
  solveLPFormat();
})();
