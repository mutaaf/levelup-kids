import {
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Server-side Supabase client using the SERVICE ROLE key. Bypasses RLS — only
// import inside API routes, server actions, scripts, or webhook handlers.
// NEVER import from a client component.
//
// AGENTS.md: "API routes use createServiceSupabase() from
// src/lib/supabase/server.ts (bypasses RLS)."
export function createServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "createServiceSupabase: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Auth-aware server client. Reads/writes cookies via next/headers so the
// Supabase JS client can read the session, exchange a magic-link code, and
// set the refreshed cookies on the response. Use this in Route Handlers and
// Server Actions that need `supabase.auth.*` semantics — never for DB
// reads/writes (use createServiceSupabase() or the client-side query() /
// mutate() helpers instead).
export async function createServerSupabase(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "createServerSupabase: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }
  const store = await cookies();
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return store.getAll().map((c) => ({ name: c.name, value: c.value }));
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          store.set({ name, value, ...options });
        }
      } catch {
        // `cookies().set()` is only callable from a Server Action or Route
        // Handler. When createServerSupabase() is used from a Server
        // Component during render, the set is silently ignored — Supabase
        // will retry the refresh on the next mutating request.
      }
    },
  };
  return createServerClient(url, anonKey, { cookies: cookieMethods });
}
