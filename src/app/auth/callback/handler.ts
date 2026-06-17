// Pure logic for /auth/callback. Extracted from the Route Handler so the
// branch decision can be unit-tested without spinning up the Next runtime
// or a live Supabase. The Route Handler at route.ts is a thin adapter that
// wires the real Supabase clients into these functions.
//
// Ticket 0003 — Acceptance criteria:
//   - Brand-new user (no parents row) → /onboarding/household.
//   - Returning user with household_id NOT NULL → /.
//   - Returning user with parents row but null household_id → /onboarding/household
//     (their previous run never finished onboarding; resume it).
//   - Missing/invalid code → /auth/signin?error=…
//   - Honor `?next=` for returning users only when it's a same-origin path.

export interface ParentRecord {
  id: string;
  household_id: string | null;
}

export type CallbackResult = { kind: "redirect"; location: string };

export interface CallbackDeps {
  url: URL;
  /** Wraps `supabase.auth.exchangeCodeForSession(code)`. Returns the
   *  authenticated user (id + email) on success; throws on failure. */
  exchangeCode: (
    code: string,
  ) => Promise<{ user: { id: string; email: string | null } }>;
  /** Reads the matching `parents` row, or null if it doesn't exist yet. */
  loadParents: (userId: string) => Promise<ParentRecord | null>;
  /** Inserts the parents row on first sign-in. Idempotent: must accept being
   *  called with an id that already exists (the route handler decides not to
   *  call it in that case, but the test asserts the upsert shape). */
  upsertParents: (row: {
    id: string;
    email: string;
    name: string;
    household_id: string | null;
  }) => Promise<void>;
}

/** Decide where to send the user based on the loaded parents row alone.
 *  Pure; used by handleAuthCallback and directly testable. */
export function decideCallbackDestination(args: {
  parents: ParentRecord | null;
}): "/" | "/onboarding/household" {
  if (!args.parents) return "/onboarding/household";
  if (args.parents.household_id === null) return "/onboarding/household";
  return "/";
}

/** End-to-end callback flow. Returns a `kind: "redirect"` for both success
 *  and recoverable error (always-respond pattern); never throws. */
export async function handleAuthCallback(
  deps: CallbackDeps,
): Promise<CallbackResult> {
  const code = deps.url.searchParams.get("code");
  if (!code) {
    return {
      kind: "redirect",
      location: `/auth/signin?error=${encodeURIComponent("missing-code")}`,
    };
  }

  let user: { id: string; email: string | null };
  try {
    const result = await deps.exchangeCode(code);
    user = result.user;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "exchange-failed";
    return {
      kind: "redirect",
      location: `/auth/signin?error=${encodeURIComponent(reason)}`,
    };
  }

  // Load (and maybe create) the parents row.
  let parents = await deps.loadParents(user.id);
  if (!parents) {
    await deps.upsertParents({
      id: user.id,
      email: user.email ?? "",
      // The name is collected in /onboarding/household (ticket 0004). v1.0
      // intentionally never asks for the parent's name at auth time.
      name: "",
      household_id: null,
    });
    parents = { id: user.id, household_id: null };
  }

  const defaultDestination = decideCallbackDestination({ parents });

  // If the user was originally trying to reach a protected page, we tucked
  // it into ?next=. Honor it only when it's a same-origin path (open-redirect
  // hardening) AND only for returning users — first-timers must go through
  // /onboarding/household so the household exists before they land anywhere.
  const nextRaw = deps.url.searchParams.get("next");
  if (
    nextRaw &&
    defaultDestination === "/" &&
    isSafeSameOriginPath(nextRaw)
  ) {
    return { kind: "redirect", location: nextRaw };
  }

  return { kind: "redirect", location: defaultDestination };
}

function isSafeSameOriginPath(p: string): boolean {
  // Must start with `/` (path), must not start with `//` (protocol-relative
  // open redirect), and must not contain `\` (which some browsers treat as
  // a slash inside a URL).
  if (!p.startsWith("/")) return false;
  if (p.startsWith("//")) return false;
  if (p.includes("\\")) return false;
  return true;
}
