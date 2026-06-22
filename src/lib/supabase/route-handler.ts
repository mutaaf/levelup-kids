// Route-handler Supabase client.
//
// Bind cookies DIRECTLY to the outgoing NextResponse so session cookies set
// by `exchangeCodeForSession` (and rotated by `getUser`) survive into the
// response that the browser receives. Using `cookies()` from next/headers
// in a Route Handler that returns a fresh NextResponse.redirect drops the
// rotated cookies on Vercel — that was the bug behind "every click logs me
// out" reported 2026-06-22.

import {
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

export type RouteHandlerSupabase = {
  supabase: SupabaseClient;
  /**
   * Carrier response whose cookies hold any rotated auth tokens. Route
   * handlers that need to return a different response (e.g. a redirect)
   * MUST copy cookies from this response onto theirs:
   *
   *   for (const c of carrier.cookies.getAll()) redirect.cookies.set(c);
   */
  carrier: NextResponse;
};

export function createRouteHandlerSupabase(
  request: NextRequest,
): RouteHandlerSupabase {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "createRouteHandlerSupabase: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }

  const carrier = NextResponse.next();

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll().map((c) => ({
        name: c.name,
        value: c.value,
      }));
    },
    setAll(cookiesToSet) {
      for (const { name, value, options } of cookiesToSet) {
        carrier.cookies.set({ name, value, ...options });
      }
    },
  };

  const supabase = createServerClient(url, anonKey, {
    cookies: cookieMethods,
  });
  return { supabase, carrier };
}

/** Copy any session cookies the supabase client rotated onto a different
 *  response (e.g. a redirect). Call right before returning. */
export function carryCookies(
  carrier: NextResponse,
  outgoing: NextResponse,
): NextResponse {
  for (const c of carrier.cookies.getAll()) {
    outgoing.cookies.set(c);
  }
  return outgoing;
}
