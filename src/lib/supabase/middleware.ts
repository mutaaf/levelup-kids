import {
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public-path allowlist for the Supabase-session middleware.
//
// AGENTS.md non-negotiable #2 (privacy) lives at the schema layer; this is
// the URL layer. Any request whose pathname is NOT in this allowlist must
// be backed by a Supabase session, or it 302s to /auth/signin?next=…
//
// Ordering doesn't matter (we match exactly). Keep this set deliberately
// short — every additional entry is a hole in the wall.
export const PUBLIC_PATHS = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/callback",
  "/privacy",
  "/terms",
] as const;

const PUBLIC_PATH_SET: ReadonlySet<string> = new Set(PUBLIC_PATHS);

/** True when `pathname` (with or without a trailing slash) is one of the
 *  documented public routes. */
export function isPublicPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return PUBLIC_PATH_SET.has(normalized);
}

export type RedirectDecision =
  | { kind: "pass" }
  | { kind: "redirect"; location: string };

/** Pure decision helper — extracted from the Next middleware so it can be
 *  unit-tested without spinning up a request object. */
export function redirectForPath(args: {
  pathname: string;
  search?: string;
  isAuthenticated: boolean;
}): RedirectDecision {
  if (isPublicPath(args.pathname)) return { kind: "pass" };
  if (args.isAuthenticated) return { kind: "pass" };
  const target = `${args.pathname}${args.search ?? ""}`;
  const next = encodeURIComponent(target);
  return { kind: "redirect", location: `/auth/signin?next=${next}` };
}

/** Builds an `@supabase/ssr` server client bound to the NextRequest's
 *  cookies. Adapted from the Supabase Next.js App Router quickstart. */
function makeSupabase(
  request: NextRequest,
  response: NextResponse,
): ReturnType<typeof createServerClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "middleware.makeSupabase: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }
  const cookies: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll().map((c) => ({
        name: c.name,
        value: c.value,
      }));
    },
    setAll(cookiesToSet) {
      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set({ name, value, ...options });
      }
    },
  };
  return createServerClient(url, anonKey, { cookies });
}

/** The Next.js middleware entrypoint — re-exported from src/middleware.ts.
 *  Returns a NextResponse that either passes through (with possibly-refreshed
 *  cookies) or redirects to /auth/signin?next=<requested>. */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  // Default response: pass through. The Supabase client may attach refreshed
  // cookies onto this response below.
  let response = NextResponse.next({ request });
  const supabase = makeSupabase(request, response);

  // Side effect: refresh the session and detect the authenticated user.
  // We deliberately use getUser() (not getSession()) because getSession()
  // returns a cookie-read with no verification, whereas getUser() round-trips
  // to the GoTrue server and validates the JWT — the right answer for any
  // gating decision.
  const { data } = await supabase.auth.getUser();
  const isAuthenticated = !!data.user;

  const decision = redirectForPath({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated,
  });

  if (decision.kind === "redirect") {
    const url = request.nextUrl.clone();
    const [path = "/", query] = decision.location.split("?");
    url.pathname = path;
    url.search = query ? `?${query}` : "";
    const redirect = NextResponse.redirect(url);
    // Carry forward any cookies the Supabase client set on `response`.
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    response = redirect;
  }

  return response;
}
