export function createWorkerClient(url) {
  let worker;
  let messageId = 0;
  const pending = new Map();

  function getWorker() {
    if (worker) return worker;
    worker = new Worker(url);
    worker.addEventListener("message", ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      clearTimeout(request.timer);
      request.resolve(data);
    });

    worker.addEventListener("error", (error) => {
      console.error("Worker error:", error);
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.resolve({ error: "The solver worker failed to load." });
      }
      pending.clear();
    });
    return worker;
  }

  function send(action, payload = {}) {
    const id = ++messageId;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        resolve({ error: `The solver did not respond to "${action}".` });
      }, 30000);
      pending.set(id, { resolve, timer });
      getWorker().postMessage({ id, action, ...payload });
    });
  }

  return { send, terminate: () => worker?.terminate() };
}
