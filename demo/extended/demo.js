const problem = document.getElementById("problem");
const result = document.getElementById("result");
const mode = document.getElementById("mode");
const worker = new Worker("worker.js");

let revision = 0;
let debounce;

function solve() {
  const currentRevision = ++revision;
  result.textContent = "Solving…";
  worker.postMessage({ revision: currentRevision, problem: problem.value });
}

problem.addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = setTimeout(solve, 150);
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

solve();
