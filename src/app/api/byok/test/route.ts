import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Ping with the SAME model the Coach uses by default. If the key can hit
// this model, the Coach will work. If not, falling back to an older model
// just gives a false-positive on save. (User reported 2026-06-22 their key
// returned "model not recognized" for the old haiku 3.5 ping.)
const PING_MODEL = "claude-sonnet-4-6";
const PING_FALLBACK_MODELS = [
  "claude-haiku-4-5-20251001",
  "claude-3-5-haiku-latest",
];
const KEY_RE = /^sk-ant-[A-Za-z0-9_-]{20,}$/;
const TIMEOUT_MS = 20_000;

type Result = { ok: true } | { ok: false; error: string };

async function requireUserAndHousehold(): Promise<
  { householdId: string; userId: string } | { error: string; status: number }
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", status: 401 };
  const svc = createServiceSupabase();
  const { data: parent } = await svc
    .from("parents")
    .select("household_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!parent?.household_id)
    return { error: "No household yet.", status: 400 };
  return {
    householdId: parent.household_id as string,
    userId: user.id,
  };
}

/**
 * POST /api/byok/test
 * Body: { key: string }
 * Response: { ok: true } | { ok: false; error: string }
 *
 * Why a route handler and not a server action: server-action RPCs can fail
 * (timeout / cold-start / malformed body) in ways that surface to the
 * client as "An unexpected response was received from the server." Plain
 * HTTP + JSON is bulletproof.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    let body: { key?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<Result>(
        { ok: false, error: "Invalid request body." },
        { status: 400 },
      );
    }

    const key = String(body.key ?? "").trim();
    if (!key) {
      return NextResponse.json<Result>({ ok: false, error: "Paste a key first." });
    }
    if (!KEY_RE.test(key)) {
      return NextResponse.json<Result>({
        ok: false,
        error:
          'That doesn\'t look like an Anthropic key. It should start with "sk-ant-".',
      });
    }

    const ctx = await requireUserAndHousehold();
    if ("error" in ctx) {
      return NextResponse.json<Result>(
        { ok: false, error: ctx.error },
        { status: ctx.status },
      );
    }

    // Try the primary ping model first; on 404 / model-not-found, fall
    // through the fallback list. Any successful ping is a sufficient
    // "key works on this account" signal.
    const modelsToTry = [PING_MODEL, ...PING_FALLBACK_MODELS];
    let lastUpstreamError = `Anthropic ${PING_MODEL} unreachable`;
    let lastStatus = 0;

    for (const model of modelsToTry) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      let r: Response;
      try {
        r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 16,
            messages: [{ role: "user", content: "ping" }],
          }),
          signal: controller.signal,
        });
      } catch (e) {
        clearTimeout(timer);
        if (e instanceof Error && e.name === "AbortError") {
          return NextResponse.json<Result>({
            ok: false,
            error: "Anthropic didn't respond within 20 seconds. Try again.",
          });
        }
        const msg = e instanceof Error ? e.message : "Network error.";
        console.error(`[byok.test] network error for ${model}:`, msg);
        return NextResponse.json<Result>({ ok: false, error: msg });
      }
      clearTimeout(timer);

      const bodyText = await r.text();
      if (r.ok) {
        // Ping succeeded — key works.
        return NextResponse.json<Result>({ ok: true });
      }

      let upstream = `Anthropic ${r.status}`;
      try {
        const j = JSON.parse(bodyText) as {
          error?: { type?: string; message?: string };
        };
        if (j?.error?.message) upstream = j.error.message;
      } catch {
        // not JSON — keep generic message
      }
      lastUpstreamError = upstream;
      lastStatus = r.status;

      // Fast-fail for unambiguous key/account errors — no point retrying
      // other models.
      if (r.status === 401) {
        return NextResponse.json<Result>({
          ok: false,
          error: "Anthropic rejected the key. Check you copied it correctly.",
        });
      }
      if (r.status === 429) {
        return NextResponse.json<Result>({
          ok: false,
          error: "Rate-limited by Anthropic. Wait a few seconds and retry.",
        });
      }
      if (/credit|billing|insufficient/i.test(upstream)) {
        return NextResponse.json<Result>({
          ok: false,
          error:
            "Key is valid but the account has no credit. Add billing on console.anthropic.com.",
        });
      }
      // 404 / model-not-found / not_found_error — try the next model.
      if (
        r.status === 404 ||
        /not.found|model.not.found|model_not_found/i.test(upstream)
      ) {
        console.warn(
          `[byok.test] ${model} unavailable on this account, trying next…`,
        );
        continue;
      }
      // Other error — surface and stop.
      return NextResponse.json<Result>({
        ok: false,
        error: `${upstream} (HTTP ${r.status})`,
      });
    }

    // All fallbacks exhausted with model-not-found errors.
    return NextResponse.json<Result>({
      ok: false,
      error: `None of the Claude models we tried are available on this key (last error: ${lastUpstreamError}, HTTP ${lastStatus}). Save the key anyway — the Coach uses ${PING_MODEL} and will fail with a clearer error if it's not enabled. You may need to enable model access at console.anthropic.com.`,
    });
  } catch (e) {
    console.error("[byok.test] unhandled:", e);
    const msg = e instanceof Error ? e.message : "Unexpected error.";
    return NextResponse.json<Result>(
      { ok: false, error: `Server error: ${msg}` },
      { status: 500 },
    );
  }
}
