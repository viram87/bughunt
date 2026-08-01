"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteChallengeButton({ id, title }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    // Deleting cascades to hints and every student's attempts for this
    // challenge, so confirm before doing it.
    const confirmed = window.confirm(
      `Delete “${title}”?\n\nThis also removes its hints and every student attempt recorded against it. This cannot be undone.`
    );
    if (!confirmed) return;

    setBusy(true);
    const res = await fetch(`/api/bug-challenges/${id}`, { method: "DELETE" });
    setBusy(false);

    if (res.ok) {
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      window.alert(json.error ?? "Delete failed");
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Delete ${title}`}
      onClick={handleDelete}
      disabled={busy}
    >
      <Trash2Icon />
    </Button>
  );
}
