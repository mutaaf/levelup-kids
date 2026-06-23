import {
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
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

/**
 * Read the current user from the session cookie WITHOUT triggering a token
 * refresh.
 *
 * This is the ONLY safe way to read the user from a page server component or
 * a server action / route handler that ISN'T going to write the refreshed
 * cookies back to a Response.
 *
 * Background: supabase.auth.getUser() may refresh the access token. The
 * refresh ROTATES the refresh token at Supabase's server. If we can't
 * persist the new tokens to cookies (server components can't write cookies;
 * route handlers using cookies() from next/headers don't reliably propagate
 * to fresh NextResponse instances), the browser keeps the OLD refresh token
 * — which Supabase now considers used. The NEXT navigation looks logged
 * out.
 *
 * getSession() reads from the cookie store directly. No API call, no
 * refresh. Middleware (which CAN write cookies) handles validation and
 * refresh once per request — pages and actions trust that.
 */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

