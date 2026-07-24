const liveRevisions = new Map();
const liveSolvers = new Map();
const liveTimers = new Map();

export function beginLiveSolve(key) {
  const revision = (liveRevisions.get(key) || 0) + 1;
  liveRevisions.set(key, revision);
  const state = document.getElementById(`${key}-state`);
  if (state) {
    state.dataset.revision = String(revision);
    state.dataset.state = "solving";
    state.textContent = "Updating the solution…";
  }
  return revision;
}

export function isLiveSolveCurrent(key, revision) {
  return liveRevisions.get(key) === revision;
}

export function finishLiveSolve(key, revision, message, error = false) {
  if (!isLiveSolveCurrent(key, revision)) return false;
  const state = document.getElementById(`${key}-state`);
  if (state) {
    state.dataset.revision = String(revision);
    state.dataset.state = error ? "error" : "ready";
    state.textContent = message;
  }
  return true;
}

export function registerLiveExamples(solvers) {
  for (const [key, solve] of Object.entries(solvers)) liveSolvers.set(key, solve);
}

export function scheduleLiveSolve(key) {
  clearTimeout(liveTimers.get(key));
  liveTimers.set(key, setTimeout(() => runLiveSolve(key), 5));
}

export async function runLiveSolve(key) {
  try {
    const solve = liveSolvers.get(key);
    if (!solve) throw new Error(`Unknown live example: ${key}`);
    await solve();
  } catch (error) {
    const revision = liveRevisions.get(key);
    finishLiveSolve(key, revision, error instanceof Error ? error.message : String(error), true);
    console.error(`Failed to update ${key}:`, error);
  }
}

export function bindLiveExampleInputs() {
  for (const story of document.querySelectorAll("[data-live-example]")) {
    const key = story.dataset.liveExample;
    if (!liveSolvers.has(key)) throw new Error(`No solver registered for data-live-example="${key}"`);
    story.addEventListener("input", () => scheduleLiveSolve(key));
  }
}
