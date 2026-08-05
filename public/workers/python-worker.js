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
import sys as _sys, json as _json, types as _types

_bh_steps = []
_bh_inputs = []
_bh_injected = []
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

def _bh_display(value):
    # Modules are noise in a variable panel — an import line would otherwise
    # dump the whole module repr into every subsequent step.
    if isinstance(value, _types.ModuleType):
        return None
    # Functions and classes repr with a memory address, which changes every
    # run and tells the reader nothing. A stable label is more useful.
    if isinstance(value, (_types.FunctionType, _types.BuiltinFunctionType, type)):
        return "<function %s>" % getattr(value, "__name__", "anonymous")
    return _bh_safe(value)

def _bh_filter(mapping):
    out = {}
    for k, v in mapping.items():
        # Module-level frames expose __name__, __builtins__ and friends, and
        # the tracer's own _bh_ helpers would show up if they shared a scope.
        if k.startswith("__") or k.startswith("_bh_"):
            continue
        # The traced program's globals contain our own input() wrapper. Compare
        # by identity, not name, so a user who genuinely rebinds input to
        # something of their own still sees it.
        if any(v is injected for injected in _bh_injected):
            continue
        shown = _bh_display(v)
        if shown is None:
            continue
        out[k] = shown
    return out

def _bh_locals(frame):
    return _bh_filter(frame.f_locals)

def _bh_stack(frame):
    # The chain of the user's own frames, innermost first. Library frames end
    # the walk, so a call into json or re doesn't pad the stack with noise.
    # This is what lets the UI show "in double(), called from <module>" —
    # without it, recursion is impossible to follow.
    names = []
    f = frame
    while f is not None and f.f_code.co_filename == _BH_USER_FILE:
        names.append(f.f_code.co_name)
        f = f.f_back
    return names

def _bh_make_tracer(target):
    def _tracer(frame, event, arg):
        if frame.f_code.co_name != target:
            return None
        if len(_bh_steps) >= _BH_LIMIT:
            return None
        if event == "line":
            _bh_steps.append({
                "line": frame.f_lineno,
                "func": frame.f_code.co_name,
                "locals": _bh_locals(frame),
            })
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
                    "func": frame.f_code.co_name,
                    "locals": _bh_locals(frame),
                    "returned": _bh_safe(arg),
                })
        return _tracer
    return _tracer

# The playground compiles user source under this filename. Frames created by
# that source — the module body AND any function it defines — inherit it, so
# filtering on it traces exactly the user's own code and nothing from the
# standard library. Filtering on co_name instead would trace only the top
# level, and a script that calls a function would show almost nothing.
_BH_USER_FILE = "<user>"

class _BHStepLimit(BaseException):
    pass

def _bh_make_file_tracer():
    def _tracer(frame, event, arg):
        if frame.f_code.co_filename != _BH_USER_FILE:
            return None
        if len(_bh_steps) >= _BH_LIMIT:
            raise _BHStepLimit()
        if event == "line":
            _bh_steps.append({
                "line": frame.f_lineno,
                "func": frame.f_code.co_name,
                "stack": _bh_stack(frame),
                "locals": _bh_locals(frame),
            })
        elif event == "exception":
            if _bh_steps:
                exc_type, exc_value = arg[0], arg[1]
                _bh_steps[-1]["raised"] = "%s: %s" % (exc_type.__name__, exc_value)
        return _tracer
    return _tracer

def _bh_make_input(real_input):
    def _input(prompt=""):
        value = real_input(prompt)
        # len(_bh_steps) is the index of the step currently being executed —
        # the line event fired before this call, so it is already recorded.
        _bh_inputs.append({
            "step": max(0, len(_bh_steps) - 1),
            "prompt": str(prompt),
            "value": value,
        })
        return value
    return _input

def _bh_trace_script(source):
    _bh_steps.clear()
    _bh_inputs.clear()
    error = None
    # A fresh globals dict per run: no state carries over between executions,
    # and the tracer's own helpers stay out of the user's namespace.
    user_globals = {"__name__": "__main__"}
    # Shadows the builtin for the traced program only; a fresh globals dict per
    # run means this never leaks into another execution.
    import builtins as _builtins
    _bh_injected.clear()
    _bh_wrapped_input = _bh_make_input(_builtins.input)
    _bh_injected.append(_bh_wrapped_input)
    user_globals["input"] = _bh_wrapped_input
    try:
        compiled = compile(source, _BH_USER_FILE, "exec")
    except SyntaxError as e:
        # Compilation fails before anything runs, so there are no steps — but
        # the line number is the most useful thing we can hand back.
        return _json.dumps({
            "steps": [],
            "result": None,
            "error": "SyntaxError: %s (line %s)" % (e.msg, e.lineno),
            "truncated": False,
        })

    truncated = False
    _sys.settrace(_bh_make_file_tracer())
    try:
        exec(compiled, user_globals)
    except _BHStepLimit:
        # Hit the cap. Not a user error — the steps so far are still valid.
        truncated = True
    except BaseException as e:
        error = "%s: %s" % (type(e).__name__, e)
    finally:
        _sys.settrace(None)

    if error is None and not truncated:
        _bh_steps.append({
            "line": _bh_steps[-1]["line"] if _bh_steps else 1,
            "func": "<module>",
            "locals": _bh_filter(user_globals),
            "final": True,
        })

    return _json.dumps({
        "steps": _bh_steps,
        "inputs": _bh_inputs,
        "result": None,
        "error": error,
        "truncated": truncated,
    })

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

