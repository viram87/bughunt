"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  PlayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react";
import { traceScript } from "@/lib/code-runner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.Editor), { ssr: false });

const SAMPLE = `# Paste your own code, or step through this one.
def running_total(numbers):
    total = 0
    for n in numbers:
        total = total + n
    return total

values = [3, 1, 4]
answer = running_total(values)
print("answer is", answer)
`;

/**
 * Step through Python line by line, with every variable at every step.
 *
 * The central design problem: a `line` trace event fires BEFORE that line
 * executes, so the highlighted line has not run yet and the variables shown
 * are the state going into it. A single highlight reads as "this just ran",
 * which makes every value look one step stale and is genuinely confusing.
 *
 * Solved the way Python Tutor solves it — two markers. Green marks the line
 * that just finished, red marks the line about to run, and the variable panel
 * says explicitly which moment it is describing.
 */
export function Visualizer() {
  const [code, setCode] = useState(SAMPLE);
  const [stdin, setStdin] = useState("");
  const [steps, setSteps] = useState(null);
  const [inputs, setInputs] = useState([]);
  const [stdout, setStdout] = useState("");
  const [error, setError] = useState(null);
  const [truncated, setTruncated] = useState(false);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | running
  // What the displayed results were actually produced from. If the editor or
  // the input box has moved on since, the results below are stale and saying
  // so is the difference between "confusing" and "obvious".
  const [ranWith, setRanWith] = useState(null);

  const current = steps?.[index] ?? null;
  const previous = steps && index > 0 ? steps[index - 1] : null;

  const lines = useMemo(() => code.split("\n"), [code]);

  // The line about to run, and the one that just finished.
  const nextLine = current?.line ?? null;
  const justRanLine = previous?.line ?? null;

  async function run() {
    setStatus("running");
    setError(null);
    setSteps(null);
    setStdout("");
    setTruncated(false);

    const result = await traceScript({ language: "python", code, stdin });

    if (!result.supported) {
      setError("This language isn't supported yet.");
      setStatus("idle");
      return;
    }

    setSteps(result.steps ?? []);
    setInputs(result.inputs ?? []);
    setStdout(result.stdout ?? "");
    setTruncated(Boolean(result.truncated));
    setError(result.timedOut ? "Timed out — the code ran too long." : result.error ?? null);
    setIndex(0);
    setRanWith({ code, stdin });
    setStatus("idle");
  }

  const total = steps?.length ?? 0;
  const go = useCallback(
    (n) => setIndex((i) => Math.min(Math.max(0, n instanceof Function ? n(i) : n), Math.max(0, total - 1))),
    [total]
  );

  // Arrow keys are how anyone actually scrubs a stepper once they get going.
  useEffect(() => {
    if (!steps?.length) return;
    function onKey(e) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go((i) => i + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go((i) => i - 1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [steps, go]);

  // Only what changed on this step, so one moved value isn't buried in scope.
  const changed = useMemo(() => {
    if (!current) return new Set();
    const before = previous?.locals ?? {};
    return new Set(
      Object.keys(current.locals ?? {}).filter(
        (k) => JSON.stringify(before[k]) !== JSON.stringify(current.locals[k])
      )
    );
  }, [current, previous]);

  const stack = current?.stack ?? [];
  const stale =
    Boolean(steps) && ranWith !== null && (ranWith.code !== code || ranWith.stdin !== stdin);

  // The input() call that happened on this exact step, if any. Showing it here
  // rather than only in the box above is what makes the read visible at the
  // moment the program actually asked for it.
  const readHere = useMemo(
    () => inputs.filter((r) => r.step === index),
    [inputs, index]
  );

  // Shown only when the code actually reads from input(), so it isn't an
  // unexplained empty box for the majority of scripts that don't.
  const needsStdin = /(^|[^.\w])input\s*\(/.test(code);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={run} disabled={status !== "idle"} size="lg">
          <PlayIcon /> {status === "running" ? "Running…" : "Visualize execution"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Runs in your browser. Nothing is uploaded.
        </p>
      </div>

      {needsStdin && (
        <div className="rounded-xl border p-4">
          <label htmlFor="stdin" className="text-sm font-medium">
            Input for your program
          </label>
          <p className="mt-1 mb-2 text-sm text-muted-foreground">
            Your code calls <code>input()</code>, and there is no keyboard here. Put one answer per
            line — they are handed over in order. When they run out, Python raises{" "}
            <code>EOFError</code>, exactly as it would if you pressed Ctrl-D.
          </p>
          <textarea
            id="stdin"
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={3}
            placeholder={"hello\nexit"}
            className="w-full rounded-lg border bg-background p-2 font-mono text-sm"
          />
        </div>
      )}

      {stale && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
          <p className="text-sm">
            You changed the {ranWith.stdin !== stdin ? "input" : "code"} — the results below are
            from the previous run.
          </p>
          <Button size="sm" onClick={run} disabled={status !== "idle"}>
            Run again
          </Button>
        </div>
      )}

      {status === "running" && !steps && (
        <p className="text-sm text-muted-foreground">
          Starting Python… the first run downloads the runtime, then it&rsquo;s instant.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editing view, before a run. Once there are steps the annotated
            read-only view below is the useful one. */}
        <div className="overflow-hidden rounded-xl border">
          {steps && steps.length > 0 && current ? (
            <div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b bg-muted/40 px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-success" />
                  just ran
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-full bg-primary" />
                  about to run
                </span>
              </div>
              <pre className="overflow-x-auto py-2 text-sm leading-relaxed">
                {lines.map((line, i) => {
                  const n = i + 1;
                  const isNext = n === nextLine;
                  const isJustRan = n === justRanLine && n !== nextLine;
                  return (
                    <div
                      key={i}
                      className={`flex min-w-max px-2 ${
                        isNext ? "bg-primary/12" : isJustRan ? "bg-success/12" : ""
                      }`}
                    >
                      <span className="w-4 shrink-0 select-none text-center">
                        {isNext ? "→" : isJustRan ? "✓" : " "}
                      </span>
                      <span className="w-8 shrink-0 select-none text-right text-muted-foreground">
                        {n}
                      </span>
                      <code className="whitespace-pre pl-4">{line || " "}</code>
                    </div>
                  );
                })}
              </pre>
            </div>
          ) : (
            <Editor
              height="420px"
              language="python"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
            />
          )}
        </div>

        <div className="rounded-xl border p-4">
          {!steps && status === "idle" && (
            <p className="text-sm text-muted-foreground">
              Press <strong>Visualize execution</strong> to watch this run one line at a time, with
              every variable at every step.
            </p>
          )}

          {steps && steps.length > 0 && current && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => go(0)} disabled={index === 0}>
                  <ChevronsLeftIcon />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => go((i) => i - 1)}
                  disabled={index === 0}
                >
                  <ChevronLeftIcon /> Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => go((i) => i + 1)}
                  disabled={index >= total - 1}
                >
                  Next <ChevronRightIcon />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => go(total - 1)}
                  disabled={index >= total - 1}
                >
                  <ChevronsRightIcon />
                </Button>
                <span className="ml-auto text-sm text-muted-foreground">
                  {index + 1} / {total}
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(0, total - 1)}
                value={index}
                onChange={(e) => go(Number(e.target.value))}
                className="mb-1 w-full accent-[var(--primary)]"
                aria-label="Step through execution"
              />
              <p className="mb-4 text-xs text-muted-foreground">
                Use ← and → to step.
              </p>

              {/* Says plainly which moment the values describe. Without this the
                  numbers look one step behind. */}
              <p className="mb-2 text-sm font-medium">
                {current.final ? (
                  "Finished — final values"
                ) : (
                  <>
                    About to run <span className="text-primary">line {current.line}</span>
                    {" — values right now"}
                  </>
                )}
              </p>

              {stack.length > 1 && (
                <p className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {stack
                    .slice()
                    .reverse()
                    .map((name, i, arr) => (
                      <span key={i} className="flex items-center gap-1">
                        <Badge variant="outline" className={i === arr.length - 1 ? "text-primary" : ""}>
                          {name === "<module>" ? "main" : `${name}()`}
                        </Badge>
                        {i < arr.length - 1 && <span>›</span>}
                      </span>
                    ))}
                </p>
              )}

              <div className="space-y-1">
                {Object.keys(current.locals ?? {}).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No variables yet.</p>
                ) : (
                  Object.entries(current.locals).map(([name, value]) => (
                    <div
                      key={name}
                      className={`flex items-baseline gap-2 rounded px-2 py-1 font-mono text-sm ${
                        changed.has(name) ? "bg-primary/12" : ""
                      }`}
                    >
                      <span>{name}</span>
                      <span className="text-muted-foreground">=</span>
                      <span className="break-all text-muted-foreground">
                        {JSON.stringify(value)}
                      </span>
                      {changed.has(name) && (
                        <span className="ml-auto shrink-0 text-xs text-primary">changed</span>
                      )}
                    </div>
                  ))
                )}
              </div>

              {readHere.length > 0 && (
                <div className="mt-3 space-y-1">
                  {readHere.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-md bg-success/10 px-2 py-1.5 font-mono text-sm"
                    >
                      <span className="text-muted-foreground">{r.prompt || "input()"}</span>{" "}
                      <span className="text-success">{JSON.stringify(r.value)}</span>
                      <span className="ml-2 font-sans text-xs text-muted-foreground">
                        read from your input
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {current.raised && (
                <p className="mt-3 rounded-md bg-destructive/10 px-2 py-1 font-mono text-sm text-destructive">
                  raised {current.raised}
                </p>
              )}
            </>
          )}

          {steps && steps.length === 0 && !error && (
            <p className="text-sm text-muted-foreground">
              Nothing to step through — the code produced no executable lines.
            </p>
          )}
        </div>
      </div>

      {steps && steps.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSteps(null);
            setIndex(0);
          }}
        >
          Edit the code
        </Button>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="font-mono text-sm text-destructive">{error}</p>
          {error.includes("EOFError") && (
            <p className="mt-2 text-sm text-muted-foreground">
              Your code asked for more input than you supplied. Add another line to the input box
              above and run it again.
            </p>
          )}
        </div>
      )}

      {truncated && (
        <p className="text-sm text-muted-foreground">
          Stopped after 5,000 steps — the code was still running. If that wasn&rsquo;t expected, you
          may have an infinite loop.{" "}
          <Link href="/bugs/infinite-loops" className="text-primary underline underline-offset-2">
            What causes those
          </Link>
          .
        </p>
      )}

      {stdout && (
        <div className="rounded-xl border">
          <p className="border-b px-4 py-2 text-sm font-medium">Output</p>
          <pre className="overflow-x-auto px-4 py-3 font-mono text-sm">{stdout}</pre>
        </div>
      )}
    </div>
  );
}
