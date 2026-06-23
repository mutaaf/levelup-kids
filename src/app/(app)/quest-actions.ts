"use server";

import { revalidatePath } from "next/cache";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { evaluateAndAwardBadges } from "@/lib/achievements/award";

export type QuestActionResult =
  | { ok: true }
  | { ok: false; error: string };

/** A child (via the parent's session) marks the quest "ready for approval". */
export async function markQuestReady(
  questId: string,
): Promise<QuestActionResult> {
  if (!questId) return { ok: false, error: "Missing questId." };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) return { ok: false, error: "No household." };

  // Verify the quest belongs to a child in this household.
  const { data: quest } = await svc
    .from("quests")
    .select("id, child_id, children:children(household_id)")
    .eq("id", questId)
    .maybeSingle();
  if (!quest) return { ok: false, error: "Quest not found." };
  const householdMatch =
    (quest.children as unknown as { household_id: string } | null)
      ?.household_id === parent.household_id;
  if (!householdMatch) return { ok: false, error: "Not your household." };

  // Insert completion (idempotent via the UNIQUE(quest_id) constraint).
  const { error } = await svc
    .from("quest_completions")
    .insert({
      quest_id: questId,
      child_id: quest.child_id,
      xp_awarded: 0,
    });
  if (error && !/duplicate key/i.test(error.message)) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath(`/kids/${quest.child_id}`);
  return { ok: true };
}

/** A parent approves the pending completion. Awards XP. */
export async function approveQuest(
  completionId: string,
): Promise<QuestActionResult> {
  if (!completionId) return { ok: false, error: "Missing completionId." };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) return { ok: false, error: "No household." };

  // Load the completion along with the quest's xp_reward + the child's household.
  const { data: completion } = await svc
    .from("quest_completions")
    .select(
      "id, quest_id, child_id, approved_at, quests:quests(xp_reward, child_id, children:children(household_id))",
    )
    .eq("id", completionId)
    .maybeSingle();
  if (!completion) return { ok: false, error: "Completion not found." };

  const quest = completion.quests as unknown as {
    xp_reward: number;
    child_id: string;
    children: { household_id: string };
  };
  if (quest.children?.household_id !== parent.household_id) {
    return { ok: false, error: "Not your household." };
  }
  if (completion.approved_at) {
    // Already approved — idempotent success.
    revalidatePath("/");
    revalidatePath(`/kids/${quest.child_id}`);
    return { ok: true };
  }

  const xp = quest.xp_reward ?? 5;
  const { error } = await svc
    .from("quest_completions")
    .update({
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      xp_awarded: xp,
    })
    .eq("id", completionId);
  if (error) return { ok: false, error: error.message };

  // Evaluate badges off the new approval. Don't block on errors — a badge
  // failure shouldn't break the approval flow.
  try {
    await evaluateAndAwardBadges({ childId: quest.child_id });
  } catch (e) {
    console.warn(
      `[approveQuest] badge eval failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  revalidatePath("/");
  revalidatePath(`/kids/${quest.child_id}`);
  return { ok: true };
}

/** The "not yet" path — remove the pending completion so the child can retry. */
export async function rejectCompletion(
  completionId: string,
): Promise<QuestActionResult> {
  if (!completionId) return { ok: false, error: "Missing completionId." };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) return { ok: false, error: "No household." };

  const { data: completion } = await svc
    .from("quest_completions")
    .select("id, child_id, approved_at, children:children(household_id)")
    .eq("id", completionId)
    .maybeSingle();
  if (!completion) return { ok: false, error: "Completion not found." };

  if (
    (completion.children as unknown as { household_id: string } | null)
      ?.household_id !== parent.household_id
  ) {
    return { ok: false, error: "Not your household." };
  }
  if (completion.approved_at) {
    return { ok: false, error: "Already approved — can't un-do in v1." };
  }

  const { error } = await svc
    .from("quest_completions")
    .delete()
    .eq("id", completionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath(`/kids/${completion.child_id}`);
  return { ok: true };
}
