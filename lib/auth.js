import { createClient } from "@/lib/supabase/server";

// Returns { user, profile } for the signed-in request, or { user: null, profile: null }.
// `profile` is the public.users row (has `role`); use it for role checks in
// Route Handlers. RLS still enforces access at the database layer — this is
// just a convenience for returning clean 401/403 responses.
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}
