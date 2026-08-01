import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Refreshes the auth session cookie on every request so Server Components
// always see a valid (non-expired) session. Must run before any code that
// reads the user's session.
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not remove: this call refreshes the session and must not be skipped.
  await supabase.auth.getUser();

  return supabaseResponse;
}
