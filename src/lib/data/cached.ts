import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceSupabase } from "@/lib/supabase/server";
import type { PillarSlug } from "@/lib/types/pillar";

// Cross-request cache layer. Each fetcher creates a fresh unstable_cache
// per household so the tag we set is also per-household — that's what
// makes `revalidateTag(householdTag(id))` only blow away that one
// household's cache instead of the whole pool.
//
// Invalidation contract: every server action that mutates a row owned
// by a household calls `revalidateTag(householdTag(householdId))`. The
// next read pulls fresh data.
//
// TTL: 5 minutes as a safety net. Tag invalidation is the primary
// freshness mechanism; the TTL only kicks in if a mutation slips past
// us (e.g. a row written from psql or another deploy).

const TTL_SECONDS = 300;

export function householdTag(householdId: string): string {
  return `household:${householdId}`;
}

export type CompletionForScore = {
  pillar: PillarSlug;
  approvedAt: string;
  childId: string;
  xpAwarded: number;
  questTitle: string;
};

/**
 * All approved completions for a household, joined with each quest's
 * pillar. Powers the family score radar + per-kid XP totals. Heaviest
 * single query in the app — caching this is the biggest compute win.
 */
export function getCachedApprovedCompletions(
  householdId: string,
): Promise<CompletionForScore[]> {
  return unstable_cache(
    async (): Promise<CompletionForScore[]> => {
      const svc = createServiceSupabase();
      const { data: kids } = await svc
        .from("children")
        .select("id")
        .eq("household_id", householdId);
      const childIds = (kids ?? []).map((k) => k.id as string);
      if (childIds.length === 0) return [];

      const { data } = await svc
        .from("quest_completions")
        .select(
          "child_id, xp_awarded, approved_at, quests:quests(pillar, title)",
        )
        .in("child_id", childIds)
        .not("approved_at", "is", null);

      const out: CompletionForScore[] = [];
      for (const c of data ?? []) {
        const q = c.quests as unknown as {
          pillar?: PillarSlug;
          title?: string;
        } | null;
        out.push({
          pillar: (q?.pillar ?? "scholar") as PillarSlug,
          approvedAt: c.approved_at as string,
          childId: c.child_id as string,
          xpAwarded: (c.xp_awarded as number | null) ?? 0,
          questTitle: (q?.title as string | undefined) ?? "",
        });
      }
      return out;
    },
    ["household-approved-completions", householdId],
    {
      revalidate: TTL_SECONDS,
      tags: [householdTag(householdId)],
    },
  )();
}

/** Per-child badge counts for a household. */
export function getCachedBadgeCountsByChild(
  householdId: string,
): Promise<Record<string, number>> {
  return unstable_cache(
    async (): Promise<Record<string, number>> => {
      const svc = createServiceSupabase();
      const { data: kids } = await svc
        .from("children")
        .select("id")
        .eq("household_id", householdId);
      const childIds = (kids ?? []).map((k) => k.id as string);
      if (childIds.length === 0) return {};

      const { data } = await svc
        .from("child_achievements")
        .select("child_id")
        .in("child_id", childIds);
      const out: Record<string, number> = {};
      for (const row of data ?? []) {
        const id = row.child_id as string;
        out[id] = (out[id] ?? 0) + 1;
      }
      return out;
    },
    ["household-badge-counts", householdId],
    {
      revalidate: TTL_SECONDS,
      tags: [householdTag(householdId)],
    },
  )();
}
