import { redirect } from "next/navigation";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { PILLARS } from "@/lib/types/pillar";
import { PILLAR_COPY } from "@/lib/pillars/copy";
import { PillarsForm } from "./PillarsForm";

export const dynamic = "force-dynamic";

export default async function PillarsOnboardingPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    <main className="mx-auto flex min-h-dvh max-w-screen-lg flex-col px-6 py-12">
      <div className="mb-8 flex items-center gap-2 text-xs tracking-widest text-ink-secondary uppercase">
        <span className="inline-block size-2 rounded-full bg-brand-500" />
        Step 3 of 3
      </div>
      <h1
        className="font-display text-balance"
        style={{
          fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
          fontSize: "var(--text-h1)",
          lineHeight: 1.1,
          letterSpacing: "-0.01em",
        }}
      >
        Pick what you&apos;re focusing on this season.
      </h1>
      <p className="mt-3 mb-8 max-w-lg text-ink-secondary">
        Pick 2 or 3. You can change them whenever your family changes.
      </p>
      <PillarsForm pillars={pillarCards} initial={initial} />
    </main>
  );
}
