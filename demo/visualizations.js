import { element, focusableMark, fragment, svgElement, svgText, visualization } from "./ui.js";
import { buildExplanations, displayNumber, vizColors } from "./model-data.js";

export function renderBoundLanes(container, columns) {
  if (!container) return;
  const entries = Object.entries(columns);
  const rows = entries.map(([name, column], index) => {
    const lower = Number.isFinite(column.Lower) ? column.Lower : Math.min(0, column.Primal - 10);
    const upper = Number.isFinite(column.Upper) ? column.Upper : Math.max(column.Primal * 1.25, lower + 10);
    const span = Math.max(upper - lower, 1e-9);
    const x = 175 + ((column.Primal - lower) / span) * 560;
    const y = 54 + index * 62;
    return focusableMark("g", {}, `${name}: ${displayNumber(column.Primal)}`,
      svgText(name, { class: "viz-title", x: 20, y: y + 4 }),
      svgText(column.Status || column.Type || "", { class: "viz-label", x: 78, y: y + 4 }),
      svgElement("line", { x1: 175, y1: y, x2: 735, y2: y, stroke: "#c9dcda", "stroke-width": 8, "stroke-linecap": "round" }),
      svgElement("circle", { cx: x, cy: y, r: 9, fill: vizColors[index % vizColors.length] }),
      svgText(displayNumber(column.Primal), { class: "viz-value", x: Math.min(x + 14, 710), y: y - 13 }),
      svgText(displayNumber(column.Lower), { class: "viz-label", x: 165, y: y + 24, "text-anchor": "end" }),
      svgText(displayNumber(column.Upper), { class: "viz-label", x: 745, y: y + 24 }),
    );
  });
  const svg = visualization(`0 0 780 ${Math.max(120, entries.length * 62 + 30)}`,
    "Variable values positioned within their lower and upper bounds",
    svgText("Primal values within variable bounds", { class: "viz-title", x: 20, y: 24 }), rows);
  svg.classList.add("modern-viz-svg");
  container.replaceChildren(svg);
}

export function renderProductionViz(container, example, primal, objective) {
  if (!container) return;
  const rowNames = ["Labor used", "Wood used", "Revenue earned"];
  const series = [...example.A.map((row) => row.map((coefficient, i) => coefficient * primal[i])), example.costs.map((cost, i) => cost * primal[i])];
  const max = Math.max(...series.flat().map(Math.abs), 1);
  const groups = series.map((values, rowIndex) => {
    const y = 60 + rowIndex * 78;
    let cursor = 390;
    const bars = values.map((value, index) => {
      const width = Math.abs(value) / max * 280;
      const x = value < 0 ? cursor - width : cursor;
      if (value < 0) cursor -= width;
      return focusableMark("rect", { x, y: y - 15, width: Math.max(width, 1), height: 30, rx: 4, fill: vizColors[index], opacity: 0.86 }, `${example.names[index]}: ${displayNumber(value)}`);
    });
    const total = values.reduce((sum, value) => sum + value, 0);
    return svgElement("g", {},
      svgText(rowNames[rowIndex], { class: "viz-title", x: 18, y: y - 4 }),
      svgText(`total ${displayNumber(rowIndex === 3 ? objective : total)}`, { class: "viz-label", x: 18, y: y + 15 }),
      svgElement("line", { x1: 390, x2: 390, y1: y - 24, y2: y + 24, stroke: "#222629", opacity: 0.35 }), bars);
  });
  const legend = svgElement("g", { transform: "translate(20 340)" }, primal.map((_, index) => fragment(
    svgElement("rect", { x: index * 180, width: 12, height: 12, rx: 3, fill: vizColors[index] }),
     svgText(`${example.names[index]} · ${index === 0 ? "chairs" : "tables"}`, { class: "viz-label", x: index * 180 + 18, y: 10 }),
  )));
  container.replaceChildren(visualization("0 0 780 370", "Signed resource and revenue contributions by production variable", groups, legend));
}

export function renderDietViz(container, example, primal, objective) {
  if (!container) return;
  const nutrients = ["Calories", "Protein", "Minimum mix"];
  const intake = example.A.map((row) => row.reduce((sum, value, index) => sum + value * primal[index], 0));
  const bullets = intake.map((value, index) => {
    const required = example.rowLowers[index];
    const ratio = Math.min(value / required, 1.45);
    const width = ratio / 1.45 * 560;
    const targetX = 175 + 560 / 1.45;
    const y = 62 + index * 72;
    return focusableMark("g", {}, `${nutrients[index]}: ${displayNumber(value)} of ${displayNumber(required)}`,
      svgText(nutrients[index], { class: "viz-title", x: 20, y }),
      svgElement("rect", { x: 175, y: y - 17, width: 560, height: 26, rx: 13, fill: "#e5efee" }),
      svgElement("rect", { x: 175, y: y - 17, width, height: 26, rx: 13, fill: index === 2 && value > required * 1.15 ? "#e27680" : "#76aaa7" }),
      svgElement("line", { x1: targetX, x2: targetX, y1: y - 25, y2: y + 17, stroke: "#222629", "stroke-width": 2 }),
      svgText(`${displayNumber(value)} / ${displayNumber(required)}`, { class: "viz-value", x: 175, y: y + 27 }));
  });
  container.replaceChildren(visualization("0 0 780 310", "Nutrient intake compared with minimum requirements",
    svgText(`Nutrient adequacy at minimum cost ${displayNumber(objective)}`, { class: "viz-title", x: 20, y: 25 }), bullets,
    svgText(`Portions: ${primal.map((value, i) => `${example.names[i]}=${displayNumber(value)}`).join(" · ")}`, { class: "viz-label", x: 175, y: 286 })));
}

