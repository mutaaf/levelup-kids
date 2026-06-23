import { NextResponse, type NextRequest } from "next/server";
import { cookies as nextCookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/debug/whoami
// Diagnostic surface for the recurring "I keep getting logged out" reports.
export async function GET(request: NextRequest): Promise<Response> {
  const supabase = await createServerSupabase();
  const result = await supabase.auth.getUser();

  const store = await nextCookies();
  const allCookies = store.getAll();
  const sbCookieNames = allCookies
    .map((c) => c.name)
    .filter((n) => n.startsWith("sb-"));
  const allCookieNames = allCookies.map((c) => c.name);

  // Cross-check against the raw request cookie header — if they diverge,
  // there's middleware tampering or a Vercel transform happening.
  const rawCookieHeader = request.headers.get("cookie") ?? "";
  const rawCookieNames = rawCookieHeader
    .split(";")
    .map((s) => s.trim().split("=")[0])
    .filter(Boolean);

  return NextResponse.json({
    sessionValid: !!result.data.user,
    user: result.data.user
      ? {
          id: result.data.user.id,
          email: result.data.user.email ?? null,
        }
      : null,
    error: result.error?.message ?? null,
    cookieCount: allCookies.length,
    allCookieNames,
    sbCookieNames,
    rawCookieHeaderNames: rawCookieNames,
    testCookieSeen: allCookieNames.includes("lu-debug-cookie"),
    host: request.headers.get("host"),
    timestamp: new Date().toISOString(),
  });
}
