import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { getHouseholdAnthropicKeyMask } from "@/lib/ai/household-key";
import { listDisplayTokens } from "@/lib/display/tokens";
import { AnthropicKeyForm } from "./AnthropicKeyForm";
import { DisplayPairingCard } from "@/components/display/DisplayPairingCard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import {
  CustomQuestsCard,
  type CustomQuestRow,
} from "@/components/quests/CustomQuestsCard";
import {
  CoParentInviteCard,
  type PendingInvite,
} from "@/components/auth/CoParentInviteCard";
import { ChildFocusCard } from "@/components/quests/ChildFocusCard";
import type { PillarSlug } from "@/lib/types/pillar";

export const dynamic = "force-dynamic";
// Bump the function timeout for the Anthropic ping (default 10s on Vercel
// hobby is too tight for a cold start + SDK init + round-trip). Applies to
// every server action invoked from this route.
export const maxDuration = 30;

export default async function SettingsPage() {
  // Pages use getSessionUser (read cookie, no refresh). Middleware does the
  // refresh. Server components can't write rotated cookies anyway.
  const user = await getSessionUser();
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

  const { data: customQuestRows } = await svc
    .from("household_quests")
    .select("id, title, description, pillar, age_min, age_max, xp_reward")
    .eq("household_id", parent.household_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Pending co-parent invites (not accepted, not revoked, not expired).
  const { data: pendingInviteRows } = await svc
    .from("household_invites")
    .select("token, email, created_at, expires_at")
    .eq("household_id", parent.household_id)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  // Co-parents already in this household (other than the current user).
  const { data: coParents } = await svc
    .from("parents")
    .select("id, name, email")
    .eq("household_id", parent.household_id)
    .neq("id", user.id);

  // Per-child focus pillars (this-month goals). Backfilled from
  // household.focus_pillars on existing rows by migration 0010.
  const { data: kidsForFocus } = await svc
    .from("children")
    .select("id, name, avatar, focus_pillars")
    .eq("household_id", parent.household_id)
    .order("age", { ascending: true });

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
          <SignOutButton className="mt-3 inline-block text-sm text-brand-600 underline-offset-2 hover:underline">
            Sign out
          </SignOutButton>
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-widest text-ink-secondary uppercase">
          Co-parents
        </h2>
        {coParents && coParents.length > 0 && (
          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-widest text-ink-muted uppercase">
              Already in your household
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {coParents.map((p) => (
                <li
                  key={p.id as string}
                  className="text-base text-ink-primary"
                >
                  {(p.name as string | null) || "—"}{" "}
                  <span className="text-ink-muted">·</span>{" "}
                  <span className="text-ink-muted">{p.email as string}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-sm text-ink-secondary">
          Invite a co-parent (your spouse, a grandparent, anyone who&apos;ll
          approve quests). They get the same dashboard and the same approval
          queue — no second household to manage.
        </p>
        <CoParentInviteCard
          baseUrl={baseUrl}
          pending={(pendingInviteRows ?? []).map(
            (r): PendingInvite => ({
              token: r.token as string,
              email: (r.email as string | null) ?? null,
              created_at: r.created_at as string,
              expires_at: r.expires_at as string,
            }),
          )}
        />
      </section>

      <section className="mt-10 flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-widest text-ink-secondary uppercase">
          This month&apos;s focus
        </h2>
        <p className="text-sm text-ink-secondary">
          Each kid picks the 2-4 pillars they&apos;re working on this month.
          Their quests, radar, and badges reflect their own focus, not a
          one-size-fits-all household setting.
        </p>
        <div className="flex flex-col gap-3">
          {(kidsForFocus ?? []).map((k) => (
            <ChildFocusCard
              key={k.id as string}
              childId={k.id as string}
              name={(k.name as string) ?? ""}
              avatar={(k.avatar as string) ?? "🦊"}
              initial={
                ((k.focus_pillars as string[] | null) ?? []) as PillarSlug[]
              }
            />
          ))}
        </div>
      </section>

      <section className="mt-10 flex flex-col gap-3">
        <h2 className="text-sm font-medium tracking-widest text-ink-secondary uppercase">
          Custom quests
        </h2>
        <p className="text-sm text-ink-secondary">
          Add quests specific to your family on top of the built-in library —
          chores that matter, traditions, skills you&apos;re working on this
          month. They mix in with the seeded quests based on each kid&apos;s
          age and the pillars you&apos;ve picked.
        </p>
        <CustomQuestsCard
          quests={(customQuestRows ?? []).map(
            (r): CustomQuestRow => ({
              id: r.id as string,
              title: r.title as string,
              description: (r.description as string | null) ?? "",
              pillar: r.pillar as PillarSlug,
              age_min: (r.age_min as number | null) ?? 4,
              age_max: (r.age_max as number | null) ?? 17,
              xp_reward: (r.xp_reward as number | null) ?? 5,
            }),
          )}
        />
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
