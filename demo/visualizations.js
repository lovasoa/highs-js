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

export function renderGridDispatch(container, data) {
  if (!container) return;
  const colors = ["#e8b85d", "#d45e6a", "#7896bf", "#222629"];
  const left = 52;
  const top = 38;
  const width = 690;
  const height = 250;
  const maxDemand = Math.max(...data.demand) * 1.08;
  const x = (hour) => left + hour / (data.demand.length - 1) * width;
  const y = (value) => top + height - value / maxDemand * height;
  const areas = [];
  let floor = new Array(data.demand.length).fill(0);
  for (let source = 0; source < data.dispatch.length; source++) {
    const ceiling = floor.map((value, hour) => value + data.dispatch[source][hour]);
    const path = [
      `M ${x(0)} ${y(floor[0])}`,
      ...floor.slice(1).map((value, hour) => `L ${x(hour + 1)} ${y(value)}`),
      ...ceiling.slice().reverse().map((value, reverseIndex) => `L ${x(ceiling.length - 1 - reverseIndex)} ${y(value)}`),
      "Z",
    ].join(" ");
    areas.push(focusableMark("path", { d: path, fill: colors[source], opacity: source === 3 ? 0.92 : 0.78 }, `${data.sourceNames[source]} generation: ${displayNumber(data.dispatch[source].reduce((sum, value) => sum + value, 0))} MWh`));
    floor = ceiling;
  }
  const demandPath = data.demand.map((value, hour) => `${hour ? "L" : "M"} ${x(hour)} ${y(value)}`).join(" ");
  const ticks = data.demand.map((_, hour) => hour % 2 === 0 ? svgText(`${hour * 2}:00`, { class: "viz-label", x: x(hour), y: top + height + 24, "text-anchor": "middle" }) : null);
  const legend = data.sourceNames.map((name, source) => svgElement("g", { transform: `translate(${left + source * 145} 328)` },
    svgElement("rect", { width: 12, height: 12, rx: 3, fill: colors[source] }),
    svgText(name, { class: "viz-label", x: 18, y: 10 })));
  container.replaceChildren(visualization("0 0 780 360", "Twelve-period electricity dispatch compared with demand",
    svgText("Dispatch stack · red/black area is unmet demand", { class: "viz-title", x: 20, y: 22 }),
    [0.25, 0.5, 0.75, 1].map((ratio) => svgElement("line", { x1: left, x2: left + width, y1: y(maxDemand * ratio), y2: y(maxDemand * ratio), stroke: "#dce9e8" })),
    areas,
    svgElement("path", { d: demandPath, fill: "none", stroke: "#222629", "stroke-width": 3 }),
    ticks, legend));
}

export function renderCallbackGraph(canvas, size, weights, selected = []) {
  if (!canvas) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(320, bounds.width || 760);
  const height = 360;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f7fbfa";
  context.fillRect(0, 0, width, height);
  const selectedSet = new Set(selected);
  const columns = Math.ceil(Math.sqrt(size * width / height));
  const rows = Math.ceil(size / columns);
  const gapX = width / (columns + 1);
  const gapY = height / (rows + 1);
  for (let index = 0; index < size; index++) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const jitterX = ((index * 47) % 11 - 5) * 0.35;
    const jitterY = ((index * 31) % 13 - 6) * 0.3;
    const x = gapX * (column + 1) + jitterX;
    const y = gapY * (row + 1) + jitterY;
    const chosen = selectedSet.has(index);
    const radius = chosen ? 3.5 + (weights?.[index] || 0) / 45 : 1.8;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = chosen ? "#d45e6a" : "#c6d9d7";
    context.fill();
    if (chosen) {
      context.strokeStyle = "#fff";
      context.lineWidth = 1.5;
      context.stroke();
    }
  }
}

