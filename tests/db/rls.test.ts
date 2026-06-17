// Ticket 0002 — Postgres schema + RLS coverage.
//
// Each `it()` here corresponds 1:1 to one acceptance-criteria checkbox in
// docs/backlog/0002-schema-rls-households-children-quests.md. A change to
// the AC list must update the spec; a change to the spec must update the
// AC list. The reviewer will check both directions.
//
// Tests run against a real local Supabase (started in CI via
// `supabase start` in the unit-tests job). On a dev box without Docker
// the env vars are absent and `describe.skipIf` short-circuits the suite
// so `npm run test` stays green — but you don't get the proof. Run the
// e2e CI job (or `supabase start && npm run test` locally) to actually
// exercise this file.

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  provisionHouseholdWithParent,
  provisionParent,
  readRlsTestEnv,
  resetDatabase,
  serviceClient,
  userClient,
} from "./helpers";

const env = readRlsTestEnv();
const PILLARS = [
  "scholar",
  "athlete",
  "builder",
  "creator",
  "leader",
  "character",
  "explorer",
  "purpose",
] as const;

describe.skipIf(!env)("0002 — schema + RLS", () => {
  // The skipIf above guards env-nullness; the non-null assertion below is
  // safe inside this block.
  const e = env!;

  beforeEach(async () => {
    await resetDatabase(e);
  });

  afterAll(async () => {
    if (env) await resetDatabase(env);
  });

  describe("schema shape", () => {
    it("creates all six tables from docs/ARCHITECTURE.md §3", async () => {
      const svc = serviceClient(e);
      const { data, error } = await svc.rpc("levelup_test_table_names");
      // If the RPC doesn't exist we fall back to information_schema; the
      // migration ships the helper SQL too.
      if (error) {
        const { data: alt, error: altErr } = await svc
          .from("information_schema.tables" as never)
          .select("table_name")
          .eq("table_schema", "public");
        expect(altErr, altErr?.message).toBeNull();
        const names = new Set((alt as Array<{ table_name: string }> | null)?.map((r) => r.table_name));
        for (const t of ["households", "parents", "children", "quest_templates", "quests", "quest_completions", "events"]) {
          expect(names.has(t), `missing table ${t}`).toBe(true);
        }
        return;
      }
      const names = new Set((data as string[] | null) ?? []);
      for (const t of ["households", "parents", "children", "quest_templates", "quests", "quest_completions", "events"]) {
        expect(names.has(t), `missing table ${t}`).toBe(true);
      }
    });

    it("enables RLS on every public table", async () => {
      const svc = serviceClient(e);
      const { data, error } = await svc.rpc("levelup_test_rls_status");
      expect(error, error?.message).toBeNull();
      const rows = (data as Array<{ table_name: string; rls_enabled: boolean }> | null) ?? [];
      const want = [
        "households",
        "parents",
        "children",
        "quest_templates",
        "quests",
        "quest_completions",
        "events",
      ];
      for (const t of want) {
        const row = rows.find((r) => r.table_name === t);
        expect(row, `no RLS row for ${t}`).toBeDefined();
        expect(row!.rls_enabled, `RLS off for ${t}`).toBe(true);
      }
    });
  });

  describe("households", () => {
    it("a parent can SELECT their own household and only their own", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const b = await provisionHouseholdWithParent(e, { name: "House B", parentName: "Bob" });

      const alice = userClient(e, a.authUserId);
      const { data, error } = await alice.from("households").select("id, name");
      expect(error, error?.message).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(a.householdId);
      expect(ids).not.toContain(b.householdId);
    });

    it("a parent cannot UPDATE another household's name (zero rows affected, no error)", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const b = await provisionHouseholdWithParent(e, { name: "House B", parentName: "Bob" });

      const alice = userClient(e, a.authUserId);
      const { data, error } = await alice
        .from("households")
        .update({ name: "Hacked!" })
        .eq("id", b.householdId)
        .select("id");
      // RLS rule: an UPDATE that matches no row returns [] not an error.
      expect(error, error?.message).toBeNull();
      expect(data ?? []).toEqual([]);
      // Confirm via service-role read that the row is untouched.
      const svc = serviceClient(e);
      const { data: bRow } = await svc
        .from("households")
        .select("name")
        .eq("id", b.householdId)
        .single();
      expect(bRow?.name).toBe("House B");
    });
  });

  describe("children", () => {
    it("a parent can INSERT a child for their own household; cross-household insert is denied", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const b = await provisionHouseholdWithParent(e, { name: "House B", parentName: "Bob" });

      const alice = userClient(e, a.authUserId);

      const okInsert = await alice
        .from("children")
        .insert({ household_id: a.householdId, name: "Kid A", age: 8, avatar: "fox" })
        .select("id, household_id")
        .single();
      expect(okInsert.error, okInsert.error?.message).toBeNull();
      expect(okInsert.data?.household_id).toBe(a.householdId);

      const badInsert = await alice
        .from("children")
        .insert({ household_id: b.householdId, name: "Stolen Kid", age: 8, avatar: "fox" })
        .select("id");
      expect(badInsert.error, "cross-household insert must be denied").not.toBeNull();
    });
  });

  describe("quest_completions", () => {
    it("a parent can approve a completion for a child in their household", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const svc = serviceClient(e);
      const { data: child } = await svc
        .from("children")
        .insert({ household_id: a.householdId, name: "Kid A", age: 8, avatar: "fox" })
        .select("id")
        .single();
      const { data: quest } = await svc
        .from("quests")
        .insert({
          child_id: child!.id,
          title: "Read 15 minutes",
          description: "Read a book for 15 minutes",
          pillar: "scholar",
          type: "daily",
          difficulty: 1,
          xp_reward: 10,
          assigned_for: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      const { data: comp } = await svc
        .from("quest_completions")
        .insert({ quest_id: quest!.id, child_id: child!.id })
        .select("id")
        .single();

      const alice = userClient(e, a.authUserId);
      const { data: approved, error } = await alice
        .from("quest_completions")
        .update({
          approved_by: a.authUserId,
          approved_at: new Date().toISOString(),
          xp_awarded: 10,
        })
        .eq("id", comp!.id)
        .select("id, approved_by, xp_awarded")
        .single();
      expect(error, error?.message).toBeNull();
      expect(approved?.approved_by).toBe(a.authUserId);
      expect(approved?.xp_awarded).toBe(10);
    });

    it("a parent cannot approve a completion for another household's child", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const b = await provisionHouseholdWithParent(e, { name: "House B", parentName: "Bob" });
      const svc = serviceClient(e);
      const { data: child } = await svc
        .from("children")
        .insert({ household_id: b.householdId, name: "Kid B", age: 8, avatar: "fox" })
        .select("id")
        .single();
      const { data: quest } = await svc
        .from("quests")
        .insert({
          child_id: child!.id,
          title: "Read 15 minutes",
          description: "Read",
          pillar: "scholar",
          type: "daily",
          xp_reward: 10,
          assigned_for: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      const { data: comp } = await svc
        .from("quest_completions")
        .insert({ quest_id: quest!.id, child_id: child!.id })
        .select("id")
        .single();

      const alice = userClient(e, a.authUserId);
      const { data, error } = await alice
        .from("quest_completions")
        .update({
          approved_by: a.authUserId,
          approved_at: new Date().toISOString(),
          xp_awarded: 10,
        })
        .eq("id", comp!.id)
        .select("id");
      // RLS denies — no error, just no rows returned.
      expect(error, error?.message).toBeNull();
      expect(data ?? []).toEqual([]);
    });

    it("xp_awarded cannot be changed after approved_at is set (trigger raises)", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const svc = serviceClient(e);
      const { data: child } = await svc
        .from("children")
        .insert({ household_id: a.householdId, name: "Kid A", age: 8, avatar: "fox" })
        .select("id")
        .single();
      const { data: quest } = await svc
        .from("quests")
        .insert({
          child_id: child!.id,
          title: "Read 15 minutes",
          description: "Read",
          pillar: "scholar",
          type: "daily",
          xp_reward: 10,
          assigned_for: new Date().toISOString().slice(0, 10),
        })
        .select("id")
        .single();
      const { data: comp } = await svc
        .from("quest_completions")
        .insert({
          quest_id: quest!.id,
          child_id: child!.id,
          approved_by: a.authUserId,
          approved_at: new Date().toISOString(),
          xp_awarded: 10,
        })
        .select("id")
        .single();

      // Even the service role (which bypasses RLS) must fail this because
      // it's a trigger, not a policy. The trigger is the privacy-by-
      // construction guard: once XP is awarded, the score can't be
      // retroactively rewritten.
      const { error } = await svc
        .from("quest_completions")
        .update({ xp_awarded: 9999 })
        .eq("id", comp!.id);
      expect(error, "trigger should raise when xp_awarded changes after approval").not.toBeNull();
      expect(error?.message ?? "").toMatch(/xp_awarded|approved/i);
    });
  });

  describe("service role + events", () => {
    it("service role can read across households (RLS bypass)", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const b = await provisionHouseholdWithParent(e, { name: "House B", parentName: "Bob" });
      const svc = serviceClient(e);
      const { data, error } = await svc.from("households").select("id");
      expect(error, error?.message).toBeNull();
      const ids = (data ?? []).map((r) => r.id);
      expect(ids).toContain(a.householdId);
      expect(ids).toContain(b.householdId);
    });

    it("events: service role inserts succeed; authenticated client inserts are denied", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const svc = serviceClient(e);
      const { error: svcInsErr } = await svc
        .from("events")
        .insert({ household_id: a.householdId, name: "test_event", props: { ok: true } });
      expect(svcInsErr, svcInsErr?.message).toBeNull();

      const alice = userClient(e, a.authUserId);
      const { error: clientInsErr } = await alice
        .from("events")
        .insert({ household_id: a.householdId, name: "client_attempt", props: {} });
      expect(clientInsErr, "client insert into events must be denied").not.toBeNull();
    });

    it("co-parent in the same household can read its rows; a third-household parent cannot", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const c = await provisionHouseholdWithParent(e, { name: "House C", parentName: "Carol" });
      // Add a co-parent to house A.
      const coParent = await provisionParent(e, {
        householdId: a.householdId,
        name: "Adam",
        role: "parent",
      });
      const svc = serviceClient(e);
      await svc
        .from("children")
        .insert({ household_id: a.householdId, name: "Kid A", age: 8, avatar: "fox" });

      const adam = userClient(e, coParent.authUserId);
      const adamChildren = await adam.from("children").select("name").eq("household_id", a.householdId);
      expect(adamChildren.error, adamChildren.error?.message).toBeNull();
      expect((adamChildren.data ?? []).length).toBe(1);

      const carol = userClient(e, c.authUserId);
      const carolChildren = await carol.from("children").select("name").eq("household_id", a.householdId);
      expect(carolChildren.error, carolChildren.error?.message).toBeNull();
      expect(carolChildren.data ?? []).toEqual([]);
    });
  });

  describe("pillars enum (TS, not DB) + db check constraint", () => {
    it("the DB rejects an unknown pillar on quests", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const svc = serviceClient(e);
      const { data: child } = await svc
        .from("children")
        .insert({ household_id: a.householdId, name: "Kid A", age: 8, avatar: "fox" })
        .select("id")
        .single();
      const { error } = await svc.from("quests").insert({
        child_id: child!.id,
        title: "Bad",
        description: "Bad pillar",
        pillar: "wizardry",
        type: "daily",
        xp_reward: 10,
        assigned_for: new Date().toISOString().slice(0, 10),
      });
      expect(error, "check constraint on pillar should reject unknown value").not.toBeNull();
    });

    it("the DB accepts each of the 8 pillars on quests", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const svc = serviceClient(e);
      const { data: child } = await svc
        .from("children")
        .insert({ household_id: a.householdId, name: "Kid A", age: 8, avatar: "fox" })
        .select("id")
        .single();
      for (const pillar of PILLARS) {
        const { error } = await svc.from("quests").insert({
          child_id: child!.id,
          title: `Test ${pillar}`,
          description: "ok",
          pillar,
          type: "daily",
          xp_reward: 10,
          assigned_for: new Date().toISOString().slice(0, 10),
        });
        expect(error, `pillar ${pillar} should be accepted: ${error?.message}`).toBeNull();
      }
    });

    it("children.age check constraint enforces 4..17 inclusive", async () => {
      const a = await provisionHouseholdWithParent(e, { name: "House A", parentName: "Alice" });
      const svc = serviceClient(e);
      const tooYoung = await svc
        .from("children")
        .insert({ household_id: a.householdId, name: "Tiny", age: 3, avatar: "fox" });
      expect(tooYoung.error, "age 3 should be rejected").not.toBeNull();
      const tooOld = await svc
        .from("children")
        .insert({ household_id: a.householdId, name: "Adult", age: 18, avatar: "fox" });
      expect(tooOld.error, "age 18 should be rejected").not.toBeNull();
    });
  });
});

describe.skipIf(env)("0002 — environment", () => {
  it("warns when SUPABASE_* env is unset (RLS tests skipped locally)", () => {
    // This `it` only runs when env is null. It's a marker so a dev who runs
    // `npm run test` without Docker sees a passing test that names the gap,
    // not silently zero RLS coverage.
    expect(env).toBeNull();
  });
});
