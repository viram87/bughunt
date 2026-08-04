"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChallengeCard } from "@/components/challenge-card";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/lib/challenge-search";

/**
 * The challenge list, loading more as the reader reaches the bottom.
 *
 * The server renders the first page so the list is in the initial HTML — good
 * for crawlers and for anyone on a slow connection — and this component takes
 * over from there.
 *
 * Solved/tried state arrives once, as the complete set of the user's attempts,
 * rather than being re-fetched per page. The attempts table is small (one row
 * per challenge the user has touched) and this keeps loading a page down to a
 * single request.
 */
export function ChallengeGrid({ initialChallenges, total, filters, solvedIds, triedIds }) {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sentinelRef = useRef(null);

  const solved = new Set(solvedIds);
  const tried = new Set(triedIds);
  const hasMore = challenges.length < total;

  // Note: when the filters change, the page gives this component a new `key`
  // so React remounts it with the fresh first page. That is why there is no
  // effect here syncing state back from props — remounting does it, and
  // without the cascading render that syncing would cause.

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(challenges.length),
    });
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }

    try {
      const res = await fetch(`/api/bug-challenges?${params}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = await res.json();
      setChallenges((prev) => {
        // Guard against a duplicate load appending the same rows twice.
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...(body.data ?? []).filter((c) => !seen.has(c.id))];
      });
    } catch (err) {
      setError(err.message ?? "Could not load more challenges");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, challenges.length, filters]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    // rootMargin starts the fetch before the sentinel is actually visible, so
    // the next page is usually there by the time the reader arrives.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            status={solved.has(challenge.id) ? "solved" : tried.has(challenge.id) ? "tried" : null}
          />
        ))}
      </div>

      {/* Skeletons occupy the space the incoming cards will fill, so the page
          doesn't jump when they arrive. */}
      {loading && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      )}

      {error && (
        <div className="mt-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={loadMore}>
            Try again
          </Button>
        </div>
      )}

      {/* An explicit button as well as the observer: it is the keyboard- and
          screen-reader-accessible path, and the fallback if IntersectionObserver
          never fires (some in-app browsers). */}
      {hasMore && !loading && !error && (
        <div ref={sentinelRef} className="mt-8 flex justify-center">
          <Button variant="outline" onClick={loadMore}>
            Load more challenges
          </Button>
        </div>
      )}

      {!hasMore && challenges.length > PAGE_SIZE && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          That&rsquo;s all {total} of them.
        </p>
      )}
    </>
  );
}