export function renderTransportViz(container, example, primal, objective) {
  if (!container) return;
  const left = [{ name: "Plant A", y: 105 }, { name: "Plant B", y: 275 }];
  const right = [65, 145, 235, 315].map((y, i) => ({ name: `Demand ${i + 1}`, y }));
  const maxFlow = Math.max(...primal, 1);
  const paths = primal.map((flow, index) => {
    const plant = Math.floor(index / 4);
    const destination = index % 4;
    const y1 = left[plant].y;
    const y2 = right[destination].y;
    const width = flow ? 2 + flow / maxFlow * 16 : 1;
    const opacity = flow ? 0.82 : 0.12;
    const title = `${left[plant].name} → ${right[destination].name}: ${displayNumber(flow)} units at cost ${example.costs[index]}`;
    return focusableMark("path", { d: `M150 ${y1} C330 ${y1},450 ${y2},630 ${y2}`, fill: "none", stroke: vizColors[Math.min(example.costs[index] - 6, 7)] || "#789", "stroke-width": width, opacity }, title);
  });
  const nodes = [
    ...left.map((node) => svgElement("g", {},
      svgElement("rect", { x: 35, y: node.y - 28, width: 115, height: 56, rx: 12, fill: "#dbeae9" }),
      svgText(node.name, { class: "viz-title", x: 92, y: node.y - 4, "text-anchor": "middle" }),
      svgText("supply", { class: "viz-label", x: 92, y: node.y + 14, "text-anchor": "middle" }))),
    ...right.map((node) => svgElement("g", {},
      svgElement("rect", { x: 630, y: node.y - 24, width: 120, height: 48, rx: 12, fill: "#f4e1e4" }),
      svgText(node.name, { class: "viz-title", x: 690, y: node.y + 4, "text-anchor": "middle" }))),
  ];
  container.replaceChildren(visualization("0 0 780 380", "Transportation flow network",
    svgText(`Optimal route flow · total cost ${displayNumber(objective)}`, { class: "viz-title", x: 20, y: 25 }), paths, nodes));
}

export function renderKnapsackViz(container, values, weights, primal, capacity) {
  if (!container) return;
  const selected = primal.map((value, index) => value > 0.5 ? index : -1).filter((index) => index >= 0);
  let cursor = 50;
  const blocks = selected.map((index) => {
    const width = weights[index] / capacity * 680;
    const density = values[index] / weights[index];
    const height = 34 + Math.min(density * 9, 70);
    const x = cursor;
    cursor += width;
    return focusableMark("g", {}, `Item ${index + 1}: value ${values[index]}, weight ${weights[index]}, density ${displayNumber(density)}`,
      svgElement("rect", { x, y: 150 - height, width: Math.max(width - 3, 4), height, rx: 6, fill: vizColors[index] }),
      svgText(`#${index + 1}`, { x: x + width / 2, y: 142 - height / 2, "text-anchor": "middle", fill: "white", "font-size": 11 }));
  });
  const candidates = values.map((value, index) => focusableMark("g", { transform: `translate(${55 + index * 135} 205)` },
    `Item ${index + 1}: ${primal[index] > 0.5 ? "selected" : "not selected"}`,
    svgElement("circle", { r: 21, fill: primal[index] > 0.5 ? vizColors[index] : "#fff", stroke: vizColors[index], "stroke-width": 2 }),
    svgText(`${value}/${weights[index]}`, { y: 4, "text-anchor": "middle", fill: primal[index] > 0.5 ? "white" : "#222629", "font-size": 11 }),
    svgText(`item ${index + 1}`, { class: "viz-label", y: 38, "text-anchor": "middle" })));
  container.replaceChildren(visualization("0 0 780 280", "Selected knapsack items sized by weight and value density",
    svgText("Selected weight inside capacity", { class: "viz-title", x: 20, y: 25 }),
    svgElement("rect", { x: 50, y: 45, width: 680, height: 110, rx: 10, fill: "#edf4f3", stroke: "#9ececc" }), blocks,
    svgElement("line", { x1: 730, x2: 730, y1: 38, y2: 162, stroke: "#d90000", "stroke-dasharray": "4 4" }),
    svgText(`capacity ${capacity}`, { class: "viz-label", x: 730, y: 178, "text-anchor": "end" }), candidates));
}

