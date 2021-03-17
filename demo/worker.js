importScripts("highs.js");

onmessage = async function ({ data }) {
  const highs = await Module();
  try {
    postMessage({ solution: highs.solve(data) });
  } catch (error) {
    postMessage({ error });
  }
};