export function renderCallbackProgress(container, history) {
  if (!container || !history.length) return;
  const width = 740;
  const height = 180;
  const values = history.flatMap((point) => [point.incumbent, point.bound]).filter(Number.isFinite);
  if (!values.length) return;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const x = (index) => 34 + index / Math.max(history.length - 1, 1) * (width - 54);
  const y = (value) => 18 + (max - value) / span * (height - 44);
  const pathFor = (key) => history.map((point, index) => Number.isFinite(point[key]) ? `${index ? "L" : "M"} ${x(index)} ${y(point[key])}` : "").join(" ");
  container.replaceChildren(visualization(`0 0 ${width} ${height}`, "Live MIP incumbent and dual bound convergence",
    [0, 0.5, 1].map((ratio) => svgElement("line", { x1: 34, x2: width - 20, y1: 18 + ratio * (height - 44), y2: 18 + ratio * (height - 44), stroke: "#dce9e8" })),
    svgElement("path", { d: pathFor("bound"), fill: "none", stroke: "#7896bf", "stroke-width": 2 }),
    svgElement("path", { d: pathFor("incumbent"), fill: "none", stroke: "#d45e6a", "stroke-width": 3 }),
    svgText("best bound", { class: "viz-label", x: 38, y: height - 8 }),
    svgText("incumbent", { class: "viz-label", x: 125, y: height - 8 })));
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

function plotDomain(parsed, point = [0, 0]) {
  const [xName, yName] = parsed.variables;
  const bounds = [parsed.bounds[xName], parsed.bounds[yName]];
  const scaleCandidates = parsed.constraintData.flatMap((row) => {
    const values = [row.coefficients[xName], row.coefficients[yName]].filter(Boolean).map((value) => row.rhs / value);
    return values.filter(Number.isFinite).map(Math.abs);
  });
  const extent = Math.max(1, ...scaleCandidates, ...point.map(Math.abs), ...bounds.flatMap((bound) => [bound?.lower, bound?.upper]).filter(Number.isFinite).map(Math.abs)) * 1.18;
  const minX = Math.min(0, Number.isFinite(bounds[0]?.lower) ? bounds[0].lower : 0, point[0] || 0);
  const minY = Math.min(0, Number.isFinite(bounds[1]?.lower) ? bounds[1].lower : 0, point[1] || 0);
  const maxX = Math.max(extent, Number.isFinite(bounds[0]?.upper) ? bounds[0].upper : 0, point[0] || 0);
  const maxY = Math.max(extent, Number.isFinite(bounds[1]?.upper) ? bounds[1].upper : 0, point[1] || 0);
  return { minX, minY, maxX, maxY };
}

function feasiblePolygon(parsed, domain = plotDomain(parsed)) {
  const [xName, yName] = parsed.variables;
  let polygon = [[domain.minX, domain.minY], [domain.maxX, domain.minY], [domain.maxX, domain.maxY], [domain.minX, domain.maxY]];
  const xBound = parsed.bounds[xName] || { lower: -Infinity, upper: Infinity };
  const yBound = parsed.bounds[yName] || { lower: -Infinity, upper: Infinity };
  if (Number.isFinite(xBound.lower)) polygon = clipPolygon(polygon, -1, 0, -xBound.lower);
  if (Number.isFinite(xBound.upper)) polygon = clipPolygon(polygon, 1, 0, xBound.upper);
  if (Number.isFinite(yBound.lower)) polygon = clipPolygon(polygon, 0, -1, -yBound.lower);
  if (Number.isFinite(yBound.upper)) polygon = clipPolygon(polygon, 0, 1, yBound.upper);
  for (const row of parsed.constraintData) {
    let a = row.coefficients[xName] || 0;
    let b = row.coefficients[yName] || 0;
    let rhs = row.rhs;
    if (row.operator === ">=") [a, b, rhs] = [-a, -b, -rhs];
    polygon = clipPolygon(polygon, a, b, rhs);
    if (row.operator === "=") polygon = clipPolygon(polygon, -a, -b, -rhs);
  }
  return polygon;
}

function lineSegment(a, b, rhs, domain) {
  const candidates = [];
  if (Math.abs(b) > 1e-12) {
    candidates.push([domain.minX, (rhs - a * domain.minX) / b], [domain.maxX, (rhs - a * domain.maxX) / b]);
  }
  if (Math.abs(a) > 1e-12) {
    candidates.push([(rhs - b * domain.minY) / a, domain.minY], [(rhs - b * domain.maxY) / a, domain.maxY]);
  }
  const inside = candidates.filter(([x, y]) => x >= domain.minX - 1e-8 && x <= domain.maxX + 1e-8 && y >= domain.minY - 1e-8 && y <= domain.maxY + 1e-8);
  const unique = inside.filter((point, index) => inside.findIndex((other) => Math.abs(point[0] - other[0]) < 1e-8 && Math.abs(point[1] - other[1]) < 1e-8) === index);
  return unique.length >= 2 ? [unique[0], unique[1]] : null;
}

function geometryScale(domain) {
  return {
    sx: (value) => 70 + (value - domain.minX) / Math.max(domain.maxX - domain.minX, 1e-9) * 640,
    sy: (value) => 400 - (value - domain.minY) / Math.max(domain.maxY - domain.minY, 1e-9) * 330,
  };
}

function objectiveSegment(parsed, point, domain, coefficientOverride = null) {
  const [xName, yName] = parsed.variables;
  const a = coefficientOverride?.name === xName ? coefficientOverride.value : parsed.objective[xName] || 0;
  const b = coefficientOverride?.name === yName ? coefficientOverride.value : parsed.objective[yName] || 0;
  return lineSegment(a, b, a * point[0] + b * point[1], domain);
}

function statusDescription(status) {
  return ({ BS: "basic", UB: "at upper limit", LB: "at lower limit", FX: "fixed", FR: "free and nonbasic", NB: "nonbasic" })[status] || "basis status unavailable";
}

function bindExplanation(target, narration, text) {
  const show = () => {
    target.closest("svg, .sensitivity-lens, .iis-proof")?.querySelectorAll(".is-active").forEach((node) => node.classList.remove("is-active"));
    target.classList.add("is-active");
    narration.replaceChildren(...text());
  };
  target.addEventListener("pointerenter", show);
  target.addEventListener("focus", show);
}

export function renderOptimalityMap(container, result, parsed) {
  if (!container) return;
  const columns = Object.values(result.Columns || {}).sort((a, b) => a.Index - b.Index);
  if (parsed.variables.length !== 2 || columns.length !== 2 || !result.Rows) {
    renderBoundLanes(container, result.Columns || {});
    return;
  }
  const point = columns.map((column) => column.Primal);
  const domain = plotDomain(parsed, point);
  const polygon = feasiblePolygon(parsed, domain);
  const { sx, sy } = geometryScale(domain);
  const narration = element("div", { class: "viz-narration", role: "status", "aria-live": "polite" },
    element("strong", { text: `Best feasible point: ${parsed.variables[0]} = ${displayNumber(point[0])}, ${parsed.variables[1]} = ${displayNumber(point[1])}` }),
    element("span", { text: "Both walls are full. A thicker wall means one more unit is worth more objective value; hover it for the exact dual and basis status." }));
  const maxDual = Math.max(1e-9, ...result.Rows.map((row) => Math.abs(row.Dual || 0)));
  const wallMarks = parsed.constraintData.flatMap((row, index) => {
    const segment = lineSegment(row.coefficients[parsed.variables[0]] || 0, row.coefficients[parsed.variables[1]] || 0, row.rhs, domain);
    if (!segment) return [];
    const solved = result.Rows.find((item) => item.Index === index) || {};
    const bound = solved.Status === "LB" ? solved.Lower : solved.Upper;
    const slack = Number.isFinite(bound) ? Math.abs(bound - solved.Primal) : 0;
    const binding = slack <= 1e-7;
    const pressure = Math.abs(solved.Dual || 0) / maxDual;
    const [[x1, y1], [x2, y2]] = segment;
    const labelPosition = index % 2 ? 0.72 : 0.32;
    const labelX = sx(x1) + (sx(x2) - sx(x1)) * labelPosition;
    const labelY = sy(y1) + (sy(y2) - sy(y1)) * labelPosition;
    const relaxedRhs = row.rhs + (solved.Status === "LB" ? -1 : 1);
    const ghost = lineSegment(row.coefficients[parsed.variables[0]] || 0, row.coefficients[parsed.variables[1]] || 0, relaxedRhs, domain);
    const group = focusableMark("g", { class: `pressure-wall ${binding ? "is-binding" : "is-slack"}`, "data-row": row.name }, `${row.name}: ${formatLinearConstraint(row, parsed.variables)}`,
      ghost ? svgElement("line", { class: "pressure-ghost", x1: sx(ghost[0][0]), y1: sy(ghost[0][1]), x2: sx(ghost[1][0]), y2: sy(ghost[1][1]) }) : null,
      svgElement("line", { class: "pressure-line", x1: sx(x1), y1: sy(y1), x2: sx(x2), y2: sy(y2), style: `--pressure:${2 + pressure * 6}px` }),
      svgElement("g", { class: "pressure-tag", transform: `translate(${Math.min(650, Math.max(95, labelX))} ${Math.min(375, Math.max(88, labelY - 10))})` },
        svgElement("rect", { x: -54, y: -13, width: 108, height: 24, rx: 12 }),
        svgText(`${row.name} · ${binding ? "FULL" : `${displayNumber(slack)} SLACK`}`, { x: 0, y: 4, "text-anchor": "middle" })));
    bindExplanation(group, narration, () => [
      element("strong", { text: `${row.name} is ${binding ? "at its limit" : "not currently limiting the solution"}.` }),
      element("span", { text: `Activity ${displayNumber(solved.Primal)}; ${statusDescription(solved.Status)} (${solved.Status || "no code"}); HiGHS dual ${displayNumber(solved.Dual)}.` }),
      element("span", { text: binding && Math.abs(solved.Dual || 0) > 1e-9
        ? `The ghost wall shows a one-unit relaxation. Locally, the objective changes by about ${displayNumber(solved.Status === "LB" ? -(solved.Dual || 0) : solved.Dual || 0)}.`
        : "Contact and economic pressure are separate: a limiting wall can still have a zero dual." }),
    ]);
    return [group];
  });
  const objective = objectiveSegment(parsed, point, domain);
  const [cx, cy] = [sx(point[0]), sy(point[1])];
  const objectiveVector = [parsed.objective[parsed.variables[0]] || 0, parsed.objective[parsed.variables[1]] || 0];
  const vectorLength = Math.hypot(...objectiveVector) || 1;
  const direction = parsed.sense === "minimize" ? -1 : 1;
  const svg = visualization("0 0 780 450", "Constraint pressure map showing the feasible region, optimum, objective direction, basis contact, and dual pressure",
    svgElement("defs", {},
      svgElement("linearGradient", { id: "objective-field", x1: "0", y1: "1", x2: "1", y2: "0" },
        svgElement("stop", { "stop-color": "#9ececc", "stop-opacity": ".22" }),
        svgElement("stop", { offset: "1", "stop-color": "#e27680", "stop-opacity": ".48" })),
      svgElement("marker", { id: "objective-arrow", markerWidth: 8, markerHeight: 8, refX: 6, refY: 3, orient: "auto" }, svgElement("path", { d: "M0 0L6 3L0 6Z", fill: "#c65360" }))),
    svgElement("path", { class: "plot-grid", d: "M70 70V400H710M70 334H710M198 70V400M326 70V400M454 70V400M582 70V400" }),
    polygon.length ? svgElement("polygon", { class: "feasible-region pressure-region", points: polygon.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ") }) : null,
    wallMarks,
    objective ? svgElement("line", { class: "objective-contour", x1: sx(objective[0][0]), y1: sy(objective[0][1]), x2: sx(objective[1][0]), y2: sy(objective[1][1]) }) : null,
    svgElement("line", { class: "objective-direction", x1: cx, y1: cy, x2: cx + direction * objectiveVector[0] / vectorLength * 72, y2: cy - direction * objectiveVector[1] / vectorLength * 72, "marker-end": "url(#objective-arrow)" }),
    svgText("better objective", { class: "objective-direction-label", x: cx + direction * objectiveVector[0] / vectorLength * 82, y: cy - direction * objectiveVector[1] / vectorLength * 82 }),
    focusableMark("g", { class: "optimum-mark", transform: `translate(${cx} ${cy})` }, `Optimal point ${parsed.variables[0]} ${point[0]}, ${parsed.variables[1]} ${point[1]}, objective ${result.ObjectiveValue}`,
      svgElement("circle", { r: 17 }), svgElement("circle", { r: 6 }), svgElement("rect", { x: 16, y: 12, width: 122, height: 43, rx: 5 }),
      svgText(`OPTIMUM · ${displayNumber(result.ObjectiveValue)}`, { x: 22, y: 29 }),
      svgText(`${parsed.variables[0]}=${displayNumber(point[0])}  ${parsed.variables[1]}=${displayNumber(point[1])}`, { x: 22, y: 47 })),
    svgText(parsed.variables[0], { class: "axis-label", x: 716, y: 421 }),
    svgText(parsed.variables[1], { class: "axis-label", x: 52, y: 69 }));
  const optimum = svg.querySelector(".optimum-mark");
  bindExplanation(optimum, narration, () => [
    element("strong", { text: `This is the best feasible point, with objective ${displayNumber(result.ObjectiveValue)}.` }),
    ...columns.map((column) => element("span", { text: `${column.Name} = ${displayNumber(column.Primal)}; ${statusDescription(column.Status)} (${column.Status}); reduced cost ${displayNumber(column.Dual)}.` })),
  ]);
  container.replaceChildren(element("div", { class: "optimality-map" }, svg, narration));
}

function formatLinearExpression(constraint, names) {
  return names.map((name) => {
    const coefficient = constraint.coefficients[name] || 0;
    if (!coefficient) return "";
    const magnitude = Math.abs(coefficient);
    const term = `${magnitude === 1 ? "" : displayNumber(magnitude)}${name}`;
    return coefficient < 0 ? `− ${term}` : `+ ${term}`;
  }).filter(Boolean).join(" ").replace(/^\+ /, "");
}

function formatLinearConstraint(constraint, names) {
  return `${formatLinearExpression(constraint, names)} ${constraint.operator.replace("<=", "≤").replace(">=", "≥")} ${displayNumber(constraint.rhs)}`;
}

function augmentedName(data, index) {
  if (index < 0) return "no item";
  return index < data.model.colNames.length ? data.model.colNames[index] : `${data.model.rowNames[index - data.model.colNames.length]} activity`;
}

export function renderRangingViz(container, data, parsed) {
  if (!container) return;
  const lens = element("div", { class: "sensitivity-lens" });
  const equation = element("div", { class: "sensitivity-equation" });
  const chart = element("div", { class: "sensitivity-chart" });
  const narration = element("div", { class: "viz-narration", role: "status", "aria-live": "polite" });
  const options = [];
  const makeTerm = (text, option) => {
    options.push(option);
    const button = element("button", { class: "sensitivity-term", type: "button", text, dataset: { key: option.key } });
    equation.append(button);
    return button;
  };
  equation.append(element("span", { class: "equation-prefix", text: `${data.sense}  ` }));
  data.model.colNames.forEach((name, index) => {
    if (index) equation.append(" + ");
    makeTerm(displayNumber(data.model.colCost[index]), { key: `cost-${index}`, kind: "cost", index, name, current: data.model.colCost[index], down: data.ranging.colCostDown, up: data.ranging.colCostUp });
    equation.append(name);
  });
  equation.append(element("span", { class: "equation-divider", text: "within" }));
  parsed.constraintData.forEach((row, index) => {
    const line = element("span", { class: "equation-row" });
    const left = formatLinearExpression(row, parsed.variables);
    line.append(`${row.name}: ${left} ${row.operator.replace("<=", "≤").replace(">=", "≥")} `);
    const status = data.basis.rowStatus[index];
    const current = status === 1 ? data.solution.rowValue[index] : status === 0 ? data.model.rowLower[index] : data.model.rowUpper[index];
    const term = makeTerm(displayNumber(row.rhs), { key: `row-${index}`, kind: "row", index, name: row.name, current, declared: row.rhs, status, down: data.ranging.rowBoundDown, up: data.ranging.rowBoundUp });
    line.append(term);
    equation.append(line);
  });

  const renderSelection = (option) => {
    equation.querySelectorAll(".sensitivity-term").forEach((button) => button.classList.toggle("is-active", button.dataset.key === option.key));
    const down = option.down.value[option.index];
    const up = option.up.value[option.index];
    const finite = [down, option.current, up].filter(Number.isFinite);
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    const span = Math.max(max - min, 1);
    const position = (value) => Number.isFinite(value) ? `${10 + (value - min) / span * 80}%` : value < 0 ? "2%" : "98%";
    const interval = element("div", { class: "sensitivity-interval" },
      element("span", { class: "interval-end", text: displayNumber(down), style: { left: position(down) } }),
      element("div", { class: "interval-line" }),
      element("span", { class: "interval-current", style: { left: position(option.current) }, title: `Current value ${option.current}` }),
      element("span", { class: "interval-end", text: displayNumber(up), style: { left: position(up) } }));
    chart.replaceChildren(interval);
    if (parsed.variables.length === 2 && data.solution.colValue.length === 2) {
      const point = data.solution.colValue;
      const domain = plotDomain(parsed, point);
      const polygon = feasiblePolygon(parsed, domain);
      const { sx, sy } = geometryScale(domain);
      const overlays = [];
      if (option.kind === "cost") {
        for (const [value, cls] of [[down, "range-down"], [up, "range-up"], [option.current, "range-current"]]) {
          if (!Number.isFinite(value)) continue;
          const segment = objectiveSegment(parsed, point, domain, { name: option.name, value });
          if (segment) overlays.push(svgElement("line", { class: `sensitivity-line ${cls}`, x1: sx(segment[0][0]), y1: sy(segment[0][1]), x2: sx(segment[1][0]), y2: sy(segment[1][1]) }));
        }
      } else {
        const row = parsed.constraintData[option.index];
        for (const [value, cls] of [[down, "range-down"], [up, "range-up"], [option.current, "range-current"]]) {
          if (!Number.isFinite(value)) continue;
          const segment = lineSegment(row.coefficients[parsed.variables[0]] || 0, row.coefficients[parsed.variables[1]] || 0, value, domain);
          if (segment) overlays.push(svgElement("line", { class: `sensitivity-line ${cls}`, x1: sx(segment[0][0]), y1: sy(segment[0][1]), x2: sx(segment[1][0]), y2: sy(segment[1][1]) }));
        }
      }
      chart.prepend(visualization("0 0 780 450", `${option.name} stability range`,
        svgElement("path", { class: "plot-grid", d: "M70 70V400H710M70 334H710M198 70V400M326 70V400M454 70V400M582 70V400" }),
        polygon.length ? svgElement("polygon", { class: "feasible-region", points: polygon.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ") }) : null,
        overlays,
        svgElement("circle", { class: "sensitivity-optimum", cx: sx(point[0]), cy: sy(point[1]), r: 9 })));
    }
    const downEvent = `${augmentedName(data, option.down.inVariable[option.index])} enters; ${augmentedName(data, option.down.outVariable[option.index])} leaves`;
    const upEvent = `${augmentedName(data, option.up.inVariable[option.index])} enters; ${augmentedName(data, option.up.outVariable[option.index])} leaves`;
    const subject = option.kind === "cost" ? `${option.name}'s objective coefficient` : option.status === 1 ? `${option.name}'s activity` : `${option.name}'s active bound`;
    narration.replaceChildren(
      element("strong", { text: `${subject} can range from ${displayNumber(down)} to ${displayNumber(up)}.` }),
      element("span", { text: `Current value: ${displayNumber(option.current)}. Change one item at a time; within this interval the same simplex basis remains optimal.` }),
      element("span", { text: `At ${displayNumber(down)}: ${downEvent}. At ${displayNumber(up)}: ${upEvent}.` }));
  };
  for (const button of equation.querySelectorAll(".sensitivity-term")) {
    const option = options.find((item) => item.key === button.dataset.key);
    button.addEventListener("pointerenter", () => renderSelection(option));
    button.addEventListener("focus", () => renderSelection(option));
    button.addEventListener("click", () => renderSelection(option));
  }
  lens.append(equation, chart, narration);
  container.replaceChildren(lens);
  if (options.length) renderSelection(options[0]);
  else narration.replaceChildren(element("strong", { text: "No rangeable rows or columns were found." }));
}

function boundExpression(iis, member) {
  const name = iis.colNames[member.index];
  const side = member.bound;
  if (side === "lower") return `${name} ≥ ${displayNumber(iis.colLower[member.index])}`;
  if (side === "upper") return `${name} ≤ ${displayNumber(iis.colUpper[member.index])}`;
  if (side === "boxed") return `${displayNumber(iis.colLower[member.index])} ≤ ${name} ≤ ${displayNumber(iis.colUpper[member.index])}`;
  return `${name} is free`;
}

export function renderIisPlot(container, parsed, iis) {
  if (!container) return false;
  const members = [
    ...iis.colIndices.map((index, position) => ({ kind: "column", index, bound: iis.colBounds[position] })),
    ...iis.rowIndices.map((index, position) => ({ kind: "row", index, bound: iis.rowBounds[position] })),
  ];
  if (!members.length) return false;
  const proof = element("div", { class: "iis-proof" });
  const narration = element("div", { class: "viz-narration", role: "status", "aria-live": "polite" });
  const rowMember = members.find((member) => member.kind === "row");
  const row = rowMember ? parsed.constraintData[rowMember.index] : null;
  const colMembers = new Map(members.filter((member) => member.kind === "column").map((member) => [member.index, member]));
  let implied;
  let allowed;
  let relation;
  if (row && rowMember.bound === "upper") {
    implied = parsed.variables.reduce((sum, name, index) => {
      const coefficient = row.coefficients[name] || 0;
      const member = colMembers.get(index);
      if (!member || (coefficient >= 0 && !["lower", "boxed"].includes(member.bound)) || (coefficient < 0 && !["upper", "boxed"].includes(member.bound))) return NaN;
      const value = coefficient >= 0 ? iis.colLower[index] : iis.colUpper[index];
      return sum + coefficient * value;
    }, 0);
    allowed = iis.rowUpper[rowMember.index];
    relation = "minimum";
  } else if (row && rowMember && rowMember.bound === "lower") {
    implied = parsed.variables.reduce((sum, name, index) => {
      const coefficient = row.coefficients[name] || 0;
      const member = colMembers.get(index);
      if (!member || (coefficient >= 0 && !["upper", "boxed"].includes(member.bound)) || (coefficient < 0 && !["lower", "boxed"].includes(member.bound))) return NaN;
      const value = coefficient >= 0 ? iis.colUpper[index] : iis.colLower[index];
      return sum + coefficient * value;
    }, 0);
    allowed = iis.rowLower[rowMember.index];
    relation = "maximum";
  }
  const clauses = members.map((member) => {
    const text = member.kind === "column" ? boundExpression(iis, member) : formatLinearConstraint(parsed.constraintData[member.index], parsed.variables);
    const button = element("button", { class: "iis-clause", type: "button", text });
    bindExplanation(button, narration, () => [
      element("strong", { text: `${text} is part of this conflict.` }),
      element("span", { text: member.kind === "column"
        ? `HiGHS retained the ${member.bound} bound of ${iis.colNames[member.index]}. Removing any member resolves this particular true IIS.`
        : `HiGHS retained the ${member.bound} side of row ${iis.rowNames[member.index]}. Removing any member resolves this particular true IIS.` }),
    ]);
    return button;
  });
  proof.append(element("div", { class: "iis-proof-heading" },
    element("span", { text: "These requirements cannot all be true" }),
    element("strong", { text: `${members.length} essential members` })),
  element("div", { class: "iis-clauses" }, clauses));
  if (Number.isFinite(implied) && Number.isFinite(allowed)) {
    const gap = Math.abs(implied - allowed);
    const rowLeft = formatLinearExpression(row, parsed.variables);
    proof.append(element("div", { class: "contradiction-chain" },
      element("strong", { text: `The bounds force ${rowLeft} to have a ${relation} of ${displayNumber(implied)}.` }),
      element("span", { text: `${row.name} allows ${rowLeft} only ${rowMember.bound === "upper" ? "up to" : "down to"} ${displayNumber(allowed)}.` })),
    element("div", { class: "conflict-gap", style: { "--gap-start": `${Math.min(implied, allowed)}`, "--gap-end": `${Math.max(implied, allowed)}` } },
      element("div", { class: "gap-line" }, element("span", { class: "gap-left" }), element("span", { class: "gap-empty" }), element("span", { class: "gap-right" })),
      element("div", { class: "gap-labels" }, element("span", { text: displayNumber(Math.min(implied, allowed)) }), element("strong", { text: `impossible gap ${displayNumber(gap)}` }), element("span", { text: displayNumber(Math.max(implied, allowed)) }))));
  }
  narration.append(element("strong", { text: "This is a true irreducible infeasible subsystem." }),
    element("span", { text: "Every displayed member is necessary for this conflict. The full model may contain other conflicts." }));
  proof.append(narration);
  container.replaceChildren(proof);
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
  const sense = lines.some((line) => /^\s*minimize\b/i.test(line)) ? "minimize" : "maximize";
  const start = lines.findIndex((line) => /^\s*(Subject To|Such That)\s*$/i.test(line));
  const constraints = [];
  const constraintData = [];
  if (start >= 0) {
    for (const line of lines.slice(start + 1)) {
      if (/^\s*(Bounds|Generals?|Binar(?:y|ies)|Integers|End)\s*$/i.test(line)) break;
      if (!line.trim()) continue;
      const source = line.trim();
      const name = source.includes(":") ? source.slice(0, source.indexOf(":")).trim() : `r${constraintData.length}`;
      const body = source.includes(":") ? source.slice(source.indexOf(":") + 1) : source;
      const relation = body.match(/^(.*?)(<=|>=|=)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*$/i);
      constraints.push(source);
      constraintData.push(relation ? {
        name,
        coefficients: parseLinearExpression(relation[1]),
        operator: relation[2],
        rhs: Number(relation[3]),
      } : { name, coefficients: {}, operator: "=", rhs: 0 });
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
  return { variables, constraints, constraintData, bounds, objective, matrix, sense };
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
