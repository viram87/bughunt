"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BookmarkButton({ challengeId, initiallyBookmarked }) {
  const [bookmarked, setBookmarked] = useState(initiallyBookmarked);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !bookmarked;
    setPending(true);
    setBookmarked(next); // optimistic

    try {
      const res = next
        ? await fetch("/api/bookmarks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bug_challenge_id: challengeId }),
          })
        : await fetch(`/api/bookmarks?bug_challenge_id=${challengeId}`, { method: "DELETE" });

      if (!res.ok) setBookmarked(!next); // roll back on failure
    } catch {
      setBookmarked(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
      {bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
    </Button>
  );
}
