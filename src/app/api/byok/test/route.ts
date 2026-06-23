import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// `claude-3-5-haiku-20241022` is the smallest, fastest, longest-GA Anthropic
// model. Use it for the ping so we never trip a "model not available" 404
// against a key on a restricted plan. Coach calls still pick their own model
// (Sonnet 4.6 by default) via src/lib/ai/client.ts.
const PING_MODEL = "claude-3-5-haiku-20241022";
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
          model: PING_MODEL,
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
      console.error("[byok.test] network error:", msg);
      return NextResponse.json<Result>({ ok: false, error: msg });
    }
    clearTimeout(timer);

    const bodyText = await r.text();
    if (r.ok) {
      return NextResponse.json<Result>({ ok: true });
    }

    let upstream = `Anthropic ${r.status}`;
    try {
      const j = JSON.parse(bodyText) as {
        error?: { type?: string; message?: string };
      };
      if (j?.error?.message) upstream = j.error.message;
    } catch {
      // bodyText wasn't JSON — keep generic status code message
    }

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
    if (r.status === 404 || /model/i.test(upstream)) {
      return NextResponse.json<Result>({
        ok: false,
        error: `Anthropic doesn't recognize the ping model (${PING_MODEL}). Save the key anyway — most Coach operations will still work.`,
      });
    }
    return NextResponse.json<Result>({
      ok: false,
      error: `${upstream} (HTTP ${r.status})`,
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
