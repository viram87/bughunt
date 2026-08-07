// Module worker: records a line-by-line execution trace for JavaScript.
//
// JavaScript has no equivalent of Python's sys.settrace, so the source is
// parsed and a __bh(line, vars) call injected before every statement. The
// parser is loaded from a CDN rather than bundled, matching how Pyodide is
// handled — it keeps ~150KB out of the app bundle for a feature most
// visitors never open.
//
// This is deliberately a SEPARATE worker from javascript-worker.js. That one
// runs the pass/fail tests and is well verified; instrumentation is the
// riskier path, so it stays isolated and can't affect grading.
import * as acorn from "https://cdn.jsdelivr.net/npm/acorn@8.14.0/+esm";
import { generate } from "https://cdn.jsdelivr.net/npm/astring@1.9.0/+esm";

const STEP_LIMIT = 5000;
// Sentinel used to unwind out of a runaway loop; not a real error.
const STEP_LIMIT_SIGNAL = "__BH_STEP_LIMIT__";

function ident(name) {
  return { type: "Identifier", name };
}

function captureCall(line, names, funcName, isFinal) {
  return {
    type: "ExpressionStatement",
    expression: {
      type: "CallExpression",
      optional: false,
      callee: ident("__bh"),
      arguments: [
        { type: "Literal", value: line },
        {
          type: "ObjectExpression",
          properties: names.map((n) => ({
            type: "Property",
            kind: "init",
            method: false,
            shorthand: true,
            computed: false,
            key: ident(n),
            value: ident(n),
          })),
        },
        { type: "Literal", value: funcName ?? "<script>" },
        { type: "Literal", value: Boolean(isFinal) },
      ],
    },
  };
}

/**
 * Injects trace calls before every statement of the target function.
 *
 * Two constraints shape this:
 *  - Temporal dead zone: referencing a `let`/`const` before its declaration
 *    throws, so only bindings already declared at that point are captured.
 *  - astring regenerates the source, so its line numbers differ from the
 *    original. Original line numbers are baked in as literals.
 */
function instrument(code, targetName) {
  const ast = acorn.parse(code, { ecmaVersion: 2022, locations: true });

  let target = null;
  for (const node of ast.body) {
    if (node.type === "FunctionDeclaration" && node.id?.name === targetName) target = node;
    if (node.type === "VariableDeclaration") {
      for (const d of node.declarations) {
        if (
          d.id?.name === targetName &&
          (d.init?.type === "FunctionExpression" || d.init?.type === "ArrowFunctionExpression")
        ) {
          target = d.init;
        }
      }
    }
  }
  if (!target || target.body?.type !== "BlockStatement") return null;

  function declaredFrom(node, into) {
    if (node?.type !== "VariableDeclaration") return;
    for (const d of node.declarations) {
      if (d.id.type === "Identifier") into.push(d.id.name);
    }
  }

  function walkBlock(block, declared, funcName) {
    const out = [];
    for (const stmt of block.body) {
      out.push(captureCall(stmt.loc.start.line, [...declared], funcName));
      declaredFrom(stmt, declared);
      walkInto(stmt, declared, funcName);
      out.push(stmt);
    }
    block.body = out;
  }

  function walkInto(stmt, declared, funcName) {
    // Nested blocks always get a COPY: loop-header bindings and block-scoped
    // declarations must not leak outward, or a capture after the block would
    // reference an out-of-scope name and throw.
    const bodies = [];
    const inner = [...declared];

    switch (stmt.type) {
      case "ForOfStatement":
      case "ForInStatement":
        declaredFrom(stmt.left, inner);
        bodies.push(stmt.body);
        break;
      case "ForStatement":
        declaredFrom(stmt.init, inner);
        bodies.push(stmt.body);
        break;
      case "WhileStatement":
      case "DoWhileStatement":
        bodies.push(stmt.body);
        break;
      case "IfStatement":
        bodies.push(stmt.consequent, stmt.alternate);
        break;
      case "TryStatement":
        bodies.push(stmt.block, stmt.handler?.body, stmt.finalizer);
        break;
      case "BlockStatement":
        bodies.push(stmt);
        break;
      default:
        break;
    }

    for (const body of bodies) {
      if (body?.type === "BlockStatement") walkBlock(body, [...inner], funcName);
    }

    // Descend into the user's own functions so a script that does its work
    // inside a function still produces a useful trace. Each gets its own name
    // and its parameters in scope.
    for (const fn of functionsIn(stmt)) {
      if (fn.node.body?.type !== "BlockStatement") continue;
      const params = fn.node.params.filter((p) => p.type === "Identifier").map((p) => p.name);
      walkBlock(fn.node.body, [...declared, ...params], fn.name);
    }
  }

  // Function declarations, and functions assigned to a variable — the two
  // shapes that carry a name worth showing in the trace.
  function functionsIn(stmt) {
    const found = [];
    if (stmt.type === "FunctionDeclaration" && stmt.id?.name) {
      found.push({ name: stmt.id.name, node: stmt });
    }
    if (stmt.type === "VariableDeclaration") {
      for (const d of stmt.declarations) {
        const init = d.init;
        if (
          d.id?.type === "Identifier" &&
          (init?.type === "FunctionExpression" || init?.type === "ArrowFunctionExpression")
        ) {
          found.push({ name: d.id.name, node: init });
        }
      }
    }
    return found;
  }

  const params = target.params.filter((p) => p.type === "Identifier").map((p) => p.name);
  walkBlock(target.body, [...params], targetName);

  return generate(ast);
}

