"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import {
  createDisplayToken,
  revokeDisplayToken,
} from "@/lib/display/tokens";

export type DisplayActionResult =
  | { ok: true; token?: string; url?: string }
  | { ok: false; error: string };

async function requireHouseholdAndUser(): Promise<
  { householdId: string; userId: string } | { error: string }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) return { error: "No household." };
  return {
    householdId: parent.household_id as string,
    userId: user.id,
  };
}

export async function createDisplay(
  label: string,
): Promise<DisplayActionResult> {
  const ctx = await requireHouseholdAndUser();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  try {
    const t = await createDisplayToken({
      householdId: ctx.householdId,
      createdBy: ctx.userId,
      label: label.trim() || null,
    });
    revalidatePath("/settings");
    return { ok: true, token: t.token };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't create display.",
    };
  }
}

export async function revokeDisplay(
  token: string,
): Promise<DisplayActionResult> {
  const ctx = await requireHouseholdAndUser();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  try {
    await revokeDisplayToken({
      token,
      householdId: ctx.householdId,
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Couldn't remove display.",
    };
  }
}
