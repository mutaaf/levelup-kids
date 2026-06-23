import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/debug/set-test-cookie
// Sets a plain test cookie with the same options Supabase uses, then
// returns JSON with a link to /api/debug/whoami so the user can see
// whether the cookie persisted across requests.
//
// If `testCookieSeen` comes back true on whoami → cookies work; the
// Supabase format is what's breaking.
// If `testCookieSeen` comes back false → the browser/network is rejecting
// or stripping cookies entirely (ITP, edge cache, etc.).
export async function GET(request: NextRequest): Promise<Response> {
  const value = `set-at-${Date.now()}`;
  const response = NextResponse.json({
    ok: true,
    set: {
      name: "lu-debug-cookie",
      value,
      options: {
        path: "/",
        sameSite: "lax",
        secure: true,
        httpOnly: true,
        maxAge: 60 * 60,
      },
    },
    nextStep: `Open /api/debug/whoami in the SAME browser tab to see if the cookie persisted.`,
    requestSawCookies: request.cookies.getAll().map((c) => c.name),
  });
  response.cookies.set({
    name: "lu-debug-cookie",
    value,
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: true,
    maxAge: 60 * 60,
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