/**
 * Instruments a WHOLE PROGRAM rather than one named function — the visualizer's
 * entry point, where the reader pastes arbitrary code with no function to call.
 *
 * A Program node exposes `body` as a statement array exactly like a
 * BlockStatement, so the same walker applies. Top-level `declared` starts
 * empty: nothing is in scope before the first statement runs.
 */
function instrumentProgram(code) {
  const ast = acorn.parse(code, { ecmaVersion: 2022, locations: true });

  function declaredFrom(node, into) {
    // Function declarations are bindings too; without them a declared function
    // never shows up in the variable panel.
    if (node?.type === "FunctionDeclaration" && node.id?.name) {
      into.push(node.id.name);
      return;
    }
    if (node?.type !== "VariableDeclaration") return;
    for (const d of node.declarations) {
      if (d.id.type === "Identifier") into.push(d.id.name);
    }
  }

  function functionsIn(stmt) {
    const found = [];
    if (stmt.type === "FunctionDeclaration" && stmt.id?.name) {
      found.push({ name: stmt.id.name, node: stmt });
    }
    if (stmt.type === "VariableDeclaration") {
      for (const d of stmt.declarations) {
        const init = d.init;
        if (
          d.id?.type === "Identifier" &&
          (init?.type === "FunctionExpression" || init?.type === "ArrowFunctionExpression")
        ) {
          found.push({ name: d.id.name, node: init });
        }
      }
    }
    return found;
  }

  function walkBlock(block, declared, funcName) {
    const out = [];
    for (const stmt of block.body) {
      out.push(captureCall(stmt.loc.start.line, [...declared], funcName));
      declaredFrom(stmt, declared);
      walkInto(stmt, declared, funcName);
      out.push(stmt);
    }
    block.body = out;
  }

  function walkInto(stmt, declared, funcName) {
    const bodies = [];
    const inner = [...declared];

    switch (stmt.type) {
      case "ForOfStatement":
      case "ForInStatement":
        declaredFrom(stmt.left, inner);
        bodies.push(stmt.body);
        break;
      case "ForStatement":
        declaredFrom(stmt.init, inner);
        bodies.push(stmt.body);
        break;
      case "WhileStatement":
      case "DoWhileStatement":
        bodies.push(stmt.body);
        break;
      case "IfStatement":
        bodies.push(stmt.consequent, stmt.alternate);
        break;
      case "TryStatement":
        bodies.push(stmt.block, stmt.handler?.body, stmt.finalizer);
        break;
      case "BlockStatement":
        bodies.push(stmt);
        break;
      default:
        break;
    }

    for (const body of bodies) {
      if (body?.type === "BlockStatement") walkBlock(body, [...inner], funcName);
    }

    for (const fn of functionsIn(stmt)) {
      if (fn.node.body?.type !== "BlockStatement") continue;
      const params = fn.node.params.filter((p) => p.type === "Identifier").map((p) => p.name);
      walkBlock(fn.node.body, [...declared, ...params], fn.name);
    }
  }

  // Top-level names, collected before instrumenting so the closing capture can
  // report the finished state of all of them.
  const topLevel = [];
  for (const stmt of ast.body) declaredFrom(stmt, topLevel);

  walkBlock(ast, [], "<script>");

  // A capture fires BEFORE its statement, so without this the last line's
  // effect is invisible — paste `const answer = compute()` as the final line
  // and `answer` would never appear anywhere. Mirrors the Python tracer's
  // "after the last line" step.
  const lastLine = code.split("\n").length;
  ast.body.push(captureCall(lastLine, topLevel, "<script>", true));

  return generate(ast);
}

