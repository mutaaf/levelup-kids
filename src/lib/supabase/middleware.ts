import {
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public-path allowlist. Anything else requires a Supabase session, or it
// 302s to /auth/signin?next=…
export const PUBLIC_PATHS = [
  "/",
  "/auth/signin",
  "/auth/signup",
  "/auth/callback",
  "/privacy",
  "/terms",
] as const;

const PUBLIC_PATH_SET: ReadonlySet<string> = new Set(PUBLIC_PATHS);

export function isPublicPath(pathname: string): boolean {
  const normalized =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  if (normalized.startsWith("/display/")) return true;
  // Diagnostic endpoint must reach the SDK even when the session is
  // invalid — so we can report exactly what the server sees.
  if (normalized === "/api/debug/whoami") return true;
  // Post-verifyOtp setup endpoint: cookies are JUST being set; we let
  // the route handler verify the session itself rather than middleware
  // bouncing it before it can even read cookies().
  if (normalized === "/api/auth/ensure-parents") return true;
  // OTP verify is the sign-in entry point itself; it sets the session.
  if (normalized === "/api/auth/verify") return true;
  // Test-cookie diagnostic — no auth required.
  if (normalized === "/api/debug/set-test-cookie") return true;
  return PUBLIC_PATH_SET.has(normalized);
}

export type RedirectDecision =
  | { kind: "pass" }
  | { kind: "redirect"; location: string };

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

/**
 * Refresh the Supabase session on every request, decide whether the path
 * is allowed, redirect to /auth/signin if not.
 *
 * CRITICAL — Supabase canonical Next 15 pattern (corrected 2026-06-22):
 *
 * supabase.auth.getUser() may rotate the access + refresh tokens. The new
 * tokens MUST land in TWO places:
 *
 *   1. The OUTGOING response cookies so the browser persists them.
 *   2. The INCOMING request.cookies so downstream server components in
 *      THIS request see the refreshed values when they call cookies().
 *
 * If step 2 is skipped (what the previous version did), a refresh during
 * middleware rotates the refresh token but server components still see
 * the OLD refresh token via cookies(). The next supabase call there
 * presents an already-used refresh token, Supabase rejects it, and the
 * user appears logged out. That cascade kills sessions on new tabs and
 * route navigations.
 *
 * The cure: inside setAll we also write to request.cookies AND rebuild
 * the response with the updated request so the headers carry forward.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  // Mutable container so the cookie setter can swap the response in place
  // when Supabase rotates a token mid-request.
  const state = { response: NextResponse.next({ request }) };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "middleware: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set",
    );
  }

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll().map((c) => ({
        name: c.name,
        value: c.value,
      }));
    },
    setAll(cookiesToSet) {
      // (1) update the incoming-request cookies so downstream sees them
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }
      // (2) rebuild response with the updated request — this is what
      //     forwards the refreshed cookies into the next handler in the
      //     same request lifecycle.
      state.response = NextResponse.next({ request });
      // (3) write to the outgoing response so the browser persists the
      //     rotated tokens for the next request.
      for (const { name, value, options } of cookiesToSet) {
        state.response.cookies.set({ name, value, ...options });
      }
    },
  };

  const supabase = createServerClient(url, anonKey, { cookies: cookieMethods });

  // Use getUser (not getSession) — it round-trips to GoTrue and validates
  // the JWT, which is what we want for any gating decision. The Supabase
  // SDK explicitly notes that getUser MUST be called between createClient
  // and returning the response, or refresh tokens silently invalidate.
  const userResult = await supabase.auth.getUser();
  const isAuthenticated = !!userResult.data.user;

  // Diagnostic logging — visible in Vercel runtime logs. Helps trace
  // mysterious "I keep getting logged out" reports.
  if (process.env.VERCEL && !isAuthenticated) {
    const sbCookies = request.cookies
      .getAll()
      .map((c) => c.name)
      .filter((n) => n.startsWith("sb-"));
    if (sbCookies.length > 0) {
      console.warn(
        `[mw] sb cookies present but getUser failed on ${request.nextUrl.pathname} — err=${userResult.error?.message ?? "none"} cookies=${sbCookies.join(",")}`,
      );
    }
  }

  const decision = redirectForPath({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated,
  });

  if (decision.kind === "redirect") {
    // For /api/* requests: return JSON 401 instead of a 307 to /auth/signin.
    // A 307 with POST gets followed by fetch as POST to /auth/signin, which
    // has no POST handler and returns 405 — caller sees a baffling
    // "HTTP 405" or "An unexpected response was received from the server".
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const json = NextResponse.json(
        { ok: false, error: "Not signed in. Refresh the page and sign in again." },
        { status: 401 },
      );
      for (const cookie of state.response.cookies.getAll()) {
        json.cookies.set(cookie);
      }
      return json;
    }

    const url = request.nextUrl.clone();
    const [path = "/", query] = decision.location.split("?");
    url.pathname = path;
    url.search = query ? `?${query}` : "";
    const redirect = NextResponse.redirect(url);
    // Carry any cookies that were rotated during getUser onto the redirect.
    for (const cookie of state.response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  return state.response;
}
