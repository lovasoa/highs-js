/* ── Worker & Message Dispatch ── */

const worker = new Worker("worker.js");
let msgId = 0;
const pending = new Map();

export function send(action, payload = {}) {
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