// Multi-file support. The files are written into Pyodide's virtual
// filesystem and imported normally, so `from validators import x` behaves
// exactly as it would locally — no import shim, no altered semantics.
//
// Each run gets its own directory and every challenge module is purged from
// sys.modules first; otherwise Python's import cache would serve the
// previous run's version and edits would appear to do nothing.
const CHALLENGE_DIR = "/challenge";

async function loadFiles(pyodide, files, globals) {
  try {
    pyodide.FS.mkdirTree(CHALLENGE_DIR);
  } catch {
    // Already exists — fine.
  }

  const moduleNames = [];
  for (const file of files) {
    pyodide.FS.writeFile(`${CHALLENGE_DIR}/${file.name}`, file.code ?? "");
    if (file.name.endsWith(".py")) moduleNames.push(file.name.replace(/\.py$/, ""));
  }

  await pyodide.runPythonAsync(
    `import sys
if ${JSON.stringify(CHALLENGE_DIR)} not in sys.path:
    sys.path.insert(0, ${JSON.stringify(CHALLENGE_DIR)})
for _m in ${JSON.stringify(moduleNames)}:
    sys.modules.pop(_m, None)`,
    { globals }
  );
}

/**
 * Loads a challenge's code into `globals` and returns nothing — the caller
 * then reads functionName off globals. Handles both shapes: a single blob,
 * or a set of files with an entry module.
 */
async function loadChallenge(pyodide, { code, files, entryFile, functionName }, globals) {
  if (!files || files.length === 0) {
    await pyodide.runPythonAsync(code, { globals });
    return;
  }

  await loadFiles(pyodide, files, globals);
  const entryModule = String(entryFile ?? files[files.length - 1].name).replace(/\.py$/, "");
  await pyodide.runPythonAsync(
    `import importlib
_entry = importlib.import_module(${JSON.stringify(entryModule)})
_entry = importlib.reload(_entry)
${functionName} = getattr(_entry, ${JSON.stringify(functionName)})`,
    { globals }
  );
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

  if (msg.type === "trace") {
    const { id, code, files, entryFile, functionName, input, mode, stdin } = msg;
    const pyodide = await getPyodide();

    const stdoutChunks = [];
    pyodide.setStdout({ batched: (s) => stdoutChunks.push(s) });

    // input() has no keyboard to read from in a worker; without this it fails
    // with a bare OSError. Feeding the lines the visitor supplied makes normal
    // student code — which uses input() constantly — actually runnable.
    //
    // Returning undefined once the lines run out raises EOFError, which is the
    // correct Python behaviour and stops the program. Returning null instead
    // does NOT signal EOF and spins forever; verified against Pyodide 0.28.3.
    const stdinQueue = typeof stdin === "string" && stdin.length > 0 ? stdin.split("\n") : [];
    pyodide.setStdin({ stdin: () => (stdinQueue.length ? stdinQueue.shift() : undefined) });

    let payload = null;
    let error = null;
    let globals = null;
    let pyArgs = [];

    try {
      globals = pyodide.toPy({});

      // The visualizer traces arbitrary pasted source: there is no challenge
      // to load and no function to call, so the whole script is executed and
      // traced instead.
      if (mode === "script") {
        await pyodide.runPythonAsync(TRACER_SOURCE, { globals });
        const traceScript = globals.get("_bh_trace_script");
        payload = JSON.parse(traceScript(code));
        if (typeof traceScript.destroy === "function") traceScript.destroy();
      } else {
      await loadChallenge(pyodide, { code, files, entryFile, functionName }, globals);
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
      }
    } catch (err) {
      error = describeError(err);
    } finally {
      pyArgs.forEach((arg) => {
        if (arg && typeof arg.destroy === "function") arg.destroy();
      });
      if (globals && typeof globals.destroy === "function") globals.destroy();
      pyodide.setStdout({});
      pyodide.setStdin({ stdin: () => undefined });
    }

    self.postMessage({
      type: "trace-result",
      id,
      steps: payload?.steps ?? [],
      inputs: payload?.inputs ?? [],
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
    const { id, code, files, entryFile, functionName, input } = msg;
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
      await loadChallenge(pyodide, { code, files, entryFile, functionName }, globals);

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
