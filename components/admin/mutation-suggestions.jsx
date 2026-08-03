"use client";

import { useMemo, useState } from "react";
import { LightbulbIcon } from "lucide-react";
import { suggestMutations } from "@/lib/bug-mutations";
import { BUG_CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// An authoring aid, not a generator. It proposes where a bug could go; the
// author still writes the explanation and hints, which is the part that
// carries the actual learning. Everything here still has to pass the
// "Test this challenge" validation before it can be published.
export function MutationSuggestions({ correctCode, language, onApply }) {
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(
    () => (open ? suggestMutations(correctCode, language) : []),
    [open, correctCode, language]
  );

  const label = (value) => BUG_CATEGORIES.find((c) => c.value === value)?.label ?? value;

  if (!correctCode?.trim()) return null;

  return (
    <div className="rounded-lg border border-dashed p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Need a bug to inject?</p>
          <p className="text-xs text-muted-foreground">
            Suggests where a realistic bug could go, based on your correct code. You still write
            the explanation and hints.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          <LightbulbIcon /> {open ? "Hide" : "Suggest bugs"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No obvious injection points found. That usually means the code has no comparisons,
              conversions or loops to subvert — write the broken version by hand.
            </p>
          ) : (
            suggestions.map((s, i) => (
              <div key={i} className="rounded-md border p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{label(s.category)}</Badge>
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">line {s.line}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => onApply(s)}
                  >
                    Use this
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{s.why}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
