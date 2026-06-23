import { NextResponse, type NextRequest } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/debug/whoami
// Diagnostic surface for the recurring "I keep getting logged out" reports.
// Returns:
//   - whether the server sees a valid Supabase session
//   - the user id + email if so
//   - all sb-* cookie NAMES present in the request (values redacted)
//   - the supabase error message if getUser failed
//
// Bypasses middleware's auth gate via the /api/* JSON 401 fallback — but
// this route never returns 401 itself; it explicitly reports the no-user
// state so the user can paste the JSON back for diagnosis.
export async function GET(_request: NextRequest): Promise<Response> {
  const supabase = await createServerSupabase();
  const result = await supabase.auth.getUser();

  const store = await nextCookies();
  const sbCookieNames = store
    .getAll()
    .map((c) => c.name)
    .filter((n) => n.startsWith("sb-"));

  return NextResponse.json({
    sessionValid: !!result.data.user,
    user: result.data.user
      ? {
          id: result.data.user.id,
          email: result.data.user.email ?? null,
        }
      : null,
    error: result.error?.message ?? null,
    sbCookieNames,
    cookieCount: store.getAll().length,
    timestamp: new Date().toISOString(),
  });
}
