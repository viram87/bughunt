const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Runs a student's submission against test cases entirely client-side.
 * One worker per call, one postMessage per test case (not batched) so a
 * hang on test case N never loses the already-computed results for
 * test cases before it. On the first timeout the worker is terminated
 * immediately and every remaining test case is marked `skipped`.
 *
 * @param {{
 *   language: "python" | "javascript",
 *   code: string,
 *   functionName: string,
 *   testCases: Array<{ input: any[], expected_output: any, timeout_ms?: number }>,
 *   onStatus?: (status: "loading-runtime" | "running" | "done") => void,
 * }} params
 * @returns {Promise<{ results: Array<object>, stoppedEarly: boolean }>}
 */
export async function runChallenge({ language, code, files, entryFile, functionName, testCases, onStatus }) {
  onStatus?.("loading-runtime");

  const worker =
    language === "python"
      ? new Worker("/workers/python-worker.js", { type: "module" })
      : new Worker("/workers/javascript-worker.js");

  try {
    if (language === "python") {
      await initPythonWorker(worker);
    }

    onStatus?.("running");

    const results = [];
    let stoppedEarly = false;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      if (stoppedEarly) {
        results.push(skippedResult(testCase));
        continue;
      }

      const outcome = await runOneTestCase(worker, {
        id: i,
        code,
        files,
        entryFile,
        functionName,
        input: testCase.input,
        timeoutMs: testCase.timeout_ms ?? DEFAULT_TIMEOUT_MS,
      });

      if (outcome.timedOut) {
        stoppedEarly = true;
        results.push(timedOutResult(testCase));
        continue;
      }

      const passed = outcome.error == null && deepEqual(outcome.actual, testCase.expected_output);
      results.push({
        passed,
        actual: outcome.actual,
        expected: testCase.expected_output,
        stdout: outcome.stdout,
        error: outcome.error,
        timedOut: false,
        skipped: false,
      });
    }

    onStatus?.("done");
    return { results, stoppedEarly };
  } finally {
    worker.terminate();
  }
}

function skippedResult(testCase) {
  return {
    passed: false,
    actual: null,
    expected: testCase.expected_output,
    stdout: "",
    error: null,
    timedOut: false,
    skipped: true,
  };
}

function timedOutResult(testCase) {
  return {
    passed: false,
    actual: null,
    expected: testCase.expected_output,
    stdout: "",
    error: "Timed out — possible infinite loop",
    timedOut: true,
    skipped: false,
  };
}

/**
 * Records a line-by-line execution trace with variable values at each step.
 *
 * Python uses sys.settrace. JavaScript has no equivalent, so its trace comes
 * from a separate worker that parses the source and injects capture calls —
 * kept apart from the grading worker so instrumentation risk can never
 * affect pass/fail results.
 *
 * @returns {Promise<{supported: boolean, steps?: Array, result?: any,
 *   truncated?: boolean, error?: string|null, timedOut?: boolean}>}
 */
export async function traceExecution({
  language,
  code,
  files,
  entryFile,
  functionName,
  input,
  timeoutMs,
  // "script" traces arbitrary pasted source (the visualizer) instead of
  // calling a named challenge function.
  mode,
  // Lines fed to input(), newline-separated.
  stdin,
}) {
  if (language !== "python" && language !== "javascript") {
    return { supported: false };
  }

  const isPython = language === "python";
  const worker = new Worker(
    isPython ? "/workers/python-worker.js" : "/workers/javascript-trace-worker.js",
    { type: "module" }
  );

  try {
    if (isPython) await initPythonWorker(worker);

    return await new Promise((resolve) => {
      let settled = false;

      function settle(value) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        resolve(value);
      }

      // Tracing is slower than a plain run, so it gets a longer leash than
      // DEFAULT_TIMEOUT_MS — but still bounded.
      const timer = setTimeout(() => {
        worker.terminate();
        settle({
          supported: true,
          steps: [],
          error: "Timed out while tracing — the code may loop forever",
          timedOut: true,
        });
      }, timeoutMs ?? DEFAULT_TIMEOUT_MS * 2);

      function handleMessage(event) {
        const msg = event.data;
        if (msg.type !== "trace-result") return;
        settle({
          supported: true,
          steps: msg.steps ?? [],
          // Each input() read, tagged with the step it happened on, so the
          // viewer can reveal the value at the moment it was consumed.
          inputs: msg.inputs ?? [],
          result: msg.result ?? null,
          truncated: Boolean(msg.truncated),
          stdout: msg.stdout ?? "",
          error: msg.error ?? null,
          timedOut: false,
        });
      }

      function handleError(event) {
        settle({
          supported: true,
          steps: [],
          error: event.message || "Worker crashed while tracing",
          timedOut: false,
        });
      }

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage({ type: "trace", id: 0, code, files, entryFile, functionName, input, mode, stdin });
    });
  } catch (err) {
    return { supported: true, steps: [], error: err?.message ?? String(err), timedOut: false };
  } finally {
    worker.terminate();
  }
}

function initPythonWorker(worker) {
  return new Promise((resolve, reject) => {
    function handleMessage(event) {
      const msg = event.data;
      if (msg.type === "ready") {
        cleanup();
        resolve();
      } else if (msg.type === "init-error") {
        cleanup();
        reject(new Error(msg.error));
      }
    }
    function handleError(event) {
      cleanup();
      reject(new Error(event.message || "Failed to load the Python runtime"));
    }
    function cleanup() {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
    }

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({ type: "init" });
  });
}

function runOneTestCase(worker, { id, code, files, entryFile, functionName, input, timeoutMs }) {
  return new Promise((resolve) => {
    let settled = false;

    function settle(outcome) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      resolve(outcome);
    }

    const timer = setTimeout(() => {
      worker.terminate();
      settle({ timedOut: true });
    }, timeoutMs);

    function handleMessage(event) {
      const msg = event.data;
      if (msg.type !== "result" || msg.id !== id) return;
      settle({ timedOut: false, actual: msg.actual, stdout: msg.stdout, error: msg.error });
    }

    function handleError(event) {
      settle({ timedOut: false, actual: null, stdout: "", error: event.message || "Worker crashed" });
    }

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({ type: "run", id, code, files, entryFile, functionName, input });
  });
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Traces a whole script rather than a single challenge function — the
 * visualizer's entry point.
 *
 * Both languages are supported. Python is traced with sys.settrace; JavaScript
 * has no equivalent, so its whole program is instrumented with a call injected
 * before every statement. Both descend into the user's own functions.
 *
 * stdin only applies to Python — JavaScript has no blocking input primitive.
 *
 * @param {{ language: string, code: string, timeoutMs?: number }} options
 */
export async function traceScript({ language, code, stdin = "", timeoutMs = 10000 }) {
  if (language !== "python" && language !== "javascript") return { supported: false };
  return traceExecution({ language, code, input: [], mode: "script", stdin, timeoutMs });
}
