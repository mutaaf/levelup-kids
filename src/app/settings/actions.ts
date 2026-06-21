"use server";

import { revalidatePath } from "next/cache";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/client";
import {
  clearHouseholdAnthropicKey,
  setHouseholdAnthropicKey,
} from "@/lib/ai/household-key";

export type KeyActionResult =
  | { ok: true }
  | { ok: false; error: string };

const KEY_RE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

async function requireHouseholdId(): Promise<string | { error: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id) return { error: "No household." };
  return parent.household_id as string;
}

/** Save (or replace) the household's Anthropic API key. */
export async function saveAnthropicKey(key: string): Promise<KeyActionResult> {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, error: "Paste a key first." };
  if (!KEY_RE.test(trimmed)) {
    return {
      ok: false,
      error: 'That doesn\'t look like an Anthropic key. It should start with "sk-ant-".',
    };
  }
  const hh = await requireHouseholdId();
  if (typeof hh !== "string") return { ok: false, error: hh.error };

  try {
    await setHouseholdAnthropicKey(hh, trimmed);
    revalidatePath("/settings");
    revalidatePath("/coach");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
}

/**
 * Send a 5-token ping to Anthropic with the pasted key (does NOT save it).
 * Returns ok when the key is valid + has credit; otherwise reflects the API error.
 */
export async function testAnthropicKey(key: string): Promise<KeyActionResult> {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, error: "Paste a key first." };
  if (!KEY_RE.test(trimmed)) {
    return {
      ok: false,
      error: 'That doesn\'t look like an Anthropic key. It should start with "sk-ant-".',
    };
  }
  try {
    const r = await callAI({
      apiKey: trimmed,
      maxTokens: 12,
      temperature: 0,
      messages: [
        { role: "system", content: "Respond with exactly the word OK." },
        { role: "user", content: "ping" },
      ],
    });
    if (!r.text) return { ok: false, error: "Anthropic returned no text." };
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ping failed.";
    // Surface the most useful bits of upstream errors.
    if (/401|invalid_api_key|authentication/i.test(msg)) {
      return { ok: false, error: "Anthropic rejected the key. Check you copied it correctly." };
    }
    if (/credit|billing|insufficient/i.test(msg)) {
      return { ok: false, error: "Key is valid but the account has no credit. Add billing on console.anthropic.com." };
    }
    if (/rate.?limit/i.test(msg)) {
      return { ok: false, error: "Rate-limited by Anthropic. Wait a few seconds and retry." };
    }
    return { ok: false, error: msg };
  }
}

/** Remove the stored key (falls back to env if set). */
export async function clearAnthropicKey(): Promise<KeyActionResult> {
  const hh = await requireHouseholdId();
  if (typeof hh !== "string") return { ok: false, error: hh.error };
  try {
    await clearHouseholdAnthropicKey(hh);
    revalidatePath("/settings");
    revalidatePath("/coach");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Clear failed." };
  }
}