export function renderFacilityViz(container, definition, primal, objective) {
  if (!container) return;
  const open = primal.slice(0, 2);
  const shipments = [primal.slice(2, 5), primal.slice(5, 8)];
  const costs = definition.shippingCosts;
  const rows = shipments.map((row, facility) => {
    const y = 100 + facility * 115;
    const total = row.reduce((sum, value) => sum + value, 0);
    const shipmentsForFacility = row.map((value, customer) => {
      const x = 210 + customer * 180;
      const size = 24 + value / 80 * 34;
      return focusableMark("g", {}, `Customer ${customer + 1}: ${value} units, shipping cost ${value * costs[facility][customer]}`,
        svgElement("rect", { x, y: y - size / 2, width: 140, height: size, rx: 9, fill: vizColors[customer + 1], opacity: value ? 0.85 : 0.12 }),
        svgText(`${displayNumber(value)} @ $${costs[facility][customer]}`, { x: x + 70, y: y + 4, "text-anchor": "middle", fill: value ? "white" : "#667174", "font-size": 12 }));
    });
    return svgElement("g", { opacity: open[facility] > 0.5 ? 1 : 0.35 },
      svgElement("rect", { x: 18, y: y - 34, width: 150, height: 72, rx: 12, fill: open[facility] > 0.5 ? "#d9ebe9" : "#eee" }),
      svgText(`Facility ${facility + 1} · ${open[facility] > 0.5 ? "OPEN" : "CLOSED"}`, { class: "viz-title", x: 32, y: y - 10 }),
      svgText(`${displayNumber(total)} / ${definition.capacity[facility]} capacity`, { class: "viz-label", x: 32, y: y + 10 }),
      shipmentsForFacility);
  });
  const headings = ["Customer A", "Customer B", "Customer C"].map((name, index) =>
    svgText(name, { class: "viz-label", x: 280 + index * 180, y: 58, "text-anchor": "middle" }));
  container.replaceChildren(visualization("0 0 780 310", "Facility opening and customer shipment matrix",
    svgText(`Opening and assignment matrix · total cost ${displayNumber(objective)}`, { class: "viz-title", x: 20, y: 26 }), headings, rows));
}

export function renderPortfolioViz(container, weights, variance, target) {
  if (!container) return;
  const [a, b, c] = weights;
  const p1 = [390, 45], p2 = [90, 305], p3 = [690, 305];
  const x = a * p1[0] + b * p2[0] + c * p3[0];
  const y = a * p1[1] + b * p2[1] + c * p3[1];
  const gradient = svgElement("linearGradient", { id: "portfolio-gradient", x1: 0, y1: 0, x2: 1, y2: 1 },
    svgElement("stop", { "stop-color": "#e27680" }),
    svgElement("stop", { offset: 0.5, "stop-color": "#9ececc" }),
    svgElement("stop", { offset: 1, "stop-color": "#7896bf" }));
  const allocation = weights.map((value) => `${(value * 100).toFixed(1)}%`).join(" / ");
  container.replaceChildren(visualization("0 0 780 350", "Portfolio allocation in a ternary asset triangle",
    svgElement("defs", {}, gradient),
    svgText(`Allocation geometry · target ${displayNumber(target * 100)}% · σ ${displayNumber(Math.sqrt(variance))}`, { class: "viz-title", x: 20, y: 25 }),
    svgElement("path", { d: "M390 45 90 305 690 305Z", fill: "url(#portfolio-gradient)", opacity: 0.18, stroke: "#6f9997", "stroke-width": 2 }),
    svgElement("path", { d: "M390 45 390 305M90 305 540 175M690 305 240 175", stroke: "#9ab9b7", "stroke-dasharray": "4 5", opacity: 0.6 }),
    svgText("Tech 12%", { class: "viz-title", x: 390, y: 34, "text-anchor": "middle" }),
    svgText("Energy 8%", { class: "viz-title", x: 72, y: 326 }),
    svgText("Bonds 4%", { class: "viz-title", x: 650, y: 326 }),
    focusableMark("circle", { cx: x, cy: y, r: 13, fill: "#222629", stroke: "white", "stroke-width": 4 }, `Portfolio allocation: ${allocation}`),
    svgText(allocation, { class: "viz-value", x: x + 18, y: y - 10 })));
}

function clipPolygon(polygon, a, b, rhs) {
  const inside = ([x, y]) => a * x + b * y <= rhs + 1e-9;
  const result = [];
  for (let index = 0; index < polygon.length; index++) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const startInside = inside(start);
    const endInside = inside(end);
    if (startInside) result.push(start);
    if (startInside === endInside) continue;
    const denominator = a * (end[0] - start[0]) + b * (end[1] - start[1]);
    if (Math.abs(denominator) < 1e-12) continue;
    const ratio = (rhs - a * start[0] - b * start[1]) / denominator;
    result.push([start[0] + ratio * (end[0] - start[0]), start[1] + ratio * (end[1] - start[1])]);
  }
  return result;
}

