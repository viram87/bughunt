"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from "lucide-react";
import { traceExecution } from "@/lib/code-runner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const short = (value) => {
  const text = JSON.stringify(value);
  return text && text.length > 34 ? `${text.slice(0, 33)}…` : text;
};

/**
 * Describes what a line DID, in past tense.
 *
 * Each traced step holds the locals *before* its line runs, so the effect of
 * step i is the difference between step i and step i+1. Presenting it this
 * way ("removed 2, nums is now [4,6,1]") reads far more naturally than the
 * debugger convention of "about to run", which asks the reader to hold a
 * before/after distinction in their head.
 */
function describeStep(step, next, codeLines) {
  const text = (codeLines[step.line - 1] ?? "").trim();
  const isLoopHeader = text.startsWith("for ") || text.startsWith("while ");
  const isCondition = text.startsWith("if ") || text.startsWith("elif ");

  if (step.raised) return { label: step.raised, tone: "error" };
  if (step.returned !== undefined) {
    return { label: `returned ${short(step.returned)}`, tone: "return" };
  }
  if (!next) return { label: "last recorded step", tone: "muted" };

  const created = [];
  const changed = [];
  for (const [name, after] of Object.entries(next.locals ?? {})) {
    const before = step.locals?.[name];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    if (before === undefined) created.push(`${name} = ${short(after)}`);
    else changed.push(`${name} → ${short(after)}`);
  }
  const effects = [...created, ...changed];

  // Python blocks are defined by indentation, so "did we enter the body?" is
  // an indentation question — not a line-number one. Comparing line numbers
  // gets it wrong when the loop exits *forward* to the line after the body,
  // which is exactly the moment an off-by-one becomes visible.
  const indentOf = (lineNo) => {
    const raw = codeLines[lineNo - 1] ?? "";
    const i = raw.search(/\S/);
    return i === -1 ? 0 : i;
  };
  const enteredBody = indentOf(next.line) > indentOf(step.line);

  if (isLoopHeader) {
    if (!enteredBody) return { label: "loop finished — body skipped", tone: "loop" };
    return {
      label: effects.length ? `loop: ${effects.join(", ")}` : "loop continues",
      tone: "loop",
    };
  }

  if (isCondition) {
    return { label: enteredBody ? "condition true" : "condition false", tone: "muted" };
  }

  if (effects.length === 0) return { label: "no change", tone: "muted" };

  // A container changing in place is usually the interesting moment, so it
  // gets called out rather than blending in with plain assignments.
  const mutated = changed.some((c) => /→ [[{]/.test(c));

  // If this line shrinks the very list an enclosing loop is walking over,
  // say so. `for x in items` iterates by index, so removing an element makes
  // every later one shift left while the index still advances — items get
  // skipped silently. Without naming it, the reader just sees the loop
  // variable jump and has no idea why.
  // Walk outward through each enclosing block — an intervening `if` must not
  // stop the search, or the loop two levels up is never found.
  let indent = indentOf(step.line);
  for (let above = step.line - 1; above >= 1 && indent > 0; above--) {
    const line = codeLines[above - 1] ?? "";
    if (line.trim() === "") continue;
    const aboveIndent = indentOf(above);
    if (aboveIndent >= indent) continue;
    indent = aboveIndent;

    const iterable = line.trim().match(/^for\s+\w+\s+in\s+([A-Za-z_]\w*)\s*:/)?.[1];
    if (!iterable) continue;

    const before = step.locals?.[iterable];
    const after = next.locals?.[iterable];
    if (Array.isArray(before) && Array.isArray(after) && after.length < before.length) {
      return {
        label: `${effects.join(", ")}  ⚠ changed ${iterable} while looping over it — later items shift left and get skipped`,
        tone: "mutate",
      };
    }
  }

  return { label: effects.join(", "), tone: mutated ? "mutate" : "assign" };
}

const TONE_CLASS = {
  error: "text-destructive",
  return: "text-success",
  loop: "text-chart-2",
  mutate: "text-primary",
  assign: "",
  muted: "text-muted-foreground",
};

function CodePanel({ code, activeLine, visitedLines }) {
  const lines = code.split("\n");
  return (
    <div className="overflow-x-auto rounded-lg border bg-background py-2 font-mono text-sm">
      {lines.map((line, index) => {
        const lineNumber = index + 1;
        const isActive = lineNumber === activeLine;
        const visited = visitedLines.has(lineNumber);
        return (
          <div key={lineNumber} className={`flex items-start ${isActive ? "bg-primary/15" : ""}`}>
            <span
              className={`w-9 shrink-0 pr-2.5 text-right leading-6 select-none ${
                isActive
                  ? "font-medium text-primary"
                  : visited
                    ? "text-muted-foreground/70"
                    : "text-muted-foreground/30"
              }`}
            >
              {lineNumber}
            </span>
            <span
              className={`pr-4 leading-6 whitespace-pre ${
                visited || isActive ? "" : "text-muted-foreground/40"
              }`}
            >
              {line || " "}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ExecutionTrace({ challenge, userCode }) {
  const [source, setSource] = useState("broken");
  const [testIndex, setTestIndex] = useState(0);
  const [trace, setTrace] = useState(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const logRef = useRef(null);

  const testCases = useMemo(() => challenge.test_cases ?? [], [challenge.test_cases]);
  const code = source === "broken" ? challenge.broken_code : userCode;
  const codeLines = useMemo(() => code.split("\n"), [code]);
  // Memoised so the `?? []` fallback doesn't create a new array identity each
  // render, which would invalidate every memo below it.
  const steps = useMemo(() => trace?.steps ?? [], [trace]);

  const described = useMemo(
    () => steps.map((s, i) => ({ step: s, ...describeStep(s, steps[i + 1] ?? null, codeLines) })),
    [steps, codeLines]
  );

  const visitedLines = useMemo(() => new Set(steps.map((s) => s.line)), [steps]);
  const current = steps[step];
  const next = steps[step + 1] ?? null;

  // Keep the selected row in view when stepping with the buttons.
  useEffect(() => {
    logRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [step]);

  async function run(nextSource = source, nextTestIndex = testIndex) {
    setLoading(true);
    setTrace(null);
    setStep(0);
    const result = await traceExecution({
      language: challenge.language,
      code: nextSource === "broken" ? challenge.broken_code : userCode,
      functionName: challenge.function_name,
      input: testCases[nextTestIndex]?.input ?? [],
    });
    setTrace(result);
    setLoading(false);
  }

  const testLabel = useMemo(() => {
    const input = testCases[testIndex]?.input;
    return input
      ? `${challenge.function_name}(${input.map((v) => JSON.stringify(v)).join(", ")})`
      : "";
  }, [testCases, testIndex, challenge.function_name]);

  if (!trace && !loading) {
    return (
      <div className="rounded-lg border bg-background p-4">
        <p className="text-sm font-medium">Watch it run, line by line</p>
        <p className="mt-1 text-sm text-muted-foreground">
          See exactly where the values go wrong — the skill this is really teaching.
        </p>
        <Button size="sm" className="mt-3" onClick={() => run()}>
          <PlayIcon /> Step through the code
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border bg-background p-4">
        <p className="text-sm text-muted-foreground">Loading the Python runtime and tracing…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {[
            { key: "broken", label: "Broken version" },
            { key: "mine", label: "Your fix" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => {
                setSource(option.key);
                run(option.key, testIndex);
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                source === option.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {testCases.length > 1 && (
          <select
            value={testIndex}
            onChange={(e) => {
              setTestIndex(Number(e.target.value));
              run(source, Number(e.target.value));
            }}
            className="rounded-lg border bg-background px-2 py-1 text-xs"
          >
            {testCases.map((tc, i) => (
              <option key={i} value={i}>
                Test {i + 1}
              </option>
            ))}
          </select>
        )}

        {testLabel && <code className="font-mono text-xs text-muted-foreground">{testLabel}</code>}
      </div>

      {trace.error && !steps.some((s) => s.raised) && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {trace.error}
        </p>
      )}

      {steps.length === 0 ? (
        !trace.error && <p className="text-sm text-muted-foreground">No steps were recorded.</p>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <CodePanel code={code} activeLine={current?.line} visitedLines={visitedLines} />

            <div
              ref={logRef}
              className="max-h-[19rem] overflow-y-auto rounded-lg border bg-background"
            >
              <p className="sticky top-0 border-b bg-background px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                What happened
              </p>
              <ol className="text-sm">
                {described.map((entry, index) => {
                  const isActive = index === step;
                  return (
                    <li key={index} data-active={isActive}>
                      <button
                        onClick={() => setStep(index)}
                        className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left transition-colors ${
                          isActive ? "bg-primary/12" : "hover:bg-muted/60"
                        }`}
                      >
                        <span className="w-5 shrink-0 text-right text-xs text-muted-foreground/60 [font-variant-numeric:tabular-nums]">
                          {index + 1}
                        </span>
                        <span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">
                          L{entry.step.line}
                        </span>
                        <span className={`font-mono text-xs ${TONE_CLASS[entry.tone] ?? ""}`}>
                          {entry.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Variables after step {step + 1}
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 font-mono text-sm">
              {Object.entries((next ?? current)?.locals ?? {}).map(([name, value]) => {
                const before = current?.locals?.[name];
                const justChanged =
                  next && JSON.stringify(before) !== JSON.stringify(value);
                return (
                  <span key={name} className="flex items-baseline gap-1.5">
                    <span className="text-muted-foreground">{name}</span>
                    <span className={justChanged ? "font-medium text-primary" : ""}>
                      {short(value)}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Previous step"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ChevronLeftIcon />
            </Button>
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              className="h-1.5 flex-1 accent-[var(--primary)]"
              aria-label="Execution step"
            />
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Next step"
              disabled={step >= steps.length - 1}
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            >
              <ChevronRightIcon />
            </Button>
            <span className="text-xs text-muted-foreground [font-variant-numeric:tabular-nums]">
              {step + 1} / {steps.length}
            </span>
          </div>

          {trace.truncated && (
            <Badge className="border-transparent bg-warning/15 text-warning-foreground dark:text-warning">
              Trace truncated at {steps.length} steps
            </Badge>
          )}
        </>
      )}
    </div>
  );
}
