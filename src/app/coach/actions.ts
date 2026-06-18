"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/client";
import {
  buildCoachSystemPrompt,
  type CoachContext,
} from "@/lib/ai/coach-prompt";
import type { PillarSlug } from "@/lib/types/pillar";

export type CoachMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export type SendCoachMessageResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendCoachMessage(
  text: string,
): Promise<SendCoachMessageResult> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "Type a question first." };
  if (trimmed.length > 2000)
    return { ok: false, error: "Keep it under 2000 characters." };

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
  if (!parent?.household_id) return { ok: false, error: "No household." };
  const householdId = parent.household_id as string;

  // Load household + children + recent quest activity for the system prompt.
  const [{ data: household }, { data: children }, { data: recentQuests }] =
    await Promise.all([
      svc
        .from("households")
        .select("name, focus_pillars")
        .eq("id", householdId)
        .maybeSingle(),
      svc
        .from("children")
        .select("id, name, age")
        .eq("household_id", householdId),
      svc
        .from("quests")
        .select(
          "title, pillar, child_id, children:children(name), quest_completions:quest_completions(approved_at)",
        )
        .order("assigned_for", { ascending: false })
        .limit(12),
    ]);

  const ctx: CoachContext = {
    householdName: (household?.name as string) ?? "Your household",
    focusPillars: (household?.focus_pillars as PillarSlug[] | null) ?? [],
    children:
      (children ?? []).map((c) => ({
        name: c.name as string,
        age: c.age as number,
      })) ?? [],
    recentQuests: (recentQuests ?? []).map((q) => {
      const child = q.children as unknown as { name: string } | null;
      const comps = (q.quest_completions as unknown as
        | Array<{ approved_at: string | null }>
        | null) ?? [];
      return {
        childName: child?.name ?? "",
        title: q.title as string,
        pillar: q.pillar as PillarSlug,
        completedRecently: comps.some((c) => c.approved_at),
      };
    }),
  };

  // Load prior conversation (last 20 turns) for context.
  const { data: history } = await svc
    .from("coach_messages")
    .select("role, content")
    .eq("household_id", householdId)
    .order("created_at", { ascending: true })
    .limit(20);

  // Append the user's new turn (persisted first so even a failed AI call
  // leaves a record of what they asked).
  await svc.from("coach_messages").insert({
    household_id: householdId,
    role: "user",
    content: trimmed,
  });

  try {
    const result = await callAI({
      task: "coach",
      maxTokens: 700,
      temperature: 0.6,
      messages: [
        { role: "system", content: buildCoachSystemPrompt(ctx) },
        ...((history ?? []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content as string,
        }))),
        { role: "user", content: trimmed },
      ],
    });

    await svc.from("coach_messages").insert({
      household_id: householdId,
      role: "assistant",
      content: result.text,
    });

    revalidatePath("/coach");
    return { ok: true };
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Family Coach call failed unexpectedly.";
    return { ok: false, error: msg };
  }
}
