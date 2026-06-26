import { redirect } from "next/navigation";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { ChildrenForm } from "./ChildrenForm";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

export const dynamic = "force-dynamic";

export default async function ChildrenOnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/signin?next=/onboarding/children");

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) {
    redirect("/onboarding/household");
  }

  const { data: existing } = await svc
    .from("children")
    .select("id, name, age, avatar")
    .eq("household_id", parent.household_id);

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col gap-8 px-6 py-10 sm:py-16">
      <OnboardingProgress step={2} total={3} label="Add your kids" />
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
          Add your kids.
        </h1>
        <p className="mt-3 max-w-lg text-lg text-ink-secondary">
          Just a first name, an age, and an avatar they get to pick. We
          don&apos;t ask for anything else.
        </p>
      </div>
      <ChildrenForm
        initial={
          existing?.map((c) => ({
            name: c.name as string,
            age: c.age as number,
            avatar: c.avatar as string,
          })) ?? []
        }
      />
    </main>
  );
}
