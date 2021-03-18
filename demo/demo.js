const lp_problem_el = document.getElementById("lp_problem");
const solution_el = document.getElementById("solution");

var worker = new Worker("worker.js");

function solve() {
  const lp = lp_problem_el.value;
  solution_el.innerText = "Loading...";
  worker.postMessage(lp);
}

worker.onmessage = function ({ data: { solution, error } }) {
  if (solution) solution_el.innerText = JSON.stringify(solution, null, "  ");
  else worker.onerror(error);
};

worker.onerror = function (err) {
  solution_el.innerText = `Error: ${err.message || err}`;
};

lp_problem_el.oninput = solve;
solve();
