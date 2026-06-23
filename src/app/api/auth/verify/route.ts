import {
  createServerClient,
  type CookieMethodsServer,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

type Result =
  | { ok: true; next: string }
  | { ok: false; error: string };

type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

/**
 * POST /api/auth/verify
 * Body: { email: string, code: string }
 *
 * Runs verifyOtp ON THE SERVER so:
 *   - Session cookies are set via proper Set-Cookie headers (HttpOnly +
 *     Secure + SameSite=Lax) instead of client-side document.cookie writes
 *     which can't be HttpOnly.
 *   - The session format perfectly matches what createServerClient expects
 *     to read back on subsequent requests.
 *   - The parents row is upserted in the same request so the post-signin
 *     navigation goes directly to onboarding or dashboard.
 *
 * Uses the explicit-pending-cookie attach pattern (collect via setAll,
 * then write each to the response) — same as /auth/callback's bulletproof
 * version. No reliance on Next/Vercel auto-attachment.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let email = "";
  let code = "";
  try {
    const body = (await request.json()) as {
      email?: unknown;
      code?: unknown;
    };
    email = String(body.email ?? "").trim();
    code = String(body.code ?? "").replace(/\s/g, "");
  } catch {
    return NextResponse.json<Result>(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json<Result>({
      ok: false,
      error: "Invalid email.",
    });
  }
  if (!CODE_RE.test(code)) {
    return NextResponse.json<Result>({
      ok: false,
      error: "Enter the 6-digit code from the email.",
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json<Result>(
      { ok: false, error: "Supabase not configured." },
      { status: 500 },
    );
  }

  // Collect cookies supabase wants to set during verifyOtp; we attach
  // them explicitly to the JSON response below.
  const pending: PendingCookie[] = [];
  const cookieAdapter: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll().map((c) => ({
        name: c.name,
        value: c.value,
      }));
    },
    setAll(cookiesToSet) {
      for (const c of cookiesToSet) {
        pending.push({
          name: c.name,
          value: c.value,
          options: c.options,
        });
      }
    },
  };

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: cookieAdapter,
  });

  // 1. Verify the OTP. This sets the session on the supabase client AND
  // writes the session cookies via setAll (collected in `pending`).
  const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (verifyErr || !verifyData?.user) {
    const msg = verifyErr?.message ?? "Verification failed.";
    console.warn(`[auth.verify] verifyOtp failed for ${email}: ${msg}`);
    let friendly = msg;
    if (/expired|invalid|otp_expired/i.test(msg)) {
      friendly = "That code didn't work. Get a fresh one and try again.";
    }
    return NextResponse.json<Result>({ ok: false, error: friendly });
  }

  console.log(
    `[auth.verify] verified ${verifyData.user.id} — collected ${pending.length} cookies`,
  );

  // 2. Ensure parents row exists, decide next URL.
  let next: string = "/onboarding/household";
  try {
    const svc = createServiceSupabase();
    const { data: existing } = await svc
      .from("parents")
      .select("id, household_id")
      .eq("id", verifyData.user.id)
      .maybeSingle();

    if (!existing) {
      await svc.from("parents").upsert(
        {
          id: verifyData.user.id,
          email: verifyData.user.email ?? email,
          name: "",
          household_id: null,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      next = "/onboarding/household";
    } else if (!existing.household_id) {
      next = "/onboarding/household";
    } else {
      next = "/";
    }
  } catch (e) {
    console.error("[auth.verify] ensureParents failed:", e);
    // Don't fail the whole sign-in for an upsert error — the user can
    // re-trigger from the next page.
    next = "/onboarding/household";
  }

  // 3. Build the JSON response and ATTACH every collected cookie with
  // its original options. This is the line that makes the session
  // persist into the browser on Vercel.
  const response = NextResponse.json<Result>({ ok: true, next });
  for (const c of pending) {
    response.cookies.set({
      name: c.name,
      value: c.value,
      ...(c.options ?? {}),
    });
  }
  // No-store so no edge cache strips the Set-Cookie headers.
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