function feasiblePolygon(parsed) {
  const [xName, yName] = parsed.variables;
  const bounds = [parsed.bounds[xName], parsed.bounds[yName]];
  const scaleCandidates = parsed.constraintData.flatMap((row) => {
    const values = [row.coefficients[xName], row.coefficients[yName]].filter((value) => value > 0).map((value) => row.rhs / value);
    return values.filter((value) => Number.isFinite(value) && value > 0);
  });
  const max = Math.max(1, ...scaleCandidates, ...bounds.map((bound) => Number.isFinite(bound?.upper) ? bound.upper : 0)) * 1.15;
  const minX = Number.isFinite(bounds[0]?.lower) ? bounds[0].lower : 0;
  const minY = Number.isFinite(bounds[1]?.lower) ? bounds[1].lower : 0;
  let polygon = [[minX, minY], [max, minY], [max, max], [minX, max]];
  for (const row of parsed.constraintData) {
    let a = row.coefficients[xName] || 0;
    let b = row.coefficients[yName] || 0;
    let rhs = row.rhs;
    if (row.operator === ">=") [a, b, rhs] = [-a, -b, -rhs];
    polygon = clipPolygon(polygon, a, b, rhs);
    if (row.operator === "=") polygon = clipPolygon(polygon, -a, -b, -rhs);
  }
  return { polygon, minX, minY, max };
}

export function renderRangingViz(container, data, parsed) {
  if (!container) return;
  const names = parsed.variables.length === data.primal.length ? parsed.variables : data.primal.map((_, index) => `x${index}`);
  const intervals = data.colCostDown.map((down, index) => ({ label: `${names[index]} objective cost`, down, up: data.colCostUp[index], current: parsed.objective[names[index]] || 0 }));
  const finite = intervals.flatMap((item) => [item.down, item.up, item.current]).filter(Number.isFinite);
  const min = Math.min(...finite, 0);
  const max = Math.max(...finite, 1);
  const scale = (value) => 475 + ((Math.max(min, Math.min(max, value)) - min) / Math.max(max - min, 1e-9)) * 255;
  const rows = intervals.map((item, index) => {
    const y = 105 + index * 105;
    const end = Number.isFinite(item.up) ? scale(item.up) : 730;
    return focusableMark("g", {}, `${item.label}: ${displayNumber(item.down)} to ${displayNumber(item.up)}`,
      svgText(item.label, { class: "viz-title", x: 455, y: y - 22 }),
      svgElement("line", { x1: 475, x2: 730, y1: y, y2: y, stroke: "#dbe9e8", "stroke-width": 8, "stroke-linecap": "round" }),
      svgElement("line", { x1: scale(item.down), x2: end, y1: y, y2: y, stroke: "#5c9895", "stroke-width": 9, "stroke-linecap": "round" }),
      svgElement("path", { d: `M${scale(item.current)} ${y - 11}l9 11-9 11-9-11Z`, fill: "#d45e6a" }),
      svgText(displayNumber(item.down), { class: "viz-label", x: scale(item.down), y: y + 28, "text-anchor": "middle" }),
      svgText(displayNumber(item.up), { class: "viz-label", x: end, y: y + 28, "text-anchor": "middle" }));
  });
  const domain = feasiblePolygon(parsed);
  const sx = (value) => 65 + (value - domain.minX) / Math.max(domain.max - domain.minX, 1e-9) * 325;
  const sy = (value) => 300 - (value - domain.minY) / Math.max(domain.max - domain.minY, 1e-9) * 250;
  const objectiveText = names.map((name) => `${displayNumber(parsed.objective[name] || 0)}${name}`).join(" + ");
  container.replaceChildren(visualization("0 0 780 350", "Two-variable feasible domain, objective gradient, optimum, and sensitivity intervals",
    svgText("Feasible domain and objective", { class: "viz-title", x: 20, y: 28 }),
    svgText("Basis stability intervals", { class: "viz-title", x: 455, y: 28 }),
    svgElement("line", { x1: sx(domain.minX), x2: sx(domain.max), y1: sy(domain.minY), y2: sy(domain.minY), stroke: "#8aa7a5" }),
    svgElement("line", { x1: sx(domain.minX), x2: sx(domain.minX), y1: sy(domain.minY), y2: sy(domain.max), stroke: "#8aa7a5" }),
    svgElement("polygon", {
      points: domain.polygon.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" "),
      fill: "#9ececc", opacity: 0.34, stroke: "#2f7774", "stroke-width": 2,
    }),
    svgText(`objective ${objectiveText}`, { class: "viz-label", x: 75, y: 325 }),
    focusableMark("circle", { cx: sx(data.primal[0]), cy: sy(data.primal[1]), r: 9, fill: "#222629", stroke: "white", "stroke-width": 3 }, `Optimal point ${names[0]} ${data.primal[0]}, ${names[1]} ${data.primal[1]}`),
    svgText(`optimum (${displayNumber(data.primal[0])}, ${displayNumber(data.primal[1])})`, { class: "viz-value", x: sx(data.primal[0]) + 12, y: sy(data.primal[1]) - 10 }),
    svgText(names[0], { class: "viz-label", x: sx(domain.max), y: sy(domain.minY) + 22 }),
    svgText(names[1], { class: "viz-label", x: sx(domain.minX) - 20, y: sy(domain.max) }),
    rows));
}

