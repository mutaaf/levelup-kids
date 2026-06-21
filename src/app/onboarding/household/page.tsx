import { redirect } from "next/navigation";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { HouseholdForm } from "./HouseholdForm";

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
    <main className="mx-auto flex min-h-dvh max-w-screen-sm flex-col px-6 py-12">
      <div className="mb-8 flex items-center gap-2 text-xs tracking-widest text-ink-secondary uppercase">
        <span className="inline-block size-2 rounded-full bg-brand-500" />
        Step 1 of 3
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
        Name your household.
      </h1>
      <p className="mt-3 mb-8 max-w-lg text-ink-secondary">
        We&apos;ll show this name on every Family Growth Score and on the
        weekly recap your family sees together.
      </p>
      <HouseholdForm defaultParentName={parent?.name ?? ""} />
    </main>
  );
}
