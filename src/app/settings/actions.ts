"use server";

import { revalidatePath } from "next/cache";
import {
  createServiceSupabase,
  getSessionUser,
} from "@/lib/supabase/server";
import { callAI } from "@/lib/ai/client";
import {
  clearHouseholdAnthropicKey,
  setHouseholdAnthropicKey,
} from "@/lib/ai/household-key";

// NOTE: `"use server"` files can only export async functions, so the 30s
// timeout (Vercel hobby defaults to 10s, which an Anthropic call can blow
// past on a cold start) is set on src/app/settings/page.tsx where these
// actions are wired.

export type KeyActionResult =
  | { ok: true }
  | { ok: false; error: string };

const KEY_RE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

async function requireHouseholdId(): Promise<string | { error: string }> {
  const user = await getSessionUser();
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

/**
 * Bulletproof outer wrapper. ANY exception that escapes the inner body
 * gets turned into a serializable `{ ok: false, error }` so the React RPC
 * never receives HTML / a 500 page (which would crash the page with
 * "An unexpected response was received from the server").
 */
async function safe<T>(
  label: string,
  fn: () => Promise<KeyActionResult>,
): Promise<KeyActionResult> {
  try {
    return await fn();
  } catch (e) {
    // Visible in Vercel logs.
    console.error(`[settings.${label}] unhandled:`, e);
    const msg =
      e instanceof Error
        ? `${e.name}: ${e.message}`
        : "Unexpected server error. Check Vercel logs.";
    return { ok: false, error: msg };
  }
}

/** Save (or replace) the household's Anthropic API key. */
export async function saveAnthropicKey(key: string): Promise<KeyActionResult> {
  return safe("saveAnthropicKey", async () => {
    const trimmed = key.trim();
    if (!trimmed) return { ok: false, error: "Paste a key first." };
    if (!KEY_RE.test(trimmed)) {
      return {
        ok: false,
        error:
          'That doesn\'t look like an Anthropic key. It should start with "sk-ant-".',
      };
    }
    const hh = await requireHouseholdId();
    if (typeof hh !== "string") return { ok: false, error: hh.error };

    await setHouseholdAnthropicKey(hh, trimmed);
    revalidatePath("/settings");
    revalidatePath("/coach");
    return { ok: true };
  });
}

/**
 * Send a tiny ping to Anthropic with the pasted key (does NOT save it).
 * Uses Haiku 4.5 — fastest and cheapest model, so the ping returns in 1-2s
 * and won't trip Vercel's function timeout.
 */
export async function testAnthropicKey(key: string): Promise<KeyActionResult> {
  return safe("testAnthropicKey", async () => {
    const trimmed = key.trim();
    if (!trimmed) return { ok: false, error: "Paste a key first." };
    if (!KEY_RE.test(trimmed)) {
      return {
        ok: false,
        error:
          'That doesn\'t look like an Anthropic key. It should start with "sk-ant-".',
      };
    }
    try {
      const r = await callAI({
        apiKey: trimmed,
        model: "claude-haiku-4-5-20251001", // fastest, cheapest — perfect for a ping
        maxTokens: 16,
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
        return {
          ok: false,
          error: "Anthropic rejected the key. Check you copied it correctly.",
        };
      }
      if (/credit|billing|insufficient/i.test(msg)) {
        return {
          ok: false,
          error:
            "Key is valid but the account has no credit. Add billing on console.anthropic.com.",
        };
      }
      if (/rate.?limit|429/i.test(msg)) {
        return {
          ok: false,
          error: "Rate-limited by Anthropic. Wait a few seconds and retry.",
        };
      }
      if (/model.*not.found|404|model_not_found/i.test(msg)) {
        return {
          ok: false,
          error:
            "Anthropic doesn't recognize the test model. Save the key anyway — most other operations will still work.",
        };
      }
      return { ok: false, error: msg };
    }
  });
}

/** Remove the stored key (falls back to env if set). */
export async function clearAnthropicKey(): Promise<KeyActionResult> {
  return safe("clearAnthropicKey", async () => {
    const hh = await requireHouseholdId();
    if (typeof hh !== "string") return { ok: false, error: hh.error };
    await clearHouseholdAnthropicKey(hh);
    revalidatePath("/settings");
    revalidatePath("/coach");
    return { ok: true };
  });
}
