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
export async function runChallenge({ language, code, functionName, testCases, onStatus }) {
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

function runOneTestCase(worker, { id, code, functionName, input, timeoutMs }) {
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
    worker.postMessage({ type: "run", id, code, functionName, input });
  });
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}