function safeClone(value) {
  // Structured snapshot, same reason as the Python side: storing references
  // would make every step display an object's final state rather than its
  // state at that moment.
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    try {
      return String(value);
    } catch {
      return "<unrepresentable>";
    }
  }
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type !== "trace") return;

  const { id, code, functionName, input, mode } = msg;
  const steps = [];
  const stdoutChunks = [];
  let result = null;
  let error = null;
  let truncated = false;

  // console.* is the only output channel a pasted script has, so it is
  // captured rather than lost. Restored in `finally` — a worker is reused
  // across messages and a leaked patch would swallow later output.
  const realConsole = { log: console.log, warn: console.warn, error: console.error };
  const captureConsole = () => {
    const write = (...args) => {
      stdoutChunks.push(
        args
          .map((a) => {
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(" ")
      );
    };
    console.log = write;
    console.warn = write;
    console.error = write;
  };
  const restoreConsole = () => Object.assign(console, realConsole);

  const record = (line, vars, funcName, isFinal) => {
    if (steps.length >= STEP_LIMIT) {
      // Throw rather than silently stop recording. Merely stopping leaves an
      // infinite loop spinning until the outer timeout — burning ~10s to
      // return a trace we already had. Unwinding here returns the partial
      // trace immediately.
      truncated = true;
      throw new Error(STEP_LIMIT_SIGNAL);
    }
    const locals = {};
    for (const [k, v] of Object.entries(vars)) {
      // Functions repr with source text, which is noise in a variable panel;
      // a stable label matches what the Python tracer shows.
      locals[k] = typeof v === "function" ? `<function ${v.name || "anonymous"}>` : safeClone(v);
    }
    const step = { line, func: funcName ?? "<script>", locals };
    if (isFinal) step.final = true;
    steps.push(step);
  };

  // The visualizer traces arbitrary pasted source: there is no function to
  // call, so the whole program is instrumented and executed.
  if (mode === "script") {
    try {
      captureConsole();
      const instrumented = instrumentProgram(code);
      new Function("__bh", instrumented)(record);
    } catch (err) {
      const message = err?.message ?? String(err);
      if (message === STEP_LIMIT_SIGNAL) {
        truncated = true;
      } else {
        error = message;
        if (steps.length > 0) steps[steps.length - 1].raised = error;
      }
    } finally {
      restoreConsole();
    }

    self.postMessage({
      type: "trace-result",
      id,
      steps,
      inputs: [],
      result: null,
      error,
      truncated,
      stdout: stdoutChunks.join("\n"),
    });
    return;
  }

  try {
    const instrumented = instrument(code, functionName);
    if (!instrumented) throw new Error(`Could not instrument "${functionName}"`);

    const factory = new Function(
      "__bh",
      `${instrumented}\n;return typeof ${functionName} !== "undefined" ? ${functionName} : undefined;`
    );
    const fn = factory(record);
    if (typeof fn !== "function") throw new Error(`Function "${functionName}" is not defined`);

    result = safeClone(await fn(...input));
    if (steps.length > 0) steps[steps.length - 1].returned = result;
  } catch (err) {
    const message = err?.message ?? String(err);
    if (message === STEP_LIMIT_SIGNAL) {
      // Not a failure — we deliberately unwound after hitting the cap. The
      // partial trace is the useful output, and `truncated` already says so.
      truncated = true;
    } else {
      error = message;
      // Mark where it threw, so the steps leading up to the failure still
      // read as a story rather than just stopping.
      if (steps.length > 0) steps[steps.length - 1].raised = error;
    }
  }

  self.postMessage({ type: "trace-result", id, steps, result, error, truncated, stdout: "" });
};
