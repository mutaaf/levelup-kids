import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { clearHouseholdAnthropicKey } from "@/lib/ai/household-key";

export const runtime = "nodejs";
export const maxDuration = 15;

type Result = { ok: true } | { ok: false; error: string };

export async function POST(_request: NextRequest): Promise<Response> {
  try {
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
    await clearHouseholdAnthropicKey(parent.household_id as string);
    revalidatePath("/settings");
    revalidatePath("/coach");
    return NextResponse.json<Result>({ ok: true });
  } catch (e) {
    console.error("[byok.clear] unhandled:", e);
    const msg = e instanceof Error ? e.message : "Clear failed.";
    return NextResponse.json<Result>(
      { ok: false, error: `Server error: ${msg}` },
      { status: 500 },
    );
  }
}
