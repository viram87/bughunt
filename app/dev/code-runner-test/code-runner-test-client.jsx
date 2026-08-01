"use client";

import { useState } from "react";
import { runChallenge } from "@/lib/code-runner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Internal-only page (not linked from product nav) for verifying the
// client-side CodeRunner engine in a real browser before Phase 3 builds the
// actual challenge UI on top of it.
const SCENARIOS = [
  {
    id: "py-off-by-one-broken",
    label: "Python off-by-one (broken) — should fail",
    language: "python",
    functionName: "sum_range",
    code: `def sum_range(n):
    total = 0
    for i in range(1, n):
        total += i
    return total`,
    testCases: [
      { input: [5], expected_output: 15 },
      { input: [1], expected_output: 1 },
      { input: [10], expected_output: 55 },
    ],
  },
  {
    id: "py-off-by-one-correct",
    label: "Python off-by-one (correct) — should pass all",
    language: "python",
    functionName: "sum_range",
    code: `def sum_range(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total`,
    testCases: [
      { input: [5], expected_output: 15 },
      { input: [1], expected_output: 1 },
      { input: [10], expected_output: 55 },
    ],
  },
  {
    id: "js-null-check-broken",
    label: "JS null-check (broken) — should fail with error",
    language: "javascript",
    functionName: "getUserCity",
    code: `function getUserCity(user) {
    return user.address.city;
}`,
    testCases: [
      { input: [{ address: { city: "Boston" } }], expected_output: "Boston" },
      { input: [{}], expected_output: "Unknown" },
    ],
  },
  {
    id: "js-null-check-correct",
    label: "JS null-check (correct) — should pass all",
    language: "javascript",
    functionName: "getUserCity",
    code: `function getUserCity(user) {
    return user.address ? user.address.city : "Unknown";
}`,
    testCases: [
      { input: [{ address: { city: "Boston" } }], expected_output: "Boston" },
      { input: [{}], expected_output: "Unknown" },
    ],
  },
  {
    id: "py-infinite-loop",
    label: "Python infinite loop — should time out gracefully (~5s)",
    language: "python",
    functionName: "loop_forever",
    code: `def loop_forever(n):
    while True:
        pass`,
    testCases: [{ input: [1], expected_output: null }],
  },
  {
    id: "js-infinite-loop",
    label: "JS infinite loop — should time out gracefully (~5s)",
    language: "javascript",
    functionName: "loopForever",
    code: `function loopForever(n) {
    while (true) {}
}`,
    testCases: [{ input: [1], expected_output: null }],
  },
];

export function CodeRunnerTestClient() {
  const [runs, setRuns] = useState({});

  async function handleRun(scenario) {
    const startedAt = performance.now();
    setRuns((prev) => ({
      ...prev,
      [scenario.id]: { status: "loading-runtime", elapsedMs: null, result: null, error: null },
    }));

    try {
      const { results, stoppedEarly } = await runChallenge({
        language: scenario.language,
        code: scenario.code,
        functionName: scenario.functionName,
        testCases: scenario.testCases,
        onStatus: (status) => {
          setRuns((prev) => ({ ...prev, [scenario.id]: { ...prev[scenario.id], status } }));
        },
      });

      setRuns((prev) => ({
        ...prev,
        [scenario.id]: {
          status: "done",
          elapsedMs: Math.round(performance.now() - startedAt),
          result: { results, stoppedEarly },
          error: null,
        },
      }));
    } catch (err) {
      setRuns((prev) => ({
        ...prev,
        [scenario.id]: {
          status: "error",
          elapsedMs: Math.round(performance.now() - startedAt),
          result: null,
          error: err?.message ?? String(err),
        },
      }));
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">CodeRunner test page</h1>
      <p className="mb-8 text-muted-foreground">
        Internal-only. Not linked from the app. Verifies Phase 2&apos;s client-side execution engine.
      </p>

      <div className="space-y-4">
        {SCENARIOS.map((scenario) => {
          const run = runs[scenario.id];
          return (
            <Card key={scenario.id}>
              <CardHeader>
                <CardTitle className="text-base">{scenario.label}</CardTitle>
                <CardDescription>
                  {scenario.language} · calls <code>{scenario.functionName}</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => handleRun(scenario)} disabled={run?.status === "loading-runtime" || run?.status === "running"}>
                  {run?.status === "loading-runtime"
                    ? "Loading runtime…"
                    : run?.status === "running"
                    ? "Running…"
                    : "Run"}
                </Button>

                {run && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">
                      status: {run.status}
                      {run.elapsedMs != null && ` · ${run.elapsedMs}ms`}
                    </p>
                    {run.error && <p className="text-destructive">{run.error}</p>}
                    {run.result && (
                      <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                        {JSON.stringify(run.result, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
