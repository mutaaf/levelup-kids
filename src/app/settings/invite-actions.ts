"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";

export type InviteResult =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; error: string };

export type RevokeResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

async function householdAndUser(): Promise<
  | { householdId: string; userId: string }
  | { error: string }
> {
  const user = await getSessionUser();
  if (!user) return { error: "Not signed in." };
  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) return { error: "No household." };
  return {
    householdId: parent.household_id as string,
    userId: user.id,
  };
}

/**
 * Generate a co-parent invite. Returns the token so the parent can copy
 * the URL or share it however they want. No email infra required — the
 * parent owns the distribution channel.
 */
export async function createInvite(
  emailHint: string,
): Promise<InviteResult> {
  const ctx = await householdAndUser();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const trimmedHint = emailHint.trim();
  if (trimmedHint && !EMAIL_RE.test(trimmedHint)) {
    return { ok: false, error: "Enter a valid email or leave it blank." };
  }

  const svc = createServiceSupabase();
  const token = newToken();
  const expiresAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await svc.from("household_invites").insert({
    token,
    household_id: ctx.householdId,
    invited_by: ctx.userId,
    email: trimmedHint || null,
    expires_at: expiresAt,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, token, expiresAt };
}

export async function revokeInvite(token: string): Promise<RevokeResult> {
  if (!token) return { ok: false, error: "Missing token." };
  const ctx = await householdAndUser();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const svc = createServiceSupabase();
  const { error } = await svc
    .from("household_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", token)
    .eq("household_id", ctx.householdId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
