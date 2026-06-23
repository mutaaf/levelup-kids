"use server";

import { revalidatePath } from "next/cache";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { isPillarSlug, type PillarSlug } from "@/lib/types/pillar";
import { seedFirstWeek } from "@/lib/quests/selector";

export type QuestActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function householdIdFor(): Promise<string | { error: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Not signed in." };
  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) return { error: "No household." };
  return parent.household_id as string;
}

export type CustomQuestInput = {
  title: string;
  description: string;
  pillar: string;
  ageMin: number;
  ageMax: number;
  xpReward?: number;
};

function validate(input: CustomQuestInput): string | null {
  const title = input.title.trim();
  if (!title) return "Give the quest a title.";
  if (title.length > 80) return "Title must be 80 characters or fewer.";
  if (input.description.length > 280)
    return "Description must be 280 characters or fewer.";
  if (!isPillarSlug(input.pillar)) return "Pick a pillar.";
  if (
    !Number.isInteger(input.ageMin) ||
    !Number.isInteger(input.ageMax) ||
    input.ageMin < 4 ||
    input.ageMin > 17 ||
    input.ageMax < 4 ||
    input.ageMax > 17
  ) {
    return "Ages must be between 4 and 17.";
  }
  if (input.ageMin > input.ageMax) {
    return "Minimum age must be at or below maximum age.";
  }
  const xp = input.xpReward ?? 5;
  if (xp < 1 || xp > 50) return "XP must be between 1 and 50.";
  return null;
}

export async function createCustomQuest(
  input: CustomQuestInput,
): Promise<QuestActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const hh = await householdIdFor();
  if (typeof hh !== "string") return { ok: false, error: hh.error };

  const svc = createServiceSupabase();
  const { error } = await svc.from("household_quests").insert({
    household_id: hh,
    title: input.title.trim(),
    description: input.description.trim(),
    pillar: input.pillar,
    age_min: input.ageMin,
    age_max: input.ageMax,
    xp_reward: input.xpReward ?? 5,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function updateCustomQuest(
  id: string,
  input: CustomQuestInput,
): Promise<QuestActionResult> {
  if (!id) return { ok: false, error: "Missing id." };
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const hh = await householdIdFor();
  if (typeof hh !== "string") return { ok: false, error: hh.error };

  const svc = createServiceSupabase();
  const { error } = await svc
    .from("household_quests")
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      pillar: input.pillar,
      age_min: input.ageMin,
      age_max: input.ageMax,
      xp_reward: input.xpReward ?? 5,
    })
    .eq("id", id)
    .eq("household_id", hh);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

export async function deleteCustomQuest(
  id: string,
): Promise<QuestActionResult> {
  if (!id) return { ok: false, error: "Missing id." };
  const hh = await householdIdFor();
  if (typeof hh !== "string") return { ok: false, error: hh.error };

  const svc = createServiceSupabase();
  const { error } = await svc
    .from("household_quests")
    .delete()
    .eq("id", id)
    .eq("household_id", hh);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Wipe + re-seed this week's daily quests for all children in the household.
 * Uses the global library + the household's active custom quests (so newly
 * added customs show up immediately instead of waiting for the next cycle).
 *
 * Deliberately destructive — kills any "ready for approval" rows on this
 * week's quests too. We trust the parent: they clicked the button.
 */
export async function reseedThisWeek(): Promise<QuestActionResult> {
  const hh = await householdIdFor();
  if (typeof hh !== "string") return { ok: false, error: hh.error };

  const svc = createServiceSupabase();
  const { data: household } = await svc
    .from("households")
    .select("focus_pillars")
    .eq("id", hh)
    .maybeSingle();
  const focusPillars = (household?.focus_pillars as PillarSlug[] | null) ?? [];
  if (focusPillars.length === 0) {
    return { ok: false, error: "Pick focus pillars first." };
  }

  const { data: kids } = await svc
    .from("children")
    .select("id, age")
    .eq("household_id", hh);
  if (!kids || kids.length === 0) {
    return { ok: false, error: "Add a child first." };
  }

  const { data: customRows } = await svc
    .from("household_quests")
    .select("title, description, pillar, age_min, age_max, xp_reward")
    .eq("household_id", hh)
    .eq("is_active", true);
  const customTemplates = (customRows ?? []).map((r) => ({
    pillar: r.pillar as PillarSlug,
    title: r.title as string,
    description: (r.description as string | null) ?? "",
    xpReward: (r.xp_reward as number | null) ?? 5,
    difficulty: 1 as const,
    ageMin: (r.age_min as number | null) ?? 4,
    ageMax: (r.age_max as number | null) ?? 17,
  }));

  const childIds = kids.map((c) => c.id as string);
  await svc.from("quests").delete().in("child_id", childIds);

  const rows = seedFirstWeek({
    children: kids.map((c) => ({
      id: c.id as string,
      age: (c.age as number | null) ?? 7,
    })),
    focusPillars,
    customTemplates,
  });
  if (rows.length > 0) {
    const { error } = await svc.from("quests").insert(rows);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}
