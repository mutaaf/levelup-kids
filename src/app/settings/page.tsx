import { redirect } from "next/navigation";
import Link from "next/link";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { getHouseholdAnthropicKeyMask } from "@/lib/ai/household-key";
import { AnthropicKeyForm } from "./AnthropicKeyForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin?next=/settings");

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id, email, name")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) redirect("/onboarding/household");

  const mask = await getHouseholdAnthropicKeyMask(parent.household_id as string);
  const hasEnvKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col px-6 py-10 pb-32">
      <header className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm text-ink-secondary underline-offset-2 hover:underline"
        >
          ← Back to family
        </Link>
        <span className="text-xs tracking-widest text-ink-secondary uppercase">
          Settings
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
        Settings
      </h1>

      <section className="mt-10 flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-widest text-ink-secondary uppercase">
          Account
        </h2>
        <div className="rounded-lg bg-card p-5 shadow-sm">
          <p className="text-sm text-ink-secondary">Signed in as</p>
          <p className="mt-1 text-ink-primary">
            {(parent.name as string | null) || "—"}{" "}
            <span className="text-ink-muted">·</span>{" "}
            <span className="text-ink-muted">
              {parent.email as string}
            </span>
          </p>
          <Link
            href="/auth/signout"
            className="mt-3 inline-block text-sm text-brand-600 underline-offset-2 hover:underline"
          >
            Sign out
          </Link>
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-widest text-ink-secondary uppercase">
          AI Family Coach
        </h2>
        <p className="text-sm text-ink-secondary">
          The Coach uses Anthropic&apos;s Claude. Paste your own API key here
          and your household pays only for what your family uses. The key is
          stored privately for this household and never sent to your browser
          after you save it.
        </p>
        <AnthropicKeyForm
          currentMask={mask?.masked ?? null}
          updatedAt={mask?.updatedAt ?? null}
          envKeyPresent={hasEnvKey}
        />
        <p className="text-xs text-ink-muted">
          Get a key at{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline-offset-2 hover:underline"
          >
            console.anthropic.com/settings/keys
          </a>{" "}
          · A typical Coach question costs a fraction of a penny.
        </p>
      </section>
    </main>
  );
}
