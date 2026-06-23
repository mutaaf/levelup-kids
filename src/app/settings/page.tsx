import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { getHouseholdAnthropicKeyMask } from "@/lib/ai/household-key";
import { listDisplayTokens } from "@/lib/display/tokens";
import { AnthropicKeyForm } from "./AnthropicKeyForm";
import { DisplayPairingCard } from "@/components/display/DisplayPairingCard";

export const dynamic = "force-dynamic";
// Bump the function timeout for the Anthropic ping (default 10s on Vercel
// hobby is too tight for a cold start + SDK init + round-trip). Applies to
// every server action invoked from this route.
export const maxDuration = 30;

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
  const displays = await listDisplayTokens(parent.household_id as string);

  // Build the base URL from request headers so the Settings UI shows the
  // exact origin a parent's browser is on (works on localhost + Vercel).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-md flex-col px-6 py-10 pb-32">
      <header className="mb-8 flex items-center justify-between">
        {/* Plain <a> so the browser does a hard nav and the home page server
            component reads the freshest cookies on a clean request. Soft nav
            via Next/Link was losing the session somewhere in the
            router-cache/prefetch path. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="text-sm text-ink-secondary underline-offset-2 hover:underline"
        >
          ← Back to family
        </a>
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
          Family display
        </h2>
        <p className="text-sm text-ink-secondary">
          Pair an iPad, Echo Show, old phone, or TV as an always-on household
          scoreboard. Anyone in your family can see who&apos;s leveled up
          today; nobody on the device can sign in or change anything. Generate
          a URL, open it on the device once, leave it there.
        </p>
        <DisplayPairingCard
          displays={displays.map((d) => ({
            token: d.token,
            label: d.label,
            created_at: d.created_at,
            last_seen_at: d.last_seen_at,
          }))}
          baseUrl={baseUrl}
        />
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
