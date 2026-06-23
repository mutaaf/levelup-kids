import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/ensure-parents
 * Body: { email: string }
 * Response: { ok: true, next: "/onboarding/household" | "/" } | { ok: false, error }
 *
 * Called from the AuthForm after a successful client-side verifyOtp. The
 * cookies have JUST been written by supabase-js via document.cookie; this
 * route reads them server-side, ensures the parents row exists, and tells
 * the client where to go next.
 *
 * Used to be a server action — moved to an API route because server-action
 * RPCs have failed unpredictably on Vercel and the failure surfaces as
 * "An unexpected response was received from the server" which crashes the
 * React tree. Plain HTTP + JSON is bulletproof.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = String(body.email ?? "").trim();
  } catch {
    // ignore — email becomes ""
  }

  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn(
        `[ensure-parents] no user after verifyOtp — cookies may not have propagated. email=${email}`,
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "Session not detected yet. Refresh the page and the sign-in should complete.",
        },
        { status: 401 },
      );
    }

    const svc = createServiceSupabase();
    const { data: existing, error: readErr } = await svc
      .from("parents")
      .select("id, household_id")
      .eq("id", user.id)
      .maybeSingle();
    if (readErr) {
      console.error(`[ensure-parents] read failed:`, readErr);
      return NextResponse.json(
        { ok: false, error: readErr.message },
        { status: 500 },
      );
    }

    if (!existing) {
      const { error: upsertErr } = await svc.from("parents").upsert(
        {
          id: user.id,
          email: email || user.email || "",
          name: "",
          household_id: null,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (upsertErr) {
        console.error(`[ensure-parents] upsert failed:`, upsertErr);
        return NextResponse.json(
          { ok: false, error: upsertErr.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, next: "/onboarding/household" });
    }

    if (!existing.household_id) {
      return NextResponse.json({ ok: true, next: "/onboarding/household" });
    }
    return NextResponse.json({ ok: true, next: "/" });
  } catch (e) {
    console.error("[ensure-parents] unhandled:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 },
    );
  }
}
