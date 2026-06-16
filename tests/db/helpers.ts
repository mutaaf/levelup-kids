// Test helpers for RLS specs. Two clients:
//
//   serviceClient()        — uses SUPABASE_SERVICE_ROLE_KEY; bypasses RLS.
//                            Used for seeding fixture rows and asserting
//                            that the server-side path still sees everything.
//
//   userClient(authUserId) — uses the ANON key with a hand-forged HS256 JWT
//                            whose `sub` claim is the given uuid. PostgREST
//                            verifies the JWT against `auth.jwt_secret` and
//                            exposes the `sub` as `auth.uid()` inside RLS
//                            policies. That's how we simulate "logged in as
//                            parent X" without going through magic-link
//                            sign-in (which can't be scripted in CI without
//                            a live mail server).
//
// The supabase local CLI pins the JWT secret to a well-known value; we read
// `SUPABASE_JWT_SECRET` from the env so a future migration to remote-against-
// branch can swap it without touching the helper.
//
// No new top-level deps: HS256 is signed with Node's built-in `crypto`.
// The ticket's engineering note "no new deps beyond what 0001 installed"
// rules out `jsonwebtoken` / `jose`.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, randomUUID } from "node:crypto";

// Supabase local CLI default — see supabase/config.toml; this value is the
// CLI's well-known dev secret and is safe to commit. CI must export the
// matching `SUPABASE_JWT_SECRET` (the workflow does this via
// `supabase status -o env`).
const DEFAULT_LOCAL_JWT_SECRET =
  "super-secret-jwt-token-with-at-least-32-characters-long";

export interface RlsTestEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  jwtSecret: string;
}

/** Returns the env required to run RLS tests, or null when one or more are
 *  missing. Tests use this to skip gracefully on a dev box without Docker. */
export function readRlsTestEnv(): RlsTestEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret =
    process.env.SUPABASE_AUTH_JWT_SECRET ??
    process.env.SUPABASE_JWT_SECRET ??
    DEFAULT_LOCAL_JWT_SECRET;
  if (!url || !anonKey || !serviceRoleKey) return null;
  return { url, anonKey, serviceRoleKey, jwtSecret };
}

export function serviceClient(env: RlsTestEnv): SupabaseClient {
  return createClient(env.url, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Returns a Supabase client authenticated as the given auth.users.id. */
export function userClient(env: RlsTestEnv, authUserId: string): SupabaseClient {
  const token = signSupabaseJwt(env.jwtSecret, authUserId);
  return createClient(env.url, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Base64url without padding — required by JWT spec. */
function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Mints an HS256 JWT shaped like a Supabase user session token. PostgREST
 *  trusts any token signed with `auth.jwt_secret` whose `role` claim is one
 *  of `anon`, `authenticated`, or `service_role`. */
function signSupabaseJwt(secret: string, sub: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub,
    role: "authenticated",
    aud: "authenticated",
    iss: "supabase",
    iat: now,
    exp: now + 60 * 60, // 1h is plenty for a unit test run
  };
  const head = b64url(JSON.stringify(header));
  const body = b64url(JSON.stringify(payload));
  const signature = b64url(
    createHmac("sha256", secret).update(`${head}.${body}`).digest(),
  );
  return `${head}.${body}.${signature}`;
}

/** Provisions an `auth.users` row via the Supabase Admin API and the matching
 *  `parents` row in `public`. Returns the auth user uuid so callers can mint
 *  a session JWT for it via `userClient()`.
 *
 *  We use the Admin API (rather than inserting into `auth.users` directly)
 *  because Supabase computes a handful of generated columns on insert; the
 *  Admin path is the supported one. */
export async function provisionParent(
  env: RlsTestEnv,
  opts: { householdId: string; name: string; role?: "admin" | "parent" },
): Promise<{ authUserId: string; email: string }> {
  const svc = serviceClient(env);
  const email = `test-${randomUUID()}@levelupkids.test`;
  const { data, error } = await svc.auth.admin.createUser({
    email,
    email_confirm: true,
    password: randomUUID(), // unused; we sign our own JWT
  });
  if (error || !data.user) {
    throw new Error(
      `provisionParent: auth.admin.createUser failed: ${error?.message}`,
    );
  }
  const authUserId = data.user.id;
  const { error: parentErr } = await svc.from("parents").insert({
    id: authUserId,
    household_id: opts.householdId,
    name: opts.name,
    email,
    role: opts.role ?? "parent",
  });
  if (parentErr) {
    throw new Error(
      `provisionParent: insert parents failed: ${parentErr.message}`,
    );
  }
  return { authUserId, email };
}

/** Provisions a fresh household + admin parent and returns both ids. */
export async function provisionHouseholdWithParent(
  env: RlsTestEnv,
  opts: { name: string; parentName: string },
): Promise<{ householdId: string; authUserId: string }> {
  const svc = serviceClient(env);
  const { data, error } = await svc
    .from("households")
    .insert({ name: opts.name })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(
      `provisionHouseholdWithParent: insert households failed: ${error?.message}`,
    );
  }
  const { authUserId } = await provisionParent(env, {
    householdId: data.id,
    name: opts.parentName,
    role: "admin",
  });
  return { householdId: data.id, authUserId };
}

/** Truncates every public table that the RLS tests touch. Call inside a
 *  `beforeEach` so each test starts from a clean slate. We can't TRUNCATE
 *  `auth.users` through the JS client, so we drop and re-create them via
 *  the admin API by listing then deleting. */
export async function resetDatabase(env: RlsTestEnv): Promise<void> {
  const svc = serviceClient(env);
  // Order matters because of FKs (children/quests/completions cascade from
  // households, but we go ground-up to be explicit). The service role
  // bypasses RLS, so DELETE-FROM is fine.
  for (const t of [
    "events",
    "quest_completions",
    "quests",
    "children",
    "parents",
    "households",
  ]) {
    const { error } = await svc.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error && !/column .* does not exist/i.test(error.message)) {
      throw new Error(`resetDatabase: delete ${t} failed: ${error.message}`);
    }
  }
  // `events.id` is a bigserial, not a uuid — clear it separately.
  await svc.from("events").delete().neq("id", -1);

  // Auth users — list + delete via admin API. Cheap because each test only
  // provisions 2-3 users.
  const { data: list } = await svc.auth.admin.listUsers({ perPage: 200 });
  for (const u of list?.users ?? []) {
    if (u.email?.endsWith("@levelupkids.test")) {
      await svc.auth.admin.deleteUser(u.id);
    }
  }
}
