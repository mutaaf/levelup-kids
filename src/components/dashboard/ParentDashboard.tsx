import Link from "next/link";
import type { PillarSlug } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import { ChildCard } from "./ChildCard";
import { ApprovalQueue, type PendingApproval } from "./ApprovalQueue";
import { FamilyGrowthRadar } from "@/components/growth/FamilyGrowthRadar";

export type ParentDashboardProps = {
  householdName: string;
  parentName: string;
  focusPillars: PillarSlug[];
  growthScores: Record<PillarSlug, number | null>;
  kids: Array<{
    childId: string;
    name: string;
    avatar: string;
    totalXp: number;
    todayDone: number;
    todayTotal: number;
    streakDays?: number;
    badgeCount?: number;
  }>;
  pendingApprovals: PendingApproval[];
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function ParentDashboard({
  householdName,
  parentName,
  focusPillars,
  kids,
  pendingApprovals,
  growthScores,
}: ParentDashboardProps) {
  const firstName = parentName.split(" ")[0] || "";
  const pendingCount = pendingApprovals.length;

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-lg flex-col gap-8 px-5 py-6 pb-32 sm:px-8 sm:py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-ink-secondary">
            {greeting()}{firstName ? `, ${firstName}` : ""}.
          </p>
          <h1
            className="mt-1 font-display"
            style={{
              fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
              fontSize: "var(--text-h1)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {householdName}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {focusPillars.map((p) => (
              <span
                key={p}
                className="rounded-full px-3 py-1 text-sm font-bold text-white"
                style={{ backgroundColor: PILLAR_COPY[p].tint }}
              >
                {PILLAR_COPY[p].title}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm">
          <Link
            href="/settings"
            className="rounded-full bg-card px-4 py-2 font-medium text-ink-secondary shadow-sm hover:bg-tinted"
          >
            Settings
          </Link>
        </div>
      </header>

      {pendingCount > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2
              className="font-display"
              style={{
                fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
                fontSize: "1.75rem",
                letterSpacing: "-0.015em",
              }}
            >
              {pendingCount === 1
                ? "1 quest to approve"
                : `${pendingCount} quests to approve`}
            </h2>
            <span
              className="rounded-full px-3 py-1 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--brand-500)" }}
            >
              {pendingCount}
            </span>
          </div>
          <ApprovalQueue items={pendingApprovals} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2
          className="font-display"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "1.75rem",
            letterSpacing: "-0.015em",
          }}
        >
          Your family
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kids.map((c) => (
            <ChildCard key={c.childId} {...c} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2
          className="font-display"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "1.75rem",
            letterSpacing: "-0.015em",
          }}
        >
          This season
        </h2>
        <div className="flex justify-center rounded-3xl bg-card p-6 shadow-md sm:p-8">
          <FamilyGrowthRadar scores={growthScores} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2
          className="font-display"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "1.75rem",
            letterSpacing: "-0.015em",
          }}
        >
          Family Coach
        </h2>
        <Link
          href="/coach"
          className="group flex items-center gap-4 rounded-3xl bg-card p-5 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-2xl">
            ☕
          </div>
          <div className="flex-1">
            <p
              className="font-display"
              style={{
                fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
                fontSize: "1.25rem",
                letterSpacing: "-0.01em",
              }}
            >
              Ask the Coach.
            </p>
            <p className="mt-0.5 text-base text-ink-secondary">
              Tailored to your family — what worked, what didn&apos;t, what to
              try next.
            </p>
          </div>
          <span
            aria-hidden
            className="text-3xl text-ink-muted transition-all group-hover:translate-x-0.5 group-hover:text-brand-500"
          >
            →
          </span>
        </Link>
      </section>
    </main>
  );
}
