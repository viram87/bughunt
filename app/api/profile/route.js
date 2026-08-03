import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

// Reserved so a profile can never shadow an existing route.
const RESERVED = new Set([
  "admin",
  "api",
  "auth",
  "challenges",
  "dashboard",
  "dev",
  "login",
  "signup",
  "u",
  "sitemap",
  "robots",
  "about",
  "settings",
  "profile",
  "me",
  "new",
  "null",
  "undefined",
]);

export async function PATCH(request) {
  const { user } = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const updates = {};

  if (body.username !== undefined) {
    const username = String(body.username ?? "").trim().toLowerCase();

    if (username === "") {
      // Clearing the username also takes the profile private, since a
      // public profile with no handle has no URL to live at.
      updates.username = null;
      updates.profile_public = false;
    } else {
      if (!USERNAME_RE.test(username)) {
        return NextResponse.json(
          { error: "Use 3-30 characters: lowercase letters, numbers, hyphens or underscores." },
          { status: 400 }
        );
      }
      if (RESERVED.has(username)) {
        return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
      }
      updates.username = username;
    }
  }

  if (body.profile_public !== undefined) {
    updates.profile_public = Boolean(body.profile_public);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // A profile can't be public without a handle to reach it by.
  if (updates.profile_public === true && updates.username === undefined) {
    const { data: existing } = await createClient().then((c) =>
      c.from("users").select("username").eq("id", user.id).single()
    );
    if (!existing?.username) {
      return NextResponse.json(
        { error: "Choose a username before making your profile public." },
        { status: 400 }
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id)
    .select("username, profile_public")
    .single();

  if (error) {
    // 23505 is unique_violation — the friendliest and most likely failure.
    if (error.code === "23505") {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
