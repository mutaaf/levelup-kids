import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Result =
  | { ok: true; next: string }
  | { ok: false; error: string };

/**
 * POST /api/auth/accept-invite
 * Body: { token: string }
 *
 * Called from /invite/[token] AFTER the user signs in. Validates the token,
 * joins the user to the household as a parent, marks the invite consumed.
 *
 * Race-safe: a second accept of the same token returns the same household
 * id; idempotent for the same accepter.
 */
export async function POST(request: NextRequest): Promise<Response> {
  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = String(body.token ?? "").trim();
  } catch {
    return NextResponse.json<Result>(
      { ok: false, error: "Invalid request body." },
      { status: 400 },
    );
  }
  if (!token || token.length < 16) {
    return NextResponse.json<Result>(
      { ok: false, error: "Invalid invite token." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<Result>(
      { ok: false, error: "Sign in first, then click the invite link again." },
      { status: 401 },
    );
  }

  const svc = createServiceSupabase();

  // Load invite. Reject if revoked / expired / already accepted by another user.
  const { data: invite } = await svc
    .from("household_invites")
    .select(
      "id, token, household_id, expires_at, accepted_at, accepted_by, revoked_at",
    )
    .eq("token", token)
    .maybeSingle();
  if (!invite) {
    return NextResponse.json<Result>({
      ok: false,
      error: "We don't recognize that invite. Ask for a fresh link.",
    });
  }
  if (invite.revoked_at) {
    return NextResponse.json<Result>({
      ok: false,
      error: "This invite was revoked. Ask for a fresh link.",
    });
  }
  if (
    invite.expires_at &&
    new Date(invite.expires_at as string).getTime() < Date.now()
  ) {
    return NextResponse.json<Result>({
      ok: false,
      error: "This invite expired. Ask for a fresh link.",
    });
  }
  if (
    invite.accepted_at &&
    invite.accepted_by &&
    invite.accepted_by !== user.id
  ) {
    return NextResponse.json<Result>({
      ok: false,
      error: "This invite was already used by someone else.",
    });
  }

  const householdId = invite.household_id as string;

  // What household is the accepter currently in (if any)?
  const { data: parent } = await svc
    .from("parents")
    .select("id, household_id, email, name")
    .eq("id", user.id)
    .maybeSingle();

  // If the user is already a parent in this household, treat as success.
  if (parent?.household_id === householdId) {
    if (!invite.accepted_at) {
      await svc
        .from("household_invites")
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq("id", invite.id);
    }
    return NextResponse.json<Result>({ ok: true, next: "/" });
  }

  // Block if the user is already in a DIFFERENT household.
  if (parent?.household_id && parent.household_id !== householdId) {
    return NextResponse.json<Result>({
      ok: false,
      error:
        "You're already in a different household. Leave it first (Settings → Account → Sign out) or use a fresh account.",
    });
  }

  // Otherwise: place them in this household as a parent.
  if (parent) {
    const { error: updErr } = await svc
      .from("parents")
      .update({
        household_id: householdId,
        role: "parent",
      })
      .eq("id", user.id);
    if (updErr) {
      return NextResponse.json<Result>({
        ok: false,
        error: updErr.message,
      });
    }
  } else {
    const { error: insErr } = await svc.from("parents").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        name: "",
        household_id: householdId,
        role: "parent",
      },
      { onConflict: "id" },
    );
    if (insErr) {
      return NextResponse.json<Result>({
        ok: false,
        error: insErr.message,
      });
    }
  }

  // Mark invite consumed (one-shot acceptance).
  await svc
    .from("household_invites")
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by: user.id,
    })
    .eq("id", invite.id);

  return NextResponse.json<Result>({ ok: true, next: "/" });
}
