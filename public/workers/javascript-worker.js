// Classic worker: runs student JavaScript directly. Isolation comes from the
// Worker boundary itself (separate thread/global scope, no DOM access) plus
// the caller terminating this worker after one run — no additional sandbox
// is layered on top per the platform's stated scope.

let stdoutChunks = [];

console.log = (...args) => {
  stdoutChunks.push(args.map((a) => (typeof a === "string" ? a : safeStringify(a))).join(" "));
};

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function describeError(err) {
  if (!err) return "Unknown error";
  return err.message || String(err);
}

function extractFunction(code, functionName) {
  // Wrapping in a Function body keeps top-level declarations scoped to this
  // call instead of leaking onto the worker's global `self`.
  const factory = new Function(
    `${code}\n;return (typeof ${functionName} !== "undefined") ? ${functionName} : undefined;`
  );
  return factory();
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type !== "run") return;

  const { id, code, functionName, input } = msg;
  stdoutChunks = [];

  let actual = null;
  let error = null;

  try {
    const fn = extractFunction(code, functionName);
    if (typeof fn !== "function") {
      throw new Error(`Function "${functionName}" is not defined`);
    }
    // await handles both a plain return value and a Promise (the
    // async_race_condition category returns Promises).
    actual = await fn(...input);
  } catch (err) {
    error = describeError(err);
  }

  self.postMessage({ type: "result", id, actual, stdout: stdoutChunks.join("\n"), error });
};
