import { notFound, redirect } from "next/navigation";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { AcceptInviteButton } from "./AcceptInviteButton";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const svc = createServiceSupabase();
  const { data: invite } = await svc
    .from("household_invites")
    .select(
      "id, token, household_id, expires_at, accepted_at, accepted_by, revoked_at, invited_by, households:households(name), parents:parents!household_invites_invited_by_fkey(name)",
    )
    .eq("token", token)
    .maybeSingle();
  if (!invite) notFound();

  const isRevoked = !!invite.revoked_at;
  const isExpired =
    invite.expires_at &&
    new Date(invite.expires_at as string).getTime() < Date.now();
  const isAccepted = !!invite.accepted_at;

  const household = invite.households as unknown as {
    name: string | null;
  } | null;
  const inviter = invite.parents as unknown as {
    name: string | null;
  } | null;

  const user = await getSessionUser();
  const householdName = household?.name?.trim() || "Their family";
  const inviterName = inviter?.name?.trim() || "A parent";

  // If user is signed in AND already in this household, just bounce home.
  if (user) {
    const { data: parent } = await svc
      .from("parents")
      .select("household_id")
      .eq("id", user.id)
      .maybeSingle();
    if (parent?.household_id === invite.household_id) {
      redirect("/");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-screen-sm flex-col gap-8 px-6 py-12">
      <header className="flex items-center gap-2.5">
        <span
          className="inline-flex size-10 items-center justify-center rounded-2xl bg-brand-500 font-bold text-white shadow-md"
          style={{ letterSpacing: "-0.04em" }}
          aria-hidden
        >
          L
        </span>
        <span className="text-lg font-bold text-ink-primary">LevelUp Kids</span>
      </header>

      {isRevoked || isExpired ? (
        <section className="flex flex-col gap-4 rounded-3xl bg-card p-8 shadow-md">
          <h1
            className="font-display text-3xl"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            This invite is no longer active.
          </h1>
          <p className="text-base text-ink-secondary">
            {isRevoked
              ? "Whoever sent it removed it before you got here."
              : "It expired. Ask them for a fresh link."}
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-5 rounded-3xl bg-card p-8 shadow-md">
          <p className="text-sm font-bold tracking-wide text-brand-600 uppercase">
            You&apos;re invited
          </p>
          <h1
            className="font-display"
            style={{
              fontFamily: "var(--font-fraunces)",
              fontSize: "clamp(28px, 5vw, 40px)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            Join {householdName} on LevelUp Kids.
          </h1>
          <p className="text-base text-ink-secondary">
            {inviterName} added you as a co-parent. You&apos;ll see the same
            family dashboard, approve quests, and watch your kids level up
            together.
          </p>

          {user ? (
            <AcceptInviteButton
              token={token}
              alreadyAccepted={isAccepted && invite.accepted_by === user.id}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-secondary">
                First, sign in with the email you want to use as a co-parent.
                We&apos;ll send you a 6-digit code.
              </p>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href={`/auth/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
                className="btn-huge w-fit"
              >
                Sign in to accept
              </a>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
