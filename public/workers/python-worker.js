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

// Python-side tracer, injected into the run's globals. sys.settrace fires on
// every line; we keep only frames belonging to the challenge's own function
// so library and harness frames don't pollute the trace.
//
// The step cap is a separate guard from the caller's timeout: a tight loop
// produces steps far faster than it exhausts the clock, so without it memory
// would balloon well before the timeout fired.
const TRACER_SOURCE = `
import sys as _sys, json as _json

_bh_steps = []
_BH_LIMIT = 5000

def _bh_safe(value):
    # Round-trips through JSON rather than returning the value directly.
    # Returning it directly stores a *reference*: for a list or dict that is
    # later mutated, every earlier snapshot would show the final state, so a
    # trace of list-mutation code would silently lie about its own history.
    try:
        return _json.loads(_json.dumps(value))
    except Exception:
        try:
            return repr(value)
        except Exception:
            return "<unrepresentable>"

def _bh_locals(frame):
    return {k: _bh_safe(v) for k, v in frame.f_locals.items()}

def _bh_make_tracer(target):
    def _tracer(frame, event, arg):
        if frame.f_code.co_name != target:
            return None
        if len(_bh_steps) >= _BH_LIMIT:
            return None
        if event == "line":
            _bh_steps.append({"line": frame.f_lineno, "locals": _bh_locals(frame)})
        elif event == "exception":
            # Mark the step that threw. Without this the return event below
            # (which fires with arg=None as the exception propagates) would
            # be reported as "returned None", which is simply untrue.
            if _bh_steps:
                exc_type, exc_value = arg[0], arg[1]
                _bh_steps[-1]["raised"] = "%s: %s" % (exc_type.__name__, exc_value)
        elif event == "return":
            # The return event fires on the same line already recorded as a
            # line event, which would show as two identical steps. Attach the
            # value to that step rather than appending a duplicate — unless
            # the frame is unwinding from an exception, in which case there
            # is no return value to report.
            if _bh_steps and _bh_steps[-1]["line"] == frame.f_lineno:
                if "raised" not in _bh_steps[-1]:
                    _bh_steps[-1]["returned"] = _bh_safe(arg)
            else:
                _bh_steps.append({
                    "line": frame.f_lineno,
                    "locals": _bh_locals(frame),
                    "returned": _bh_safe(arg),
                })
        return _tracer
    return _tracer

def _bh_trace(fn, args, target):
    _bh_steps.clear()
    error = None
    result = None
    _sys.settrace(_bh_make_tracer(target))
    try:
        result = fn(*args)
    except Exception as e:
        # Keep the steps recorded up to the failure — for a challenge whose
        # broken version raises, those steps are the whole point.
        error = "%s: %s" % (type(e).__name__, e)
    finally:
        _sys.settrace(None)
    return _json.dumps({
        "steps": _bh_steps,
        "result": _bh_safe(result),
        "error": error,
        "truncated": len(_bh_steps) >= _BH_LIMIT,
    })
`;

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

  if (msg.type === "trace") {
    const { id, code, functionName, input } = msg;
    const pyodide = await getPyodide();

    const stdoutChunks = [];
    pyodide.setStdout({ batched: (s) => stdoutChunks.push(s) });

    let payload = null;
    let error = null;
    let globals = null;
    let pyArgs = [];

    try {
      globals = pyodide.toPy({});
      await pyodide.runPythonAsync(code, { globals });
      await pyodide.runPythonAsync(TRACER_SOURCE, { globals });

      const fn = globals.get(functionName);
      if (typeof fn !== "function") {
        throw new Error(`Function "${functionName}" is not defined`);
      }

      // Same explicit conversion the run path needs — plain JS objects and
      // arrays arrive in Python as JsProxy otherwise, which isn't subscriptable.
      pyArgs = input.map((arg) => pyodide.toPy(arg));

      const trace = globals.get("_bh_trace");
      payload = JSON.parse(trace(fn, pyodide.toPy(pyArgs), functionName));

      if (typeof fn.destroy === "function") fn.destroy();
      if (typeof trace.destroy === "function") trace.destroy();
    } catch (err) {
      error = describeError(err);
    } finally {
      pyArgs.forEach((arg) => {
        if (arg && typeof arg.destroy === "function") arg.destroy();
      });
      if (globals && typeof globals.destroy === "function") globals.destroy();
      pyodide.setStdout({});
    }

    self.postMessage({
      type: "trace-result",
      id,
      steps: payload?.steps ?? [],
      result: payload?.result ?? null,
      truncated: payload?.truncated ?? false,
      stdout: stdoutChunks.join(""),
      // A Python-level exception comes back inside the payload; a failure to
      // even set up the trace comes back in `error`.
      error: error ?? payload?.error ?? null,
    });
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
