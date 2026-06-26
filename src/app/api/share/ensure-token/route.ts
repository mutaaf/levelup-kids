import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { createDisplayToken } from "@/lib/display/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Result =
  | { ok: true; token: string }
  | { ok: false; error: string };

/**
 * POST /api/share/ensure-token
 *
 * Returns (or creates if none exists) a display token for the household.
 * Reuses the display_tokens system so the share image and the family
 * display share the same opaque household identifier.
 */
export async function POST(_request: NextRequest): Promise<Response> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json<Result>(
      { ok: false, error: "Not signed in." },
      { status: 401 },
    );
  }

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) {
    return NextResponse.json<Result>({
      ok: false,
      error: "No household.",
    });
  }
  const householdId = parent.household_id as string;

  // Prefer the most recent non-revoked display token; otherwise create one
  // labeled 'share' so the parent can spot it in the displays list.
  const { data: existing } = await svc
    .from("household_display_tokens")
    .select("token")
    .eq("household_id", householdId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json<Result>({
      ok: true,
      token: existing[0]!.token as string,
    });
  }

  try {
    const created = await createDisplayToken({
      householdId,
      createdBy: user.id,
      label: "share",
    });
    return NextResponse.json<Result>({ ok: true, token: created.token });
  } catch (e) {
    return NextResponse.json<Result>({
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't create share token.",
    });
  }
}