function formatLinearConstraint(constraint, names) {
  const terms = names.map((name) => {
    const coefficient = constraint.coefficients[name] || 0;
    if (!coefficient) return "";
    const magnitude = Math.abs(coefficient);
    const term = `${magnitude === 1 ? "" : displayNumber(magnitude)}${name}`;
    return coefficient < 0 ? `− ${term}` : `+ ${term}`;
  }).filter(Boolean).join(" ").replace(/^\+ /, "");
  return `${terms} ${constraint.operator.replace("<=", "≤").replace(">=", "≥")} ${displayNumber(constraint.rhs)}`;
}

export function renderIisPlot(container, parsed, iis) {
  if (!container || parsed.variables.length !== 2 || !iis.rowIndices.length) return false;
  const names = parsed.variables;
  const constraint = parsed.constraintData[iis.rowIndices[0]];
  if (!constraint) return false;
  const [xName, yName] = names;
  const xBound = parsed.bounds[xName] || { lower: 0, upper: Infinity };
  const yBound = parsed.bounds[yName] || { lower: 0, upper: Infinity };
  const a = constraint.coefficients[xName] || 0;
  const b = constraint.coefficients[yName] || 0;
  if (!a || !b) return false;
  const candidates = [0, xBound.lower, yBound.lower, constraint.rhs / a, constraint.rhs / b].filter(Number.isFinite);
  const domainMin = Math.min(0, ...candidates);
  const domainMax = Math.max(1, ...candidates) * 1.25;
  const sx = (value) => 70 + (value - domainMin) / Math.max(domainMax - domainMin, 1) * 510;
  const sy = (value) => 335 - (value - domainMin) / Math.max(domainMax - domainMin, 1) * 285;
  const yAtMin = (constraint.rhs - a * domainMin) / b;
  const yAtMax = (constraint.rhs - a * domainMax) / b;
  const implied = a * xBound.lower + b * yBound.lower;
  const relationFails = constraint.operator === "<=" ? implied > constraint.rhs : constraint.operator === ">=" ? implied < constraint.rhs : implied !== constraint.rhs;
  const equation = formatLinearConstraint(constraint, names);
  const grid = svgElement("pattern", { id: "iis-grid", width: 25, height: 25, patternUnits: "userSpaceOnUse" },
    svgElement("path", { d: "M25 0H0V25", fill: "none", stroke: "#dce8e7", "stroke-width": 1 }));
  container.replaceChildren(visualization("0 0 640 390", `Conflict between ${equation} and the variable bounds`,
    svgElement("defs", {}, grid),
    svgElement("rect", { x: 70, y: 50, width: 510, height: 285, fill: "url(#iis-grid)" }),
    svgElement("rect", { x: sx(xBound.lower), y: 50, width: Math.max(0, 580 - sx(xBound.lower)), height: 285, fill: "#e27680", opacity: 0.13 }),
    svgElement("rect", { x: 70, y: 50, width: 510, height: Math.max(0, sy(yBound.lower) - 50), fill: "#7896bf", opacity: 0.13 }),
    svgElement("line", { x1: sx(domainMin), y1: sy(yAtMin), x2: sx(domainMax), y2: sy(yAtMax), stroke: "#2f7774", "stroke-width": 3 }),
    svgElement("line", { x1: sx(xBound.lower), x2: sx(xBound.lower), y1: 50, y2: 335, stroke: "#c65360", "stroke-width": 2 }),
    svgElement("line", { x1: 70, x2: 580, y1: sy(yBound.lower), y2: sy(yBound.lower), stroke: "#5479a8", "stroke-width": 2 }),
    svgText(xName, { class: "viz-title", x: 325, y: 370, "text-anchor": "middle" }),
    svgText(yName, { class: "viz-title", x: 22, y: 190, transform: "rotate(-90 22 190)", "text-anchor": "middle" }),
    svgText(equation, { class: "viz-label", x: 82, y: 70 }),
    svgText(`${xName} ≥ ${displayNumber(xBound.lower)}`, { class: "viz-label", x: Math.min(sx(xBound.lower) + 7, 505), y: 92 }),
    svgText(`${yName} ≥ ${displayNumber(yBound.lower)}`, { class: "viz-label", x: 430, y: Math.max(sy(yBound.lower) - 8, 112) }),
    svgElement("g", { transform: "translate(325 205)" },
      svgElement("rect", { width: 235, height: 72, rx: 12, fill: "#222629" }),
      svgText(`At the bounds, left side = ${displayNumber(implied)}`, { x: 117, y: 27, "text-anchor": "middle", fill: "white", "font-size": 12 }),
      svgText(relationFails ? `That cannot satisfy ${constraint.operator} ${displayNumber(constraint.rhs)}` : "These members do not conflict alone", { x: 117, y: 49, "text-anchor": "middle", fill: relationFails ? "#f2a4ac" : "#9ececc", "font-size": 12 }))));
  return true;
}

