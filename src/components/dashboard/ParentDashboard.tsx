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
  }>;
  pendingApprovals: PendingApproval[];
};

export function ParentDashboard({
  householdName,
  parentName,
  focusPillars,
  kids,
  pendingApprovals,
  growthScores,
}: ParentDashboardProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-lg flex-col gap-8 px-6 py-10 pb-32">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs tracking-widest text-ink-secondary uppercase">
            {parentName ? `Hi, ${parentName.split(" ")[0]}` : "Welcome back"}
          </span>
          <Link
            href="/auth/signout"
            className="text-xs text-ink-muted underline-offset-2 hover:underline"
          >
            Sign out
          </Link>
        </div>
        <h1
          className="font-display"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "var(--text-h1)",
            lineHeight: 1.1,
          }}
        >
          {householdName}
        </h1>
        <div className="flex flex-wrap gap-2">
          {focusPillars.map((p) => (
            <span
              key={p}
              className="rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: PILLAR_COPY[p].tint }}
            >
              {PILLAR_COPY[p].title}
            </span>
          ))}
        </div>
      </header>

      <section className="flex justify-center rounded-lg bg-card p-6 shadow-sm">
        <FamilyGrowthRadar scores={growthScores} />
      </section>

      <section className="flex flex-col gap-3">
        <h2
          className="text-sm font-medium tracking-widest text-ink-secondary uppercase"
        >
          Your family
        </h2>
        <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {kids.map((c) => (
            <ChildCard key={c.childId} {...c} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2
          className="text-sm font-medium tracking-widest text-ink-secondary uppercase"
        >
          Waiting for your approval
        </h2>
        <ApprovalQueue items={pendingApprovals} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium tracking-widest text-ink-secondary uppercase">
          Family Coach
        </h2>
        <Link
          href="/coach"
          className="group flex items-start gap-4 rounded-lg bg-card p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-50 text-2xl">
            ☕
          </div>
          <div className="flex-1">
            <p className="font-medium text-ink-primary">
              Ask the Family Coach.
            </p>
            <p className="mt-1 text-sm text-ink-secondary">
              Tailored to your household, focus pillars, and what your kids
              have done recently.
            </p>
          </div>
          <span
            aria-hidden
            className="text-2xl text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-brand-500"
          >
            →
          </span>
        </Link>
      </section>
    </main>
  );
}
