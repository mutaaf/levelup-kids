import { redirect } from "next/navigation";
import Link from "next/link";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { getHouseholdAnthropicKey } from "@/lib/ai/household-key";
import { CoachChat } from "./CoachChat";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin?next=/coach");

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) redirect("/onboarding/household");

  const { data: history } = await svc
    .from("coach_messages")
    .select("id, role, content, created_at")
    .eq("household_id", parent.household_id)
    .order("created_at", { ascending: true })
    .limit(40);

  const householdKey = await getHouseholdAnthropicKey(
    parent.household_id as string,
  );
  const hasApiKey = !!householdKey || !!process.env.ANTHROPIC_API_KEY;
  const usingHouseholdKey = !!householdKey;

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col px-6 py-10 pb-32">
      <header className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-ink-secondary underline-offset-2 hover:underline"
        >
          ← Back to family
        </Link>
        <span className="text-xs tracking-widest text-ink-secondary uppercase">
          Family Coach
        </span>
      </header>

      <h1
        className="font-display"
        style={{
          fontFamily: "var(--font-fraunces), ui-serif, Georgia, serif",
          fontSize: "var(--text-h1)",
          lineHeight: 1.1,
        }}
      >
        Ask the Family Coach.
      </h1>
      <p className="mt-2 mb-8 max-w-lg text-ink-secondary">
        The Coach knows your household, your focus pillars, your children&apos;s
        ages, and what they&apos;ve done recently. Ask anything — &quot;How do
        I help Yusuf get into reading?&quot;, &quot;What should we do for
        Ramadan?&quot;, &quot;Layla is bored with athlete quests.&quot;
      </p>

      {!hasApiKey && (
        <div className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <strong className="text-ink-primary">
            Add your Anthropic key to enable the Coach.
          </strong>
          <p className="mt-1 text-ink-secondary">
            Paste an Anthropic API key on the settings screen — it stays
            private to your household and your family pays only for what you
            use. Typical question: a fraction of a penny.
          </p>
          <Link
            href="/settings"
            className="mt-3 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Open settings
          </Link>
        </div>
      )}
      {usingHouseholdKey && (
        <p className="mb-4 text-xs text-ink-muted">
          Using your household&apos;s Anthropic key ·{" "}
          <Link
            href="/settings"
            className="text-brand-600 underline-offset-2 hover:underline"
          >
            change in settings
          </Link>
        </p>
      )}

      <CoachChat
        initial={
          (history ?? []).map((m) => ({
            id: m.id as number,
            role: m.role as "user" | "assistant",
            content: m.content as string,
          })) ?? []
        }
        disabled={!hasApiKey}
      />
    </main>
  );
}
