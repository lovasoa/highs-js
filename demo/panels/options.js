import { send } from "../worker-client.js";
import { element, setJson, setOutput } from "../ui.js";

const optsBody = document.getElementById("opts-body");
const optsSearch = document.getElementById("opts-search");
const optsCount = document.getElementById("opts-count");
const optDetail = document.getElementById("opt-detail");
let allOptions = [];
const optionCache = new Map();

function renderOptionsTable(rows) {
  if (!optsBody) return;
  optsBody.replaceChildren(...rows.map((row) => element("tr", { style: { cursor: "pointer" } },
    element("td", {}, element("code", { text: row.name, style: { fontSize: "0.8rem" } })),
    element("td", { text: row.type }),
    element("td", { text: JSON.stringify(row.current) }),
    element("td", { text: JSON.stringify(row.default) }),
  )));
  if (optsCount) optsCount.textContent = `${rows.length} options`;
}

export async function loadOptions() {
  setOutput(optDetail, "Loading options…", "placeholder");
  const data = await send("optionsList");
  if (data.error) {
    setOutput(optDetail, data.error, "error");
    return;
  }
  allOptions = data.rows || [];
  optionCache.clear();
  for (const row of allOptions) optionCache.set(row.name, row);
  renderOptionsTable(allOptions);
}

export function initializeOptionsPanel() {
  optsSearch?.addEventListener("input", () => {
    const query = optsSearch.value.toLowerCase();
    renderOptionsTable(query ? allOptions.filter((row) => row.name.toLowerCase().includes(query)) : allOptions);
  });
  optsBody?.addEventListener("click", (event) => {
    const row = event.target.closest("tr");
    const name = row?.querySelector("code")?.textContent;
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
    if (data.error) setOutput(optDetail, data.error, "error");
    else setJson(optDetail, data);
  });
  document.getElementById("opt-set")?.addEventListener("click", async () => {
    const name = document.getElementById("opt-name")?.value.trim();
    const rawValue = document.getElementById("opt-value")?.value.trim();
    if (!name || rawValue === undefined || rawValue === "") return;
    let value;
    if (rawValue === "true") value = true;
    else if (rawValue === "false") value = false;
    else if (rawValue === "inf" || rawValue === "infinity") value = Infinity;
    else if (rawValue === "-inf" || rawValue === "-infinity") value = -Infinity;
    else if (!isNaN(Number(rawValue))) value = Number(rawValue);
    else value = rawValue;
    setOutput(optDetail, "Setting…", "");
    const data = await send("optionsSet", { name, value });
    if (data.error) {
      setOutput(optDetail, data.error, "error");
    } else {
      optionCache.set(name, data);
      const index = allOptions.findIndex((row) => row.name === name);
      if (index >= 0) allOptions[index].current = data.current;
      setJson(optDetail, data);
      optsSearch?.dispatchEvent(new Event("input"));
    }
  });
  document.getElementById("opt-reset-all")?.addEventListener("click", async () => {
    await send("optionsReset");
    optionCache.clear();
    loadOptions();
  });
}
