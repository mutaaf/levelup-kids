import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { setHouseholdAnthropicKey } from "@/lib/ai/household-key";

export const runtime = "nodejs";
export const maxDuration = 15;

const KEY_RE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

type Result = { ok: true } | { ok: false; error: string };

/**
 * POST /api/byok/save
 * Body: { key: string }
 * Persists the key on the household_secrets row for the calling parent's
 * household.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    let body: { key?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<Result>(
        { ok: false, error: "Invalid request body." },
        { status: 400 },
      );
    }

    const key = String(body.key ?? "").trim();
    if (!key) {
      return NextResponse.json<Result>({ ok: false, error: "Paste a key first." });
    }
    if (!KEY_RE.test(key)) {
      return NextResponse.json<Result>({
        ok: false,
        error:
          'That doesn\'t look like an Anthropic key. It should start with "sk-ant-".',
      });
    }

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
        error: "Create your household first.",
      });
    }

    await setHouseholdAnthropicKey(parent.household_id as string, key);
    revalidatePath("/settings");
    revalidatePath("/coach");
    return NextResponse.json<Result>({ ok: true });
  } catch (e) {
    console.error("[byok.save] unhandled:", e);
    const msg = e instanceof Error ? e.message : "Save failed.";
    return NextResponse.json<Result>(
      { ok: false, error: `Server error: ${msg}` },
      { status: 500 },
    );
  }
}
