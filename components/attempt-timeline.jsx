"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Same ssr:false guard Monaco needs everywhere else in the app.
const DiffEditor = dynamic(() => import("@monaco-editor/react").then((m) => m.DiffEditor), {
  ssr: false,
});

function formatDuration(seconds) {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttemptTimeline({ attempts, language, brokenCode }) {
  const [openId, setOpenId] = useState(null);

  const passed = attempts.filter((a) => a.status === "passed").length;
  const failed = attempts.length - passed;
  const firstPass = attempts.find((a) => a.status === "passed");
  const totalSeconds = attempts.reduce((sum, a) => sum + (a.time_taken_seconds ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Attempts", value: attempts.length },
          { label: "Failed", value: failed },
          { label: "Hints used", value: firstPass?.hints_used ?? Math.max(...attempts.map((a) => a.hints_used ?? 0), 0) },
          { label: "Longest run", value: formatDuration(Math.max(...attempts.map((a) => a.time_taken_seconds ?? 0), 0)) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-1 text-sm font-medium">Your attempts, in order</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Each entry shows what changed from the previous submission — so you can see which edit
          actually fixed it.
        </p>

        <ol className="relative space-y-3 border-l border-border/70 pl-6">
          {attempts.map((attempt, index) => {
            // Diff against the previous submission, or against the original
            // broken code for the very first attempt.
            const previous = index === 0 ? brokenCode : attempts[index - 1].submitted_code;
            const isOpen = openId === attempt.id;
            const isPass = attempt.status === "passed";

            return (
              <li key={attempt.id} className="relative">
                <span
                  className={`absolute -left-[1.9rem] top-3.5 flex size-5 items-center justify-center rounded-full ${
                    isPass ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPass ? <CheckIcon className="size-3" /> : <XIcon className="size-3" />}
                </span>

                <div className="rounded-xl border bg-card">
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <span className="text-sm font-medium">Attempt {attempt.attempt_number}</span>
                    <Badge
                      className={
                        isPass
                          ? "border-transparent bg-success/12 text-success"
                          : "border-transparent bg-muted text-muted-foreground"
                      }
                    >
                      {isPass ? "Passed" : "Failed"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(attempt.attempted_at)} · {formatDuration(attempt.time_taken_seconds)}
                      {attempt.hints_used > 0 && ` · ${attempt.hints_used} hint${attempt.hints_used > 1 ? "s" : ""}`}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() => setOpenId(isOpen ? null : attempt.id)}
                    >
                      {isOpen ? "Hide changes" : "What changed"}
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="border-t">
                      <DiffEditor
                        height="260px"
                        language={language}
                        original={previous ?? ""}
                        modified={attempt.submitted_code ?? ""}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          renderSideBySide: false,
                          minimap: { enabled: false },
                          fontSize: 13,
                          scrollBeyondLastLine: false,
                        }}
                      />
                      <p className="border-t px-4 py-2 text-xs text-muted-foreground">
                        Compared against {index === 0 ? "the original broken code" : `attempt ${attempts[index - 1].attempt_number}`}
                      </p>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {attempts.length > 1 && (
        <p className="text-sm text-muted-foreground">
          You spent {formatDuration(totalSeconds)} across {attempts.length} runs on this one.
          {failed > 0 &&
            ` The ${failed} failed ${failed === 1 ? "attempt" : "attempts"} are the interesting part — that's where the actual debugging happened.`}
        </p>
      )}
    </div>
  );
}
