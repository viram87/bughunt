import { runChallenge } from "@/lib/code-runner";

// Shared by the admin authoring form and the dev seed-validation page, so
// both enforce exactly the same definition of "this challenge works" — the
// one already used to validate the 10 seeded challenges.

/**
 * Broken code must NOT pass everything cleanly. Any mix of wrong output,
 * thrown error, or timeout counts as correctly broken.
 */
export function brokenIsExpected(run) {
  return run.results.some((r) => !r.passed);
}

/** Correct code must pass every test case, and there must be at least one. */
export function correctIsExpected(run) {
  return run.results.length > 0 && run.results.every((r) => r.passed);
}

/**
 * Runs both versions of a challenge through the real client-side engine.
 *
 * @returns {Promise<{
 *   ok: boolean,
 *   broken: { run: object, ok: boolean },
 *   correct: { run: object, ok: boolean },
 *   problems: string[],
 * }>}
 */
export async function validateChallenge(
  { language, functionName, brokenCode, correctCode, testCases },
  onStatus
) {
  const brokenRun = await runChallenge({
    language,
    code: brokenCode,
    functionName,
    testCases,
    onStatus,
  });
  const correctRun = await runChallenge({
    language,
    code: correctCode,
    functionName,
    testCases,
    onStatus,
  });

  const brokenOk = brokenIsExpected(brokenRun);
  const correctOk = correctIsExpected(correctRun);

  const problems = [];
  if (!brokenOk) {
    problems.push(
      "The broken code passes every test — students would have nothing to find. Add a test case that exposes the bug."
    );
  }
  if (!correctOk) {
    problems.push(
      "The correct code does not pass every test — either the reference solution or the expected outputs are wrong."
    );
  }

  return {
    ok: brokenOk && correctOk,
    broken: { run: brokenRun, ok: brokenOk },
    correct: { run: correctRun, ok: correctOk },
    problems,
  };
}
