const problem = document.getElementById("problem");
const result = document.getElementById("result");
const mode = document.getElementById("mode");
const loadButton = document.getElementById("load");
const rerunButton = document.getElementById("rerun");
const cost = document.getElementById("cost");
const upper = document.getElementById("upper");

const worker = new Worker("worker.js");
let revision = 0;

function send(message) {
  const currentRevision = ++revision;
  if (result) result.textContent = "Solving…";
  worker.postMessage({ revision: currentRevision, ...message });
}

loadButton?.addEventListener("click", () => {
  if (problem) {
    send({ action: "load", problem: problem.value });
  }
});

rerunButton?.addEventListener("click", () => {
  if (cost && upper) {
    send({
      action: "mutate",
      cost: cost.value === "" ? NaN : Number(cost.value),
      upper: upper.value === "" ? NaN : Number(upper.value),
    });
  }
});

worker.addEventListener("message", ({ data }) => {
  if (data.revision !== revision) return;

  if (data.error) {
    if (mode) mode.textContent = data.mode || "Solver error";
    if (result) result.textContent = `Error: ${data.error}`;
    return;
  }

  if (mode) mode.textContent = data.mode;
  if (result) result.textContent = JSON.stringify(data.result, null, 2);
});

worker.addEventListener("error", (error) => {
  if (mode) mode.textContent = "Worker error";
  if (result) result.textContent = `Error: ${error.message || error}`;
});

/* Initialize on load */
if (problem) {
  send({ action: "load", problem: problem.value });
}
