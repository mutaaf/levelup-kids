// Server-only helpers for the household-display pairing tokens.
//
// The token IS the auth — opaque, 32 random bytes, base64url-encoded.
// Anyone with the URL can view the household leaderboard until the parent
// revokes the token from /settings.

import { randomBytes } from "node:crypto";
import { createServiceSupabase } from "@/lib/supabase/server";

export type DisplayToken = {
  token: string;
  household_id: string;
  label: string | null;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
};

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createDisplayToken(args: {
  householdId: string;
  createdBy: string;
  label?: string | null;
}): Promise<DisplayToken> {
  const svc = createServiceSupabase();
  const token = newToken();
  const { data, error } = await svc
    .from("household_display_tokens")
    .insert({
      token,
      household_id: args.householdId,
      created_by: args.createdBy,
      label: args.label?.trim() || null,
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(error?.message ?? "createDisplayToken failed");
  }
  return data as DisplayToken;
}

export async function listDisplayTokens(
  householdId: string,
): Promise<DisplayToken[]> {
  const svc = createServiceSupabase();
  const { data, error } = await svc
    .from("household_display_tokens")
    .select("*")
    .eq("household_id", householdId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DisplayToken[];
}

export async function revokeDisplayToken(args: {
  token: string;
  householdId: string;
}): Promise<void> {
  const svc = createServiceSupabase();
  const { error } = await svc
    .from("household_display_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token", args.token)
    .eq("household_id", args.householdId);
  if (error) throw new Error(error.message);
}

/**
 * Resolve a token at view-time. Returns null when not found or revoked.
 * Also bumps last_seen_at so /settings can show "Last seen 3 min ago".
 */
export async function resolveDisplayToken(
  token: string,
): Promise<{ householdId: string; label: string | null } | null> {
  if (!token || token.length < 16) return null;
  const svc = createServiceSupabase();
  const { data, error } = await svc
    .from("household_display_tokens")
    .select("household_id, label, revoked_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  if (data.revoked_at) return null;
  // Best-effort heartbeat — don't block view if it fails.
  void svc
    .from("household_display_tokens")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("token", token);
  return {
    householdId: data.household_id as string,
    label: (data.label as string | null) ?? null,
  };
}
