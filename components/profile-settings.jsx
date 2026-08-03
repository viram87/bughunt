"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SITE_URL } from "@/lib/site";

export function ProfileSettings({ initialUsername, initialPublic }) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername ?? "");
  const [isPublic, setIsPublic] = useState(Boolean(initialPublic));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function save(next) {
    setSaving(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const json = await res.json();

    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save");
      // Roll the toggle back so the UI never claims a state the server rejected.
      if (next.profile_public !== undefined) setIsPublic(!next.profile_public);
      return;
    }

    setUsername(json.data.username ?? "");
    setIsPublic(Boolean(json.data.profile_public));
    setSaved(true);
    router.refresh();
  }

  const profileUrl = `${SITE_URL.replace(/^https?:\/\//, "")}/u/${username}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Public profile</CardTitle>
        <p className="text-sm text-muted-foreground">
          A shareable page showing what you&apos;ve solved — useful on a CV or LinkedIn. Off by
          default.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="username"
              value={username}
              placeholder="your-handle"
              className="max-w-xs font-mono"
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
            />
            <Button
              variant="outline"
              disabled={saving || username === (initialUsername ?? "")}
              onClick={() => save({ username })}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            3-30 characters: lowercase letters, numbers, hyphens or underscores.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <input
            id="profile_public"
            type="checkbox"
            checked={isPublic}
            className="mt-1 size-4 accent-[var(--primary)]"
            onChange={(e) => {
              setIsPublic(e.target.checked);
              save({ profile_public: e.target.checked });
            }}
          />
          <div>
            <Label htmlFor="profile_public" className="font-medium">
              Make my profile public
            </Label>
            <p className="text-xs text-muted-foreground">
              Shows your username, solved counts and badges. Never your email, your code, or which
              challenges you failed.
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && !error && <p className="text-sm text-success">Saved.</p>}

        {isPublic && username && (
          <p className="text-sm">
            Live at{" "}
            <Link href={`/u/${username}`} className="font-medium text-primary hover:underline">
              {profileUrl}
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
