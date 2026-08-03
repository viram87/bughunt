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

// Multi-file support. There is no module loader inside new Function(), so
// challenges spanning files get a minimal CommonJS registry: each file
// becomes a factory, and require() resolves against the other files.
//
// The cache entry is created BEFORE the factory runs, which is what stops
// circular imports hanging — a re-entrant require gets the partially
// populated exports object rather than recursing forever.
// NOTE: no `export` here — this is a classic worker, where `export` is a
// syntax error. Tests extract this function from the file text instead.
function buildModuleSource(files, entryFile, functionName) {
  const registry = files
    .map((f) => `${JSON.stringify(f.name)}: function (module, exports, require) {\n${f.code ?? ""}\n}`)
    .join(",\n");

  return `
const __defs = { ${registry} };
const __cache = {};
function __require(spec) {
  const bare = String(spec).replace(/^\\.\\//, "").replace(/^\\//, "");
  const key = __defs[bare]
    ? bare
    : __defs[bare + ".js"]
      ? bare + ".js"
      : Object.keys(__defs).find((k) => k.replace(/\\.js$/, "") === bare);
  if (!key) throw new Error("Cannot find module '" + spec + "'");
  if (__cache[key]) return __cache[key].exports;
  const module = { exports: {} };
  __cache[key] = module;
  __defs[key](module, module.exports, __require);
  return module.exports;
}
const __entry = __require(${JSON.stringify(entryFile)});
const __fn = __entry[${JSON.stringify(functionName)}];
return typeof __fn === "function" ? __fn : undefined;
`;
}

/** Resolves the target function from either shape: one blob, or many files. */
function resolveFunction({ code, files, entryFile, functionName }) {
  if (!files || files.length === 0) return extractFunction(code, functionName);
  const entry = entryFile ?? files[files.length - 1].name;
  return new Function(buildModuleSource(files, entry, functionName))();
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type !== "run") return;

  const { id, code, files, entryFile, functionName, input } = msg;
  stdoutChunks = [];

  let actual = null;
  let error = null;

  try {
    const fn = resolveFunction({ code, files, entryFile, functionName });
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