function parseLinearExpression(text) {
  const coefficients = {};
  const pattern = /([+-]?\s*(?:(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?\s*)?)([A-Za-z_]\w*)/gi;
  for (const match of text.matchAll(pattern)) {
    const token = match[1].replaceAll(" ", "");
    const coefficient = token === "" || token === "+" ? 1 : token === "-" ? -1 : Number(token);
    if (Number.isFinite(coefficient)) coefficients[match[2]] = (coefficients[match[2]] || 0) + coefficient;
  }
  return coefficients;
}

export function parseLpModel(text) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => /^\s*(Subject To|Such That)\s*$/i.test(line));
  const constraints = [];
  const constraintData = [];
  if (start >= 0) {
    for (const line of lines.slice(start + 1)) {
      if (/^\s*(Bounds|Generals?|Binar(?:y|ies)|Integers|End)\s*$/i.test(line)) break;
      if (!line.trim()) continue;
      const source = line.trim();
      const body = source.includes(":") ? source.slice(source.indexOf(":") + 1) : source;
      const relation = body.match(/^(.*?)(<=|>=|=)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*$/i);
      constraints.push(source);
      constraintData.push(relation ? {
        coefficients: parseLinearExpression(relation[1]),
        operator: relation[2],
        rhs: Number(relation[3]),
      } : { coefficients: {}, operator: "=", rhs: 0 });
    }
  }
  const objectiveEnd = start >= 0 ? start : lines.length;
  const objectiveText = lines.slice(1, objectiveEnd).join(" ").replace(/^.*?:/, "");
  const objective = parseLinearExpression(objectiveText);
  const variables = [...new Set([...Object.keys(objective), ...constraintData.flatMap((row) => Object.keys(row.coefficients))])];
  const bounds = Object.fromEntries(variables.map((name) => [name, { lower: 0, upper: Infinity }]));
  const boundsStart = lines.findIndex((line) => /^\s*Bounds\s*$/i.test(line));
  if (boundsStart >= 0) {
    for (const raw of lines.slice(boundsStart + 1)) {
      const line = raw.trim();
      if (/^(Generals?|Binar(?:y|ies)|Integers|End)$/i.test(line)) break;
      let match = line.match(/^([+-]?\d+(?:\.\d+)?)\s*<=\s*([A-Za-z_]\w*)\s*<=\s*([+-]?\d+(?:\.\d+)?)$/);
      if (match) {
        bounds[match[2]] = { lower: Number(match[1]), upper: Number(match[3]) };
        if (!variables.includes(match[2])) variables.push(match[2]);
        continue;
      }
      match = line.match(/^([+-]?\d+(?:\.\d+)?)\s*<=\s*([A-Za-z_]\w*)$/);
      if (match) {
        bounds[match[2]] = { ...(bounds[match[2]] || { upper: Infinity }), lower: Number(match[1]) };
        if (!variables.includes(match[2])) variables.push(match[2]);
        continue;
      }
      match = line.match(/^([A-Za-z_]\w*)\s*(<=|>=)\s*([+-]?\d+(?:\.\d+)?)$/);
      if (match) {
        const current = bounds[match[1]] || { lower: 0, upper: Infinity };
        bounds[match[1]] = match[2] === ">=" ? { ...current, lower: Number(match[3]) } : { ...current, upper: Number(match[3]) };
        if (!variables.includes(match[1])) variables.push(match[1]);
      }
    }
  }
  const matrix = constraintData.map((row) => variables.map((variable) => row.coefficients[variable] || 0));
  return { variables, constraints, constraintData, bounds, objective, matrix };
}

function parseLpStructure(text) {
  return parseLpModel(text);
}

export function renderIoViz(container, source) {
  if (!container) return;
  const structure = parseLpStructure(source);
  const cellSize = 62;
  const matrixWidth = Math.max(1, structure.variables.length) * cellSize;
  const matrixHeight = Math.max(1, structure.constraints.length) * cellSize;
  const cells = structure.matrix.flatMap((row, rowIndex) => row.map((value, columnIndex) => {
    const magnitude = Math.min(Math.abs(value) / 3, 1);
    return focusableMark("g", {}, `${structure.constraints[rowIndex] || `row ${rowIndex}`}, ${structure.variables[columnIndex]}: ${value}`,
      svgElement("rect", {
        x: 190 + columnIndex * cellSize, y: 70 + rowIndex * cellSize,
        width: cellSize - 6, height: cellSize - 6, rx: 8,
        fill: value === 0 ? "#edf3f2" : value > 0 ? "#6ca29f" : "#d66b76",
        opacity: value === 0 ? 0.55 : 0.35 + magnitude * 0.65,
      }),
      svgText(displayNumber(value), {
        class: "viz-value",
        x: 190 + columnIndex * cellSize + (cellSize - 6) / 2,
        y: 70 + rowIndex * cellSize + 32,
        "text-anchor": "middle",
      }),
    );
  }));
  container.replaceChildren(visualization(`0 0 ${Math.max(620, matrixWidth + 260)} ${Math.max(260, matrixHeight + 140)}`, "Constraint matrix fingerprint parsed from the LP text",
    svgText("Structural fingerprint", { class: "viz-title", x: 20, y: 25 }),
    structure.variables.map((name, index) => svgText(name, { class: "viz-label", x: 190 + index * cellSize + 28, y: 58, "text-anchor": "middle" })),
    structure.constraints.map((line, index) => svgText(line.split(":")[0] || `r${index}`, { class: "viz-label", x: 170, y: 70 + index * cellSize + 32, "text-anchor": "end" })),
    cells,
    svgText(`${structure.variables.length} columns · ${structure.constraints.length} rows`, { class: "viz-value", x: 20, y: 58 })));
  const variableCount = document.getElementById("io-variable-count");
  const constraintCount = document.getElementById("io-constraint-count");
  if (variableCount) variableCount.textContent = String(structure.variables.length);
  if (constraintCount) constraintCount.textContent = String(structure.constraints.length);
}

