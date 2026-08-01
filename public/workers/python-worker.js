// Module worker: runs student Python code via Pyodide (CPython-on-WASM),
// loaded lazily from the jsdelivr CDN so it's never bundled into the app.
// Pinned to a specific version per Pyodide's own guidance against using
// unpinned "latest" CDN URLs in production — bump deliberately, not silently.
const PYODIDE_VERSION = "314.0.3";
const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = null;

function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = import(/* webpackIgnore: true */ `${PYODIDE_CDN_BASE}pyodide.mjs`).then(
      ({ loadPyodide }) => loadPyodide({ indexURL: PYODIDE_CDN_BASE })
    );
  }
  return pyodidePromise;
}

function describeError(err) {
  if (!err) return "Unknown error";
  return err.message || String(err);
}

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === "init") {
    try {
      await getPyodide();
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "init-error", error: describeError(err) });
    }
    return;
  }

  if (msg.type === "run") {
    const { id, code, functionName, input } = msg;
    const pyodide = await getPyodide();

    const stdoutChunks = [];
    pyodide.setStdout({ batched: (s) => stdoutChunks.push(s) });

    let actual = null;
    let error = null;
    let globals = null;
    let pyArgs = [];

    try {
      // Fresh globals per run: this worker is reused across every test case
      // in a single "Run & Check" click, and a fresh scope means one test
      // case's leftover variables/functions can never leak into the next.
      globals = pyodide.toPy({});
      await pyodide.runPythonAsync(code, { globals });

      const fn = globals.get(functionName);
      if (typeof fn !== "function") {
        throw new Error(`Function "${functionName}" is not defined`);
      }

      // Arguments must be converted explicitly. Pyodide passes primitives
      // through, but a plain JS object or array arrives in Python as a
      // JsProxy — which supports neither obj[key] nor .get(), so any
      // challenge taking a dict or list would fail with a confusing
      // "JsProxy object is not subscriptable". toPy gives real dict/list.
      pyArgs = input.map((arg) => pyodide.toPy(arg));

      const result = fn(...pyArgs);
      actual =
        result && typeof result.toJs === "function"
          ? result.toJs({ dict_converter: Object.fromEntries })
          : result;

      if (result && typeof result.destroy === "function") result.destroy();
      if (typeof fn.destroy === "function") fn.destroy();
    } catch (err) {
      error = describeError(err);
    } finally {
      // toPy returns a proxy for objects/arrays but a plain value for
      // primitives, so only the former need destroying.
      pyArgs.forEach((arg) => {
        if (arg && typeof arg.destroy === "function") arg.destroy();
      });
      if (globals && typeof globals.destroy === "function") globals.destroy();
      pyodide.setStdout({});
    }

    self.postMessage({ type: "result", id, actual, stdout: stdoutChunks.join(""), error });
  }
};
