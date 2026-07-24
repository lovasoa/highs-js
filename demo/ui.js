/* ── UI Output Helpers ── */

const SVG_NS = "http://www.w3.org/2000/svg";

function appendChildren(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return parent;
}

function applyAttributes(node, attributes) {
  for (const [name, value] of Object.entries(attributes || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (name === "class") node.classList.add(...String(value).split(/\s+/).filter(Boolean));
    else if (name === "dataset") Object.assign(node.dataset, value);
    else if (name === "style" && typeof value === "object") Object.assign(node.style, value);
    else if (name === "text") node.textContent = String(value);
    else if (name in node && ["value", "disabled", "hidden"].includes(name)) node[name] = value;
    else node.setAttribute(name, value === true ? "" : String(value));
  }
  return node;
}

export function element(tag, attributes = {}, ...children) {
  return appendChildren(applyAttributes(document.createElement(tag), attributes), children);
}

export function svgElement(tag, attributes = {}, ...children) {
  return appendChildren(applyAttributes(document.createElementNS(SVG_NS, tag), attributes), children);
}

export function fragment(...children) {
  return appendChildren(document.createDocumentFragment(), children);
}

export function visualization(viewBox, label, ...children) {
  return svgElement("svg", { viewBox, role: "img", "aria-label": label }, ...children);
}

export function svgText(text, attributes = {}) {
  return svgElement("text", { ...attributes, text });
}

export function focusableMark(tag, attributes, title, ...children) {
  return svgElement(tag, { class: "viz-mark", tabindex: "0", ...attributes },
    svgElement("title", { text: title }), children);
}

export function setOutput(el, text, cls = "") {
  if (!el) return;
  el.textContent = text;
  el.className = `output ${cls}`;
}

export function setJson(el, obj) {
  if (!el) return;
  el.innerHTML = highlightCode(JSON.stringify(obj, null, 2), "json");
  el.className = "output syntax-output";
}

export function setTiming(el, ms) {
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

export function enhanceSyntaxEditors() {
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

export function setStatus(el, value) {
  if (el) el.textContent = String(value || "unknown").toUpperCase();
}

export function renderProgressBars(container, items) {
  if (!container) return;
  const maxVal = Math.max(...items.map((it) => Math.abs(it.val) || 1), 1);
  const bars = items.map((it) => {
    const pct = Math.min(100, Math.max(0, (Math.abs(it.val) / maxVal) * 100));
    return element("div", { class: "progress-item" },
      element("div", { class: "progress-label" },
        element("span", { text: `${it.name}${it.status ? ` (${it.status})` : ""}` }),
        element("span", {
          text: typeof it.val === "number" ? it.val.toFixed(4) : it.val,
          style: { fontWeight: "600", fontFamily: "var(--font-mono)" },
        }),
      ),
      element("div", { class: "progress-track" },
        element("div", { class: "progress-fill", style: { width: `${pct.toFixed(1)}%` } }),
      ),
    );
  });
  container.replaceChildren(...bars);
}
