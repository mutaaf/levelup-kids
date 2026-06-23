"use server";

import { revalidatePath } from "next/cache";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { AVATARS, isAvatar } from "@/lib/children/avatars";

export type ChildActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type ChildDraft = {
  name: string;
  age: number;
  avatar: string;
};

const MAX_CHILDREN = 6;

function validate(d: ChildDraft): string | null {
  if (!d.name?.trim()) return "Every kid needs a name.";
  if (d.name.trim().length > 24)
    return "Names must be 24 characters or fewer.";
  if (typeof d.age !== "number" || !Number.isFinite(d.age))
    return "Age must be a number.";
  if (d.age < 4 || d.age > 17) return "Age must be between 4 and 17.";
  if (!isAvatar(d.avatar)) return "Pick an avatar.";
  return null;
}

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

/**
 * Add ONE new child. Preserves all existing children (and their XP +
 * badges + completion history). Defaults focus_pillars to the
 * household's focus_pillars when the column exists; harmless if not.
 */
export async function addChild(
  draft: ChildDraft,
): Promise<ChildActionResult<{ childId: string }>> {
  const v = validate(draft);
  if (v) return { ok: false, error: v };

  const hh = await householdIdFor();
  if (typeof hh !== "string") return { ok: false, error: hh.error };

  const svc = createServiceSupabase();
  const { count } = await svc
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("household_id", hh);
  if ((count ?? 0) >= MAX_CHILDREN) {
    return {
      ok: false,
      error: `You can have up to ${MAX_CHILDREN} kids per household.`,
    };
  }

  // Seed focus_pillars from the household defaults so the new kid lands
  // on the radar immediately. Safe pre-migration too: an unknown column
  // simply gets dropped from the insert.
  const { data: household } = await svc
    .from("households")
    .select("focus_pillars")
    .eq("id", hh)
    .maybeSingle();
  const householdFocus = (household?.focus_pillars as string[] | null) ?? [];

  const insertRow: Record<string, unknown> = {
    household_id: hh,
    name: draft.name.trim(),
    age: draft.age,
    avatar: draft.avatar,
  };
  if (householdFocus.length > 0) {
    insertRow.focus_pillars = householdFocus;
  }

  const { data, error } = await svc
    .from("children")
    .insert(insertRow)
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Insert failed." };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true, data: { childId: data.id as string } };
}

/**
 * Update ONE kid's name / age / avatar in place. Does NOT touch XP,
 * completions, achievements, or focus_pillars. Safe for any rename or
 * birthday update.
 */
export async function updateChild(
  childId: string,
  draft: ChildDraft,
): Promise<ChildActionResult> {
  if (!childId) return { ok: false, error: "Missing childId." };
  const v = validate(draft);
  if (v) return { ok: false, error: v };

  const hh = await householdIdFor();
  if (typeof hh !== "string") return { ok: false, error: hh.error };

  const svc = createServiceSupabase();
  const { data: existing } = await svc
    .from("children")
    .select("id, household_id")
    .eq("id", childId)
    .maybeSingle();
  if (!existing || existing.household_id !== hh) {
    return { ok: false, error: "Not your child." };
  }

  const { error } = await svc
    .from("children")
    .update({
      name: draft.name.trim(),
      age: draft.age,
      avatar: draft.avatar,
    })
    .eq("id", childId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath(`/kids/${childId}`);
  return { ok: true };
}

/**
 * Remove a child. CASCADE on the FKs (quests, quest_completions,
 * child_achievements) means their history goes too — that's the point of
 * a remove, not an archive. We require the caller to type the kid's
 * first name as a confirm so it's not a one-tap mistake.
 */
export async function removeChild(
  childId: string,
  typedName: string,
): Promise<ChildActionResult> {
  if (!childId) return { ok: false, error: "Missing childId." };
  const hh = await householdIdFor();
  if (typeof hh !== "string") return { ok: false, error: hh.error };

  const svc = createServiceSupabase();
  const { data: existing } = await svc
    .from("children")
    .select("id, household_id, name")
    .eq("id", childId)
    .maybeSingle();
  if (!existing || existing.household_id !== hh) {
    return { ok: false, error: "Not your child." };
  }
  const realName = ((existing.name as string) ?? "").trim();
  if (typedName.trim().toLowerCase() !== realName.toLowerCase()) {
    return {
      ok: false,
      error: `Type "${realName}" to confirm removal.`,
    };
  }

  // Don't let the parent delete their LAST kid here — the dashboard
  // expects ≥1 child to even render. Send them through onboarding instead.
  const { count } = await svc
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("household_id", hh);
  if ((count ?? 0) <= 1) {
    return {
      ok: false,
      error: "This is your only kid — add another first, then remove.",
    };
  }

  const { error } = await svc
    .from("children")
    .delete()
    .eq("id", childId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/settings");
  return { ok: true };
}

export const AVAILABLE_AVATARS = AVATARS;
export const MAX_KIDS = MAX_CHILDREN;
