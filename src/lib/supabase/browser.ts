import { createBrowserClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Browser-side Supabase client. The ONLY sanctioned usage is `supabase.auth.*`
// (sign-in, sign-out, session). All DB reads/writes from client code must go
// through query()/mutate() in src/lib/api.ts (ticket TBD) — never call .from()
// directly. This boundary is enforced by review.
export function createBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "createBrowserSupabase: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }

  return createBrowserClient(url, anonKey);
}

// Re-exported for callers that need to extend the cookie behavior in v1.1.
export type { CookieOptions };
