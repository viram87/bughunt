"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// Single-series magnitude comparison across 8 long-named categories, so:
// horizontal meter bars, one hue (a value-ramp across nominal categories
// would double-encode length as color), no legend (one series — the title
// says what's plotted), and a table view twin for accessibility.
//
// Track = challenges available in that category, fill = solved. Showing
// solved alone would make "never tried" and "tried and failed" look
// identical, which is exactly the distinction this view exists to surface.
// The track is a mix of the accent into the surface, so it stays recessive
// against the fill in both themes; being sub-3:1 by design is why the value
// labels and table view below are load-bearing, not optional.

export function CategoryMasteryChart({ categories }) {
  const [showTable, setShowTable] = useState(false);
  const maxTotal = Math.max(1, ...categories.map((c) => c.total));

  return (
    <div className="viz-root">
      {/* Dark styles are scoped to the `.dark` class, matching this project's
          class-based dark mode (see @custom-variant in globals.css) — a
          prefers-color-scheme query here would ignore the theme toggle. */}
      <style>{`
        .viz-root {
          --viz-fill: var(--primary);
          --viz-track: color-mix(in oklab, var(--primary) 28%, var(--card));
          --viz-empty: var(--muted);
        }
        .dark .viz-root {
          --viz-track: color-mix(in oklab, var(--primary) 35%, var(--card));
        }
      `}</style>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Category mastery</h2>
          <p className="text-sm text-muted-foreground">Challenges solved, out of those available in each category.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Show chart" : "Show table"}
        </Button>
      </div>

      {showTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 font-medium">Category</th>
              <th className="py-2 text-right font-medium">Solved</th>
              <th className="py-2 text-right font-medium">Attempted</th>
              <th className="py-2 text-right font-medium">Available</th>
            </tr>
          </thead>
          <tbody className="[font-variant-numeric:tabular-nums]">
            {categories.map((category) => (
              <tr key={category.value} className="border-b last:border-0">
                <td className="py-2">{category.label}</td>
                <td className="py-2 text-right">{category.solved}</td>
                <td className="py-2 text-right">{category.attempted}</td>
                <td className="py-2 text-right">{category.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => {
            const trackPct = (category.total / maxTotal) * 100;
            const fillPct = category.total > 0 ? (category.solved / category.total) * 100 : 0;
            return (
              <div
                key={category.value}
                className="grid grid-cols-[minmax(4rem,9rem)_1fr_3rem] items-center gap-3"
              >
                <span className="truncate text-sm text-muted-foreground" title={category.label}>
                  {category.label}
                </span>
                <div className="h-3">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${trackPct}%`,
                      backgroundColor: category.total > 0 ? "var(--viz-track)" : "var(--viz-empty)",
                    }}
                  >
                    {category.solved > 0 && (
                      <div
                        className="h-full"
                        style={{
                          width: `${fillPct}%`,
                          backgroundColor: "var(--viz-fill)",
                          borderRadius: fillPct >= 100 ? "0.25rem" : "0.25rem 0 0 0.25rem",
                        }}
                      />
                    )}
                  </div>
                </div>
                <span className="text-right text-sm text-muted-foreground [font-variant-numeric:tabular-nums]">
                  {category.solved}/{category.total}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
