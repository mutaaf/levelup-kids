"use server";

import { revalidatePath } from "next/cache";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { isPillarSlug } from "@/lib/types/pillar";

export type ChildFocusResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Server action: replace a child's focus_pillars with the given list.
 * Allowed: 1-4 valid pillar slugs. The radar shows only pillars the kid
 * is focused on, so picking 0 effectively turns scoring off for that kid.
 *
 * Authz: parent must belong to the same household as the child.
 */
export async function setChildFocusPillars(
  childId: string,
  pillars: readonly string[],
): Promise<ChildFocusResult> {
  if (!childId) return { ok: false, error: "Missing childId." };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Validate + dedupe.
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const p of pillars) {
    if (!isPillarSlug(p)) return { ok: false, error: `Unknown pillar: ${p}` };
    if (seen.has(p)) continue;
    seen.add(p);
    cleaned.push(p);
  }
  if (cleaned.length > 4) {
    return { ok: false, error: "Pick at most 4 pillars." };
  }

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) return { ok: false, error: "No household." };

  const { data: child } = await svc
    .from("children")
    .select("id, household_id")
    .eq("id", childId)
    .maybeSingle();
  if (!child || child.household_id !== parent.household_id) {
    return { ok: false, error: "Not your child." };
  }

  const { error } = await svc
    .from("children")
    .update({ focus_pillars: cleaned })
    .eq("id", childId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath(`/kids/${childId}`);
  return { ok: true };
}
