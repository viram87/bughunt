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

function captureCall(line, names) {
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

  function walkBlock(block, declared) {
    const out = [];
    for (const stmt of block.body) {
      out.push(captureCall(stmt.loc.start.line, [...declared]));
      declaredFrom(stmt, declared);
      walkInto(stmt, declared);
      out.push(stmt);
    }
    block.body = out;
  }

  function walkInto(stmt, declared) {
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
      if (body?.type === "BlockStatement") walkBlock(body, [...inner]);
    }
  }

  const params = target.params.filter((p) => p.type === "Identifier").map((p) => p.name);
  walkBlock(target.body, [...params]);

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

  const { id, code, functionName, input } = msg;
  const steps = [];
  let result = null;
  let error = null;
  let truncated = false;

  const record = (line, vars) => {
    if (steps.length >= STEP_LIMIT) {
      // Throw rather than silently stop recording. Merely stopping leaves an
      // infinite loop spinning until the outer timeout — burning ~10s to
      // return a trace we already had. Unwinding here returns the partial
      // trace immediately.
      truncated = true;
      throw new Error(STEP_LIMIT_SIGNAL);
    }
    const locals = {};
    for (const [k, v] of Object.entries(vars)) locals[k] = safeClone(v);
    steps.push({ line, locals });
  };

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
