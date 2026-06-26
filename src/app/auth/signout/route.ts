import {
  createServerClient,
  type CookieMethodsServer,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST-ONLY. Used to be GET too — that was a silent-signout bug because
// Next.js <Link href="/auth/signout"> prefetches in production, which
// fires a GET, which signed the user out without them ever clicking.
// User reported 2026-06-22: "I see a sign out request when I goto the
// settings page in the network tab" — exactly this.
//
// Trigger from a real form POST (see src/components/auth/SignOutButton.tsx)
// or a fetch POST. Never a Link or an <a>.
type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

export async function POST(request: NextRequest): Promise<Response> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const pending: PendingCookie[] = [];
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
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn(
      `[auth.signout] signOut threw: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  for (const c of pending) {
    response.cookies.set({
      name: c.name,
      value: c.value,
      ...(c.options ?? {}),
    });
  }
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

// Surface the bug loudly if anything still tries to GET sign-out (any
// stray Link prefetch, an old bookmark, a crawler) so the user notices
// and we can fix the caller instead of silently signing them out.
export function GET(): Response {
  return new NextResponse(
    "Method Not Allowed. Sign out must be POST (use SignOutButton).",
    {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
