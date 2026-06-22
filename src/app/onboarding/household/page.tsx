import { redirect } from "next/navigation";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { HouseholdForm } from "./HouseholdForm";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

export const dynamic = "force-dynamic";

export default async function HouseholdOnboardingPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin?next=/onboarding/household");

  // If they already have a household, skip this step.
  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id, name")
    .eq("id", user.id)
    .maybeSingle();
  if (parent?.household_id) {
    redirect("/onboarding/children");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-sm flex-col gap-8 px-6 py-10 sm:py-16">
      <OnboardingProgress step={1} total={3} label="Your household" />
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
          Name your household.
        </h1>
        <p className="mt-3 max-w-md text-lg text-ink-secondary">
          This is the name that&apos;ll appear on every quest, every recap, and
          every Family Growth Score.
        </p>
      </div>
      <HouseholdForm defaultParentName={parent?.name ?? ""} />
    </main>
  );
}
