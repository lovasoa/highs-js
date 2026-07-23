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
  result.textContent = "Solving…";
  worker.postMessage({ revision: currentRevision, ...message });
}

loadButton.addEventListener("click", () => {
  send({ action: "load", problem: problem.value });
});

rerunButton.addEventListener("click", () => {
  send({
    action: "mutate",
    cost: Number(cost.value),
    upper: Number(upper.value),
  });
});

worker.addEventListener("message", ({ data }) => {
  if (data.revision !== revision) return;

  if (data.error) {
    mode.textContent = data.mode || "Solver error";
    result.textContent = `Error: ${data.error}`;
    return;
  }

  mode.textContent = data.mode;
  result.textContent = JSON.stringify(data.result, null, 2);
});

worker.addEventListener("error", (error) => {
  mode.textContent = "Worker error";
  result.textContent = `Error: ${error.message || error}`;
});

send({ action: "load", problem: problem.value });
