import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import type { PillarSlug } from "@/lib/types/pillar";

// Within-request dedupe layer.
//
// React's cache() memoizes the function within a single request — the
// SAME request that touches getCurrentParent() in a page AND in a
// component will get the same row from a single query, not N queries.
//
// Important: do NOT use this for cross-request caching. That's
// unstable_cache() (with tags), introduced in PR B.

/** The Supabase auth user for the current request, or null. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  return getSessionUser();
});

/** The parents row for the current user, or null. */
export const getCurrentParent = cache(
  async (): Promise<{
    id: string;
    name: string | null;
    email: string;
    household_id: string | null;
  } | null> => {
    const user = await getCurrentUser();
    if (!user) return null;
    const svc = createServiceSupabase();
    const { data } = await svc
      .from("parents")
      .select("id, name, email, household_id")
      .eq("id", user.id)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id as string,
      name: (data.name as string | null) ?? null,
      email: (data.email as string) ?? "",
      household_id: (data.household_id as string | null) ?? null,
    };
  },
);

/** The household row for the current user, or null. */
export const getCurrentHousehold = cache(
  async (): Promise<{
    id: string;
    name: string;
    focus_pillars: string[];
  } | null> => {
    const parent = await getCurrentParent();
    if (!parent?.household_id) return null;
    const svc = createServiceSupabase();
    const { data } = await svc
      .from("households")
      .select("id, name, focus_pillars")
      .eq("id", parent.household_id)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id as string,
      name: (data.name as string) ?? "",
      focus_pillars: ((data.focus_pillars as string[] | null) ?? []) as string[],
    };
  },
);

/** Children for the current household, ordered by age (youngest first). */
export const getCurrentChildren = cache(
  async (): Promise<
    Array<{
      id: string;
      name: string;
      age: number;
      avatar: string;
      focusPillars: PillarSlug[];
    }>
  > => {
    const hh = await getCurrentHousehold();
    if (!hh) return [];
    const svc = createServiceSupabase();
    const { data } = await svc
      .from("children")
      .select("id, name, age, avatar, focus_pillars")
      .eq("household_id", hh.id)
      .order("age", { ascending: true });
    return (data ?? []).map((c) => ({
      id: c.id as string,
      name: (c.name as string) ?? "",
      age: (c.age as number) ?? 7,
      avatar: (c.avatar as string) ?? "🦊",
      focusPillars: ((c.focus_pillars as string[] | null) ?? []) as PillarSlug[],
    }));
  },
);
