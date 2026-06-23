import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// Canonical pattern: cookies() store in route handler; the supabase client
// writes the cleared session cookies via that store; we return a fresh
// redirect and Next 15 attaches the Set-Cookie headers to it.
async function clearAndRedirect(request: NextRequest): Promise<Response> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}

export async function GET(request: NextRequest): Promise<Response> {
  return clearAndRedirect(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return clearAndRedirect(request);
}
