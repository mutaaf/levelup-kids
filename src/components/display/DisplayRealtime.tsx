"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import type { KidView } from "./HouseholdLeaderboard";
import type { PillarSlug } from "@/lib/types/pillar";
import { level } from "@/lib/growth/level";

type Celebration = {
  childName: string;
  childAvatar: string;
  pillar: PillarSlug;
  xp: number;
  level: number | null; // present only when this approval bumped a level
};

/**
 * Live updates for the household display:
 *   - subscribes to Supabase realtime on quest_completions for THIS household
 *   - on a new approval, fires a 4s celebration overlay
 *   - calls router.refresh() so the underlying server data re-renders
 *   - polls every 30s as a safety net for missed realtime events
 */
export function DisplayRealtime({
  householdId,
  kids,
}: {
  householdId: string;
  kids: KidView[];
}) {
  const router = useRouter();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  // Keep the previous totalXp per child so we can detect level-ups.
  const prevXpRef = useRef<Map<string, number>>(
    new Map(kids.map((k) => [k.childId, k.totalXp])),
  );

  // Update the snapshot whenever the server re-renders.
  useEffect(() => {
    for (const k of kids) {
      prevXpRef.current.set(k.childId, k.totalXp);
    }
  }, [kids]);

  // 30s polling safety net (independent of realtime).
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router]);

  // Supabase realtime subscription on quest_completions.
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel(`display-${householdId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "quest_completions",
        },
        async (payload) => {
          const row = payload.new as Record<string, unknown>;
          // Only react to rows that just got approved.
          if (!row.approved_at) return;
          if (payload.old && (payload.old as Record<string, unknown>).approved_at) {
            // Already-approved row updated (rare) — ignore.
            return;
          }
          await fireCelebration(row);
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "quest_completions",
        },
        async (payload) => {
          // Ready-to-approve insert: not a celebration, but refresh so
          // the "X of N today" advances if/when the approval lands later.
          const row = payload.new as Record<string, unknown>;
          if (row.approved_at) {
            await fireCelebration(row);
          }
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId]);

  async function fireCelebration(row: Record<string, unknown>) {
    const childId = row.child_id as string;
    const questId = row.quest_id as string;
    const xpAwarded = (row.xp_awarded as number) ?? 5;
    // Pull names/avatars/pillar from the rendered kids array + a quick query.
    const kid = kids.find((k) => k.childId === childId);
    if (!kid) return;
    const supabase = createBrowserSupabase();
    const { data: q } = await supabase
      .from("quests")
      .select("pillar")
      .eq("id", questId)
      .maybeSingle();
    const pillar = (q?.pillar as PillarSlug | undefined) ?? "scholar";

    // Level-up detection.
    const prevXp = prevXpRef.current.get(childId) ?? kid.totalXp;
    const newXp = prevXp + xpAwarded;
    const prevLevel = level(prevXp);
    const newLevel = level(newXp);
    prevXpRef.current.set(childId, newXp);

    setCelebration({
      childName: kid.name,
      childAvatar: kid.avatar,
      pillar,
      xp: xpAwarded,
      level: newLevel > prevLevel ? newLevel : null,
    });
    setTimeout(() => setCelebration(null), 4500);
  }

  if (!celebration) return null;

  const tint = PILLAR_COPY[celebration.pillar].tint;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: `radial-gradient(60% 60% at 50% 50%, color-mix(in srgb, ${tint} 40%, transparent), color-mix(in srgb, ${tint} 8%, transparent) 70%, transparent 100%)`,
        animation: "displayFadeIn 250ms ease-out, displayFadeOut 600ms ease-in 3900ms forwards",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6">
        <div
          className="flex items-center justify-center rounded-full bg-card shadow-2xl"
          style={{
            width: "clamp(220px, 32vw, 420px)",
            height: "clamp(220px, 32vw, 420px)",
            fontSize: "clamp(120px, 18vw, 260px)",
            lineHeight: 1,
            animation: "displayPop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}
          aria-hidden
        >
          {celebration.childAvatar}
        </div>
        <div className="flex flex-col items-center gap-2">
          <p
            className="font-display font-bold text-ink-primary"
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              fontSize: "clamp(40px, 5vw, 84px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              animation: "displayPop 800ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms both",
            }}
          >
            {celebration.childName}
          </p>
          {celebration.level !== null ? (
            <p
              className="font-display font-bold"
              style={{
                fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
                fontSize: "clamp(32px, 4.5vw, 72px)",
                color: tint,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                animation: "displayPop 900ms cubic-bezier(0.34, 1.56, 0.64, 1) 250ms both",
              }}
            >
              Level {celebration.level}!
            </p>
          ) : (
            <p
              className="font-display font-bold"
              style={{
                fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
                fontSize: "clamp(32px, 4.5vw, 72px)",
                color: tint,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                animation: "displayPop 900ms cubic-bezier(0.34, 1.56, 0.64, 1) 250ms both",
              }}
            >
              +{celebration.xp} XP
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
