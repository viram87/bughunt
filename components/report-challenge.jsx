"use client";

import { useState } from "react";
import { FlagIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { REPORT_REASONS } from "@/lib/constants";

/**
 * "Report a problem" on a challenge.
 *
 * Deliberately open to logged-out readers: the person most likely to be
 * confused by an explanation is a first-time visitor, and making them sign up
 * first would lose exactly the feedback worth having.
 *
 * An inline panel rather than a modal — there's no dialog primitive in the UI
 * kit, and a modal would be heavier than this needs to be.
 */
export function ReportChallenge({ challengeId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [details, setDetails] = useState("");
  const [state, setState] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState(null);

  async function submit(event) {
    event.preventDefault();
    setState("sending");
    setError(null);

    try {
      const res = await fetch("/api/challenge-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bug_challenge_id: challengeId, reason, details }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      setState("sent");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <p className="flex items-center gap-2 text-sm text-success">
        <CheckIcon className="size-4" /> Thanks — it is saved for review.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <FlagIcon /> Report a problem
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-lg border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="report-reason">What&apos;s wrong?</Label>
        <select
          id="report-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-9 w-full rounded-lg border bg-background px-2 text-sm"
        >
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-details">Anything else? (optional)</Label>
        <textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
          rows={3}
          placeholder="What did you expect, and what happened instead?"
          className="w-full rounded-lg border bg-background p-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send report"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