export function constraintExplorerConfig(key, example) {
  const columnNames = example.names || example.costs.map((_, index) => `x${index}`);
  const rowNames = example.rowNames || example.A.map((_, index) => `r${index}`);
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

export function hessianExplorerConfig(targetReturn = 0.08, returns = [0.12, 0.08, 0.04]) {
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
      { label: "", text: `${displayNumber(returns[0])}x0 + ${displayNumber(returns[1])}x1 + ${displayNumber(returns[2])}x2 ≥ ${displayNumber(targetReturn)}` },
      { label: "bounds", text: "0 ≤ x0, x1, x2 ≤ 1" },
    ],
    triangular: true,
  };
}

export function createSparseExplorer(container, initialConfig) {
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

  function formulaContent(rowIndex) {
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
      if (terms.length) terms.push(" ");
      terms.push(element("span", { class: "formula-term", dataset: { entryIndex: String(entryIndex) }, text: signed }));
    });
    const expression = terms.length ? terms : ["0"];
    if (config.triangular) {
      return fragment(element("span", { class: "formula-prefix", text: `${config.symbol} row ${config.rowNames[rowIndex]}:` }), " ", expression);
    }
    const lower = config.rowLowers[rowIndex];
    const upper = config.rowUppers[rowIndex];
    if (lower === upper) return fragment(expression, ` = ${displayNumber(lower)}`);
    if (!Number.isFinite(lower)) return fragment(expression, ` ≤ ${displayNumber(upper)}`);
    if (!Number.isFinite(upper)) return fragment(expression, ` ≥ ${displayNumber(lower)}`);
    return fragment(`${displayNumber(lower)} ≤ `, expression, ` ≤ ${displayNumber(upper)}`);
  }

  function mathematicalRowContent(row, index) {
    if (!config.mathRows) return formulaContent(index);
    const label = element("span", { class: "math-role", text: row.label || "" });
    if (row.terms) {
      const terms = row.terms.map((term, termIndex) => {
        const entryIndex = entryIndexForCell(term.row, term.column);
        return fragment(termIndex ? " " : null,
          element("span", { class: "formula-term", dataset: { entryIndex: String(entryIndex) }, text: term.text }));
      });
      return fragment(label, element("span", { class: "math-expression" }, terms));
    }
    return fragment(label, element("span", { class: "math-expression", text: row.text }));
  }

  function cells(values, name) {
    return values.map((value, index) => {
      const dataset = { array: name, index: String(index) };
      if (name === "starts") dataset.columnIndex = String(Math.min(index, config.columnNames.length - 1));
      else dataset.entryIndex = String(index);
      return element("span", { class: "array-cell", dataset, text: displayNumber(value) });
    });
  }

  function controlIcon(name) {
    const path = name === "previous"
      ? { d: "M12.5 4.5 7 10l5.5 5.5", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" }
      : name === "next"
        ? { d: "m7.5 4.5 5.5 5.5-5.5 5.5", fill: "none", stroke: "currentColor", "stroke-width": 1.8, "stroke-linecap": "round", "stroke-linejoin": "round" }
        : playing
          ? { d: "M7 5v10M13 5v10", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round" }
          : { d: "m7 4.8 8 5.2-8 5.2Z", fill: "currentColor" };
    return svgElement("svg", { viewBox: "0 0 20 20", "aria-hidden": "true" }, svgElement("path", path));
  }

  function renderStructure() {
    const matrixRows = config.dense.map((row, rowIndex) => element("tr", {},
      element("th", {}, element("span", { class: "matrix-axis-name", text: config.rowNames[rowIndex] })),
      row.map((value, columnIndex) => {
        const entryIndex = value === 0 ? -1 : entryIndexForCell(rowIndex, columnIndex);
        const dataset = { matrixRow: String(rowIndex), matrixColumn: String(columnIndex) };
        if (entryIndex >= 0) dataset.entryIndex = String(entryIndex);
        else dataset.zero = "";
        return element("td", { class: value === 0 ? "" : "nonzero", dataset, text: displayNumber(value) });
      })));
    const matrixHead = config.columnNames.map((name) =>
      element("th", {}, element("span", { class: "matrix-axis-name", text: name })));
    const indices = entries.map((entry) => entry.row);
    const values = entries.map((entry) => entry.value);
    const control = (action, label) => element("button", { class: "sparse-control", dataset: { action }, "aria-label": label }, controlIcon(action));
    const formulaRows = (config.mathRows || config.dense).map((row, index) => element("div", {
      class: `formula-row${config.mathRows ? " math-model-row" : ""}`,
      dataset: { formulaRow: String(index) },
    }, mathematicalRowContent(row, index)));
    const arrayRow = (name, arrayValues) => element("div", { class: "array-row" },
      element("span", { class: "array-name", text: name }), element("div", { class: "array-cells" }, cells(arrayValues, name)));

    container.replaceChildren(
      element("div", { class: "sparse-explorer-header" },
        element("div", {}, element("strong", { text: config.title }), element("p", { text: config.description })),
        element("div", { class: "sparse-controls" },
          control("previous", "Previous stored coefficient"), control("play", `${playing ? "Pause" : "Play"} animation`), control("next", "Next stored coefficient"))),
      element("div", { class: "sparse-flow" },
        element("section", { class: "sparse-stage" },
          element("div", { class: "sparse-stage-label", text: `1 · ${config.mathRows ? "Optimization model" : "Linear constraints"}` }),
          element("div", { class: "formula-list" }, formulaRows)),
        element("section", { class: "sparse-stage" },
          element("div", { class: "sparse-stage-label", text: `2 · Dense ${config.symbol} matrix` }),
          element("div", { class: "matrix-wrap" }, element("table", { class: "matrix-table" },
            element("thead", {}, element("tr", {}, element("th"), matrixHead)), element("tbody", {}, matrixRows))),
          config.triangular ? element("div", { class: "sparse-legend", text: "Coral is stored; mint is the mirrored value implied by symmetry." }) : null),
        element("section", { class: "sparse-stage" },
          element("div", { class: "sparse-stage-label", text: `3 · ${config.triangular ? "Triangular CSC" : "CSC"} arrays` }),
          element("div", { class: "array-stack" }, arrayRow("starts", starts), arrayRow("indices", indices), arrayRow("values", values)))),
      element("div", { class: "sparse-narration", "aria-live": "polite" }));

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
    let emphasis;
    let explanation = "";
    if (config.mathRows) {
      const term = config.mathRows.flatMap((row) => row.terms || []).find((candidate) =>
        entryIndexForCell(candidate.row, candidate.column) === entryIndex
      );
      if (entry.row === entry.column) {
        emphasis = `${term?.text || "Quadratic term"} → ${config.symbol}[${config.rowNames[entry.row]}, ${config.columnNames[entry.column]}].`;
        explanation = ` HiGHS evaluates ½xᵀ${config.symbol}x, so the diagonal stores ${displayNumber(entry.value)}, twice the squared-term coefficient.`;
      } else {
        emphasis = `${term?.text || "Cross-term"} → ${config.symbol}[${config.rowNames[entry.row]}, ${config.columnNames[entry.column]}].`;
        explanation = ` The symmetric cross-term appears twice inside ½xᵀ${config.symbol}x. Triangular storage keeps this lower-triangle value once; ${config.symbol}[${config.columnNames[entry.column]}, ${config.rowNames[entry.row]}] is implied.`;
      }
    } else {
      const coefficient = displayNumber(entry.value);
      emphasis = `${coefficient}${config.columnNames[entry.column]} in ${config.rowNames[entry.row]} → ${config.symbol}[${config.rowNames[entry.row]}, ${config.columnNames[entry.column]}].`;
    }
    return fragment(element("strong", { text: emphasis }), explanation,
      ` CSC stores it at entry k=${entryIndex}: starts[${entry.column}]=${from} and starts[${entry.column + 1}]=${to} delimit the ${config.columnNames[entry.column]} column; `,
      `indices[${entryIndex}]=${entry.row} selects ${config.rowNames[entry.row]}, and values[${entryIndex}]=${displayNumber(entry.value)}.`);
  }

  function highlightEntries(entryIndexes, narration) {
    clearHighlights();
    entryIndexes.forEach(markEntry);
    const columns = [...new Set(entryIndexes.map((index) => entries[index].column))];
    columns.forEach((column) => {
      container.querySelector(`[data-array="starts"][data-index="${column}"]`)?.classList.add("boundary");
      container.querySelector(`[data-array="starts"][data-index="${column + 1}"]`)?.classList.add("boundary");
    });
    container.querySelector(".sparse-narration").replaceChildren(narration);
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
        fragment(element("strong", { text: `Variable ${config.columnNames[column]} uses CSC column ${column}.` }),
          ` starts[${column}]=${from} and starts[${column + 1}]=${to}; the ${to - from} stored coefficient${to - from === 1 ? "" : "s"} for this column occupy entries ${from} through ${to - 1}.`)
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
      container.querySelector(".sparse-narration").replaceChildren(
        element("strong", { text: `${config.symbol}[${row},${column}] is zero.` }),
        " CSC omits zero coefficients entirely, so this cell has no entry in indices or values.",
      );
    }
  }

  function restartTimer() {
    clearInterval(timer);
    if (playing && !hovered && entries.length > 1) timer = setInterval(() => move(1, false), 1500);
    const playButton = container.querySelector('[data-action="play"]');
    if (playButton) {
      playButton.setAttribute("aria-label", `${playing ? "Pause" : "Play"} animation`);
      playButton.replaceChildren(controlIcon("play"));
    }
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
