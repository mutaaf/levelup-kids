import {
  createServerClient,
  type CookieMethodsServer,
  type CookieOptions,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same explicit-cookie-attach pattern as /auth/callback. signOut clears
// the session cookies via setAll; we then write each one to the outgoing
// redirect so the browser actually drops them.
type PendingCookie = {
  name: string;
  value: string;
  options?: CookieOptions;
};

async function clearAndRedirect(request: NextRequest): Promise<Response> {
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

export async function GET(request: NextRequest): Promise<Response> {
  return clearAndRedirect(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return clearAndRedirect(request);
}
