import {
  createServerClient,
  type CookieMethodsServer,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { handleAuthCallback } from "./handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /auth/callback?code=… — landing target for the magic-link email.
//
// EXPLICIT COOKIE ATTACH PATTERN (third revision, 2026-06-22):
//
// Diagnostic /api/debug/whoami confirmed that even with the "canonical"
// cookies()-from-next/headers pattern, session cookies were NOT making it
// onto the browser after the callback. Suspected: Vercel's route-handler
// runtime doesn't auto-attach cookies() writes to a fresh
// NextResponse.redirect() we return.
//
// Fix: collect the cookies @supabase/ssr wants to set into a plain JS
// array during exchangeCodeForSession, then BUILD the redirect response
// and set each cookie explicitly on it with full original options.
// Bypasses every layer of auto-magic.
type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function GET(request: NextRequest): Promise<Response> {
  const pending: PendingCookie[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(
      new URL(
        "/auth/signin?error=supabase-not-configured",
        request.url,
      ),
    );
  }

  const cookieAdapter: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll().map((c) => ({
        name: c.name,
        value: c.value,
      }));
    },
    setAll(cookiesToSet) {
      for (const c of cookiesToSet) {
        pending.push({
          name: c.name,
          value: c.value,
          options: c.options,
        });
      }
    },
  };

  const supabase = createServerClient(url, anonKey, {
    cookies: cookieAdapter,
  });
  const svc = createServiceSupabase();

  const result = await handleAuthCallback({
    url: new URL(request.url),
    async exchangeCode(code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data?.user) {
        console.warn(
          `[auth.callback] exchangeCode failed: ${error?.message ?? "no user"}`,
        );
        throw new Error(error?.message ?? "exchange-failed");
      }
      console.log(
        `[auth.callback] exchanged code for ${data.user.id} — collected ${pending.length} cookies`,
      );
      return { user: { id: data.user.id, email: data.user.email ?? null } };
    },
    async loadParents(userId) {
      const { data, error } = await svc
        .from("parents")
        .select("id, household_id")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: data.id as string,
        household_id: (data.household_id as string | null) ?? null,
      };
    },
    async upsertParents(row) {
      const { error } = await svc.from("parents").upsert(
        {
          id: row.id,
          email: row.email,
          name: row.name,
          household_id: row.household_id,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
    },
  });

  // Build the redirect, then explicitly attach every cookie supabase asked
  // us to set. This is the line of code that finally makes the session
  // persist to the browser on Vercel.
  const redirectUrl = new URL(result.location, request.url);
  const response = NextResponse.redirect(redirectUrl);
  for (const c of pending) {
    response.cookies.set({
      name: c.name,
      value: c.value,
      ...(c.options ?? {}),
    });
  }
  // No-store so no edge cache ever strips the Set-Cookie headers.
  response.headers.set("Cache-Control", "no-store, max-age=0");

  console.log(
    `[auth.callback] redirecting to ${result.location} with ${pending.length} Set-Cookie headers`,
  );

  return response;
}
