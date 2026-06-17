import { redirect } from "next/navigation";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { ChildrenForm } from "./ChildrenForm";

export const dynamic = "force-dynamic";

export default async function ChildrenOnboardingPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col px-6 py-12">
      <div className="mb-8 flex items-center gap-2 text-xs tracking-widest text-ink-secondary uppercase">
        <span className="inline-block size-2 rounded-full bg-brand-500" />
        Step 2 of 3
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
        Add your children.
      </h1>
      <p className="mt-3 mb-8 max-w-lg text-ink-secondary">
        Up to three. Just a first name, age, and an avatar they get to pick.
        We don&apos;t collect anything else.
      </p>
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
