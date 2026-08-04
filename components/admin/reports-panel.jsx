"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { REPORT_REASONS } from "@/lib/constants";

const reasonLabel = (value) =>
  REPORT_REASONS.find((r) => r.value === value)?.label ?? value;

/**
 * Open reports, with a way to close them out.
 *
 * Optimistic: a report disappears from the list as soon as it's actioned,
 * and comes back if the request fails. Waiting on a round trip to Supabase
 * before removing a row makes triaging a list feel broken.
 */
export function ReportsPanel({ initialReports, titles }) {
  const [reports, setReports] = useState(initialReports);
  const [error, setError] = useState(null);

  async function setStatus(id, status) {
    const previous = reports;
    setReports((rows) => rows.filter((r) => r.id !== id));
    setError(null);

    try {
      const res = await fetch("/api/challenge-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
    } catch (err) {
      setReports(previous);
      setError(err.message ?? "Could not update the report");
    }
  }

  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">No open reports.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {reports.map((report) => (
        <div key={report.id} className="rounded-lg border p-3">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{reasonLabel(report.reason)}</Badge>
            <Link
              href={`/challenges/${report.bug_challenge_id}`}
              className="text-sm font-medium hover:text-primary hover:underline"
            >
              {titles[report.bug_challenge_id] ?? "Unknown challenge"}
            </Link>
            <span className="text-xs text-muted-foreground">
              {new Date(report.created_at).toLocaleDateString()}
            </span>
          </div>

          {report.details && (
            <p className="mb-2 text-sm whitespace-pre-wrap text-muted-foreground">
              {report.details}
            </p>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setStatus(report.id, "resolved")}>
              Fixed
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus(report.id, "dismissed")}>
              Dismiss
            </Button>
            <Button
              size="sm"
              variant="ghost"
              nativeButton={false}
              render={<Link href={`/admin/challenges/${report.bug_challenge_id}`}>Edit</Link>}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
