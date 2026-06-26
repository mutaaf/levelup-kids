import { redirect } from "next/navigation";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { PILLARS } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import { PillarsForm } from "./PillarsForm";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

export const dynamic = "force-dynamic";

export default async function PillarsOnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/signin?next=/onboarding/pillars");

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) redirect("/onboarding/household");

  const { data: household } = await svc
    .from("households")
    .select("focus_pillars")
    .eq("id", parent.household_id)
    .maybeSingle();

  const { count: childCount } = await svc
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("household_id", parent.household_id);
  if (!childCount || childCount === 0) redirect("/onboarding/children");

  const initial = Array.isArray(household?.focus_pillars)
    ? (household.focus_pillars as string[])
    : [];

  const pillarCards = PILLARS.map((slug) => ({
    slug,
    ...PILLAR_COPY[slug],
  }));

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-lg flex-col gap-8 px-6 py-10 sm:py-16">
      <OnboardingProgress step={3} total={3} label="Pick your pillars" />
      <div>
        <h1
          className="font-display text-balance"
          style={{
            fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
            fontSize: "var(--text-h1)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          What are you focusing on this season?
        </h1>
        <p className="mt-3 max-w-xl text-lg text-ink-secondary">
          Pick 2 or 3. Tomorrow morning each kid will see quests built around
          these. You can change them whenever your family changes.
        </p>
      </div>
      <PillarsForm pillars={pillarCards} initial={initial} />
    </main>
  );
}
