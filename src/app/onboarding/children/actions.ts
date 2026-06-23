"use server";

import { redirect } from "next/navigation";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { isAvatar } from "@/lib/children/avatars";

export type ChildInput = {
  name: string;
  age: number;
  avatar: string;
};

export type SetChildrenResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setChildren(
  children: ChildInput[],
): Promise<SetChildrenResult> {
  if (!Array.isArray(children) || children.length === 0) {
    return { ok: false, error: "Add at least one child." };
  }
  if (children.length > 3) {
    return { ok: false, error: "You can add up to three children for now." };
  }

  for (const c of children) {
    if (!c.name?.trim()) return { ok: false, error: "Every child needs a name." };
    if (c.name.length > 24)
      return { ok: false, error: "Names must be 24 characters or fewer." };
    if (typeof c.age !== "number" || c.age < 4 || c.age > 17) {
      return { ok: false, error: `Age must be between 4 and 17 (got ${c.age}).` };
    }
    if (!isAvatar(c.avatar)) {
      return { ok: false, error: "Pick an avatar for every child." };
    }
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) {
    return { ok: false, error: "Create your household first." };
  }
  const householdId = parent.household_id as string;

  // Idempotent: delete existing children, insert fresh.
  const { error: delErr } = await svc
    .from("children")
    .delete()
    .eq("household_id", householdId);
  if (delErr) return { ok: false, error: delErr.message };

  const rows = children.map((c) => ({
    household_id: householdId,
    name: c.name.trim(),
    age: c.age,
    avatar: c.avatar,
  }));

  const { error: insErr } = await svc.from("children").insert(rows);
  if (insErr) return { ok: false, error: insErr.message };

  redirect("/onboarding/pillars");
}
