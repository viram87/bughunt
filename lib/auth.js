import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// The columns anything in the app actually reads off `profile`. Selecting *
// pulled the email into every page render for no reason; more importantly the
// list is now explicit, so adding a column to public.users can't silently
// widen what the layout ships into the client payload.
const PROFILE_COLUMNS = "id, name, avatar, role, username, profile_public";

/**
 * Returns { user, profile } for the signed-in request, or nulls.
 *
 * Wrapped in React's cache() so it runs ONCE per request even though the root
 * layout and the page both call it. Without this, every navigation made two
 * identical auth round trips plus two identical profile queries —
 * auth.getUser() validates against the Supabase Auth server, so these are real
 * network calls, not local cookie reads. On /challenges that was 4 of the 6
 * sequential round trips spent before any content was fetched.
 *
 * The cache is scoped to a single request, so one user's profile can never
 * leak into another's render.
 *
 * `profile` is the public.users row (has `role`); use it for role checks in
 * Route Handlers. RLS still enforces access at the database layer — this is
 * just a convenience for returning clean 401/403 responses.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("users")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();

  return { user, profile };
});
