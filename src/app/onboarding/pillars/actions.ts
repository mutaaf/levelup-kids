"use server";

import { redirect } from "next/navigation";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { isPillarSlug, type PillarSlug } from "@/lib/types/pillar";
import { seedFirstWeek } from "@/lib/quests/selector";

export type SetFocusPillarsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setFocusPillars(
  pillars: string[],
): Promise<SetFocusPillarsResult> {
  if (!Array.isArray(pillars)) {
    return { ok: false, error: "Pick 2 or 3 pillars." };
  }
  if (pillars.length < 2 || pillars.length > 3) {
    return { ok: false, error: "Pick 2 or 3 pillars." };
  }
  const validated: PillarSlug[] = [];
  for (const p of pillars) {
    if (!isPillarSlug(p)) return { ok: false, error: `Unknown pillar: ${p}` };
    validated.push(p);
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) {
    return { ok: false, error: "Create your household first." };
  }
  const householdId = parent.household_id as string;

  // Save focus pillars on the household.
  const { error: hhErr } = await svc
    .from("households")
    .update({ focus_pillars: validated })
    .eq("id", householdId);
  if (hhErr) return { ok: false, error: hhErr.message };

  // Load children to seed quests for each.
  const { data: kids, error: kErr } = await svc
    .from("children")
    .select("id")
    .eq("household_id", householdId);
  if (kErr) return { ok: false, error: kErr.message };
  if (!kids || kids.length === 0) {
    return { ok: false, error: "Add at least one child before picking pillars." };
  }

  // Clear any existing quests for these children, then seed the first week.
  // (Idempotent: if onboarding is rerun the seed is fresh.)
  const childIds = kids.map((c) => c.id as string);
  await svc.from("quests").delete().in("child_id", childIds);

  const rows = seedFirstWeek({
    children: kids.map((c) => ({ id: c.id as string })),
    focusPillars: validated,
  });
  if (rows.length > 0) {
    const { error: qErr } = await svc.from("quests").insert(rows);
    if (qErr) return { ok: false, error: qErr.message };
  }

  redirect("/");
}
