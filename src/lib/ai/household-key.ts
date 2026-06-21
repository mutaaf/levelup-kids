// Household-scoped BYOK helpers. Server-only — never imported from a client
// component. The household_secrets table is service-role only by design
// (no RLS policy for authenticated; see supabase/migrations/0004).

import { createServiceSupabase } from "@/lib/supabase/server";

/** Returns the raw key for the household, or null if none stored. */
export async function getHouseholdAnthropicKey(
  householdId: string,
): Promise<string | null> {
  const svc = createServiceSupabase();
  const { data } = await svc
    .from("household_secrets")
    .select("anthropic_api_key")
    .eq("household_id", householdId)
    .maybeSingle();
  const key = (data?.anthropic_api_key as string | null) ?? null;
  return key && key.trim().length > 0 ? key.trim() : null;
}

/** Returns the masked key (••••••• + last 4) or null. Safe for client display. */
export async function getHouseholdAnthropicKeyMask(
  householdId: string,
): Promise<{ masked: string; updatedAt: string } | null> {
  const svc = createServiceSupabase();
  const { data } = await svc
    .from("household_secrets")
    .select("anthropic_api_key, updated_at")
    .eq("household_id", householdId)
    .maybeSingle();
  const key = (data?.anthropic_api_key as string | null) ?? null;
  if (!key || key.trim().length === 0) return null;
  const trimmed = key.trim();
  const last4 = trimmed.slice(-4);
  return {
    masked: `${"•".repeat(7)}${last4}`,
    updatedAt: (data?.updated_at as string) ?? new Date().toISOString(),
  };
}

/** Save or overwrite the household's Anthropic key. */
export async function setHouseholdAnthropicKey(
  householdId: string,
  key: string,
): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("Empty key.");
  const svc = createServiceSupabase();
  const { error } = await svc.from("household_secrets").upsert(
    {
      household_id: householdId,
      anthropic_api_key: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "household_id" },
  );
  if (error) throw new Error(error.message);
}

/** Remove the household's stored key (revert to env fallback if any). */
export async function clearHouseholdAnthropicKey(
  householdId: string,
): Promise<void> {
  const svc = createServiceSupabase();
  const { error } = await svc
    .from("household_secrets")
    .delete()
    .eq("household_id", householdId);
  if (error) throw new Error(error.message);
}
