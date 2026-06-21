"use server";

import { redirect } from "next/navigation";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";

export type CreateHouseholdInput = {
  householdName: string;
  parentName: string;
};

export type CreateHouseholdResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createHousehold(
  input: CreateHouseholdInput,
): Promise<CreateHouseholdResult> {
  const householdName = input.householdName.trim();
  const parentName = input.parentName.trim();

  if (!householdName) return { ok: false, error: "Household name is required." };
  if (householdName.length > 60)
    return { ok: false, error: "Household name must be 60 characters or fewer." };
  if (!parentName) return { ok: false, error: "Your name is required." };
  if (parentName.length > 60)
    return { ok: false, error: "Your name must be 60 characters or fewer." };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const svc = createServiceSupabase();

  // If they already have a household, just move them forward.
  const { data: existing } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing?.household_id) {
    redirect("/onboarding/children");
  }

  const { data: hh, error: hhErr } = await svc
    .from("households")
    .insert({
      name: householdName,
      subscription_tier: "free",
      focus_pillars: [],
    })
    .select("id")
    .single();
  if (hhErr || !hh) {
    return { ok: false, error: hhErr?.message ?? "Failed to create household." };
  }

  const { error: pErr } = await svc
    .from("parents")
    .update({
      household_id: hh.id,
      role: "admin",
      name: parentName,
    })
    .eq("id", user.id);
  if (pErr) return { ok: false, error: pErr.message };

  redirect("/onboarding/children");
}
