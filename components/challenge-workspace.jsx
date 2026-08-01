"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { runChallenge } from "@/lib/code-runner";
import { BUG_CATEGORIES, DIFFICULTIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookmarkButton } from "@/components/bookmark-button";

// Monaco touches `window` at import time, so it can only ever run in the
// browser — loading it as a Server Component would break the build.
const Editor = dynamic(() => import("@monaco-editor/react").then((m) => m.Editor), { ssr: false });
const DiffEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.DiffEditor), { ssr: false });

const FAILURES_BEFORE_AUTO_HINT = 3;

function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ResultRow({ result, index }) {
  let label = "Passed";
  let tone = "text-success";
  if (result.skipped) {
    label = "Skipped";
    tone = "text-muted-foreground";
  } else if (result.timedOut) {
    label = "Timed out — possible infinite loop";
    tone = "text-destructive";
  } else if (result.error) {
    label = `Error: ${result.error}`;
    tone = "text-destructive";
  } else if (!result.passed) {
    label = "Failed";
    tone = "text-destructive";
  }

  return (
    <div className="rounded-md border p-3 text-sm">
      <p className={tone}>
        Test {index + 1}: {label}
      </p>
      {!result.skipped && !result.timedOut && !result.error && (
        <p className="mt-1 text-muted-foreground">
          expected <code>{JSON.stringify(result.expected)}</code> · got <code>{JSON.stringify(result.actual)}</code>
        </p>
      )}
    </div>
  );
}

export function ChallengeWorkspace({ challenge, isLoggedIn, priorAttempts, isBookmarked }) {
  const lastPassedAttempt = useMemo(
    () => [...priorAttempts].reverse().find((a) => a.status === "passed"),
    [priorAttempts]
  );

  const [code, setCode] = useState(challenge.broken_code);
  const [results, setResults] = useState(null);
  const [runnerStatus, setRunnerStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [hintsUnlocked, setHintsUnlocked] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [solved, setSolved] = useState(Boolean(lastPassedAttempt));
  const [solutionData, setSolutionData] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  // Frozen snapshot of whatever was actually tested, so the diff view
  // doesn't shift under you as you keep editing after passing — starts
  // from your last passing submission if you're reopening a solved
  // challenge, not the live editor content.
  const [submittedCode, setSubmittedCode] = useState(lastPassedAttempt?.submitted_code ?? challenge.broken_code);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Covers reopening an already-solved challenge in a new session: `solved`
  // is initialized from attempt history, but that doesn't by itself fetch
  // the solution — only a fresh passing Run & Check did, until now.
  useEffect(() => {
    if (solved && isLoggedIn && !solutionData) {
      fetchSolution();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, isLoggedIn]);

  const sortedHints = useMemo(
    () => [...(challenge.hints ?? [])].sort((a, b) => a.hint_order - b.hint_order),
    [challenge.hints]
  );

  async function fetchSolution() {
    const res = await fetch(`/api/bug-challenges/${challenge.id}/solution`);
    if (res.ok) {
      const { data } = await res.json();
      setSolutionData(data);
    }
  }

  async function handleRunAndCheck() {
    const codeAtSubmission = code;

    setSubmitting(true);
    setResults(null);
    setRunnerStatus("loading-runtime");
    setSubmittedCode(codeAtSubmission);

    const { results: testResults } = await runChallenge({
      language: challenge.language,
      code: codeAtSubmission,
      functionName: challenge.function_name,
      testCases: challenge.test_cases,
      onStatus: setRunnerStatus,
    });

    setResults(testResults);
    setRunnerStatus(null);
    setSubmitting(false);

    const allPassed = testResults.length > 0 && testResults.every((r) => r.passed);

    if (allPassed) {
      setConsecutiveFailures(0);
    } else {
      const nextFailures = consecutiveFailures + 1;
      setConsecutiveFailures(nextFailures);
      if (nextFailures >= FAILURES_BEFORE_AUTO_HINT) {
        setHintsUnlocked((h) => Math.max(h, 1));
      }
    }

    if (isLoggedIn) {
      try {
        await fetch("/api/user-attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bug_challenge_id: challenge.id,
            submitted_code: codeAtSubmission,
            status: allPassed ? "passed" : "failed",
            hints_used: hintsUnlocked,
            time_taken_seconds: elapsedSeconds,
          }),
        });
      } catch {
        // Attempt tracking is best-effort — don't block the student's flow on it.
      }
    }

    if (allPassed) {
      setSolved(true);
      if (isLoggedIn) fetchSolution();
    }
  }

  function unlockHint(order) {
    setHintsUnlocked((h) => Math.max(h, order));
  }

  const categoryLabel = BUG_CATEGORIES.find((c) => c.value === challenge.bug_category)?.label ?? challenge.bug_category;
  const difficultyLabel = DIFFICULTIES.find((d) => d.value === challenge.difficulty)?.label ?? challenge.difficulty;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline">{challenge.language}</Badge>
            <Badge variant="outline">{categoryLabel}</Badge>
            <Badge>{difficultyLabel}</Badge>
            {solved && <Badge variant="secondary">Solved</Badge>}
          </div>
          <h1 className="text-2xl font-semibold">{challenge.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn && (
            <BookmarkButton challengeId={challenge.id} initiallyBookmarked={isBookmarked} />
          )}
          <p className="text-sm text-muted-foreground">Time: {formatElapsed(elapsedSeconds)}</p>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">What it should do</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{challenge.problem_description}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">What goes wrong</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{challenge.symptom_description}</CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <Editor
            height="360px"
            language={challenge.language}
            value={code}
            onChange={(value) => setCode(value ?? "")}
            theme="vs-dark"
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </CardContent>
      </Card>

      <div className="mb-6 flex items-center gap-3">
        <Button onClick={handleRunAndCheck} disabled={submitting}>
          {runnerStatus === "loading-runtime"
            ? "Loading runtime…"
            : runnerStatus === "running"
            ? "Running…"
            : "Run & Check"}
        </Button>
        {!isLoggedIn && <p className="text-sm text-muted-foreground">Log in to save your progress.</p>}
      </div>

      {results && (
        <div className="mb-6 space-y-2">
          {results.map((result, index) => (
            <ResultRow key={index} result={result} index={index} />
          ))}
        </div>
      )}

      {solved && (
        <Card className="mb-6 bg-success/5 ring-success/40">
          <CardHeader>
            <CardTitle className="text-success">All tests passed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {solutionData ? (
              <>
                <p>{solutionData.explanation}</p>
                <Button variant="outline" size="sm" onClick={() => setShowDiff((v) => !v)}>
                  {showDiff ? "Hide" : "Show"} diff vs. reference solution
                </Button>
                {showDiff && (
                  <div className="overflow-hidden rounded-md border">
                    <DiffEditor
                      height="300px"
                      language={challenge.language}
                      original={submittedCode}
                      modified={solutionData.correct_code}
                      theme="vs-dark"
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13 }}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Log in to see the explanation and reference solution.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedHints.map((hint) => {
            const unlocked = hint.hint_order <= hintsUnlocked;
            const canUnlock = hint.hint_order === hintsUnlocked + 1;
            return (
              <div key={hint.id} className="text-sm">
                {unlocked ? (
                  <p>
                    <strong>Hint {hint.hint_order}:</strong> {hint.hint_text}
                  </p>
                ) : (
                  <Button size="sm" variant="outline" disabled={!canUnlock} onClick={() => unlockHint(hint.hint_order)}>
                    Show hint {hint.hint_order}
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </main>
  );
}
