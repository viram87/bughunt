#!/usr/bin/env node
// Executes every challenge's broken and correct code the same way the
// browser workers do, and asserts the contract: broken code must fail at
// least one test, correct code must pass all of them.
//
// Each run happens in its own child process with a timeout, because several
// challenges are deliberate infinite loops.
//
// Usage: node scripts/verify-challenges.mjs

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { BATCH2 } from "../lib/seed-data/batch2-challenges.mjs";

const run = promisify(execFile);
const TIMEOUT_MS = 5000;

const JS_HARNESS = `
const { code, functionName, input } = JSON.parse(process.argv[1]);
(async () => {
  try {
    const fn = new Function(code + "\\n;return typeof " + functionName + " !== 'undefined' ? " + functionName + " : undefined;")();
    if (typeof fn !== "function") throw new Error("Function " + functionName + " is not defined");
    const actual = await fn(...input);
    process.stdout.write(JSON.stringify({ ok: true, actual }));
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, error: e.message }));
  }
})();
`;

const PY_HARNESS = `
import json, sys
payload = json.loads(sys.argv[1])
g = {}
try:
    exec(payload["code"], g)
    fn = g.get(payload["functionName"])
    if not callable(fn):
        raise NameError("Function %s is not defined" % payload["functionName"])
    actual = fn(*payload["input"])
    sys.stdout.write(json.dumps({"ok": True, "actual": actual}))
except Exception as e:
    sys.stdout.write(json.dumps({"ok": False, "error": "%s: %s" % (type(e).__name__, e)}))
`;

async function runOne(language, code, functionName, input) {
  const payload = JSON.stringify({ code, functionName, input });
  try {
    const { stdout } =
      language === "python"
        ? await run("python3", ["-c", PY_HARNESS, payload], { timeout: TIMEOUT_MS })
        : await run("node", ["-e", JS_HARNESS, payload], { timeout: TIMEOUT_MS });
    return JSON.parse(stdout);
  } catch (err) {
    if (err.killed || err.signal) return { ok: false, error: "TIMED OUT (likely infinite loop)" };
    return { ok: false, error: (err.stderr || err.message || "").split("\n").slice(-3).join(" ").trim() };
  }
}

function matches(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

async function runVariant(challenge, variant) {
  const code = variant === "broken" ? challenge.broken_code : challenge.correct_code;
  const results = [];
  for (const testCase of challenge.test_cases) {
    const outcome = await runOne(challenge.language, code, challenge.function_name, testCase.input);
    results.push({
      passed: outcome.ok && matches(outcome.actual, testCase.expected_output),
      actual: outcome.actual,
      expected: testCase.expected_output,
      error: outcome.error ?? null,
    });
  }
  return results;
}

let failures = 0;

for (const [index, challenge] of BATCH2.entries()) {
  const brokenResults = await runVariant(challenge, "broken");
  const correctResults = await runVariant(challenge, "correct");

  const brokenOk = brokenResults.some((r) => !r.passed);
  const correctOk = correctResults.length > 0 && correctResults.every((r) => r.passed);
  const ok = brokenOk && correctOk;
  if (!ok) failures++;

  const num = String(index + 1).padStart(2, "0");
  console.log(
    `${ok ? "PASS" : "FAIL"} ${num} [${challenge.language.slice(0, 2)}/${challenge.bug_category}] ${challenge.title}`
  );

  if (!ok) {
    if (!brokenOk) console.log("        ! broken code passes everything — nothing for a student to find");
    if (!correctOk) {
      console.log("        ! correct code does not pass all tests:");
      correctResults.forEach((r, i) => {
        if (!r.passed) {
          console.log(
            `          test ${i + 1}: got ${JSON.stringify(r.actual)}, expected ${JSON.stringify(r.expected)}` +
              (r.error ? ` (${r.error})` : "")
          );
        }
      });
    }
  }
}

console.log(
  `\n${BATCH2.length - failures}/${BATCH2.length} challenges valid` +
    (failures ? ` — ${failures} need fixing` : " — all good")
);
process.exit(failures ? 1 : 0);
