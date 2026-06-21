import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<Response> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}

// Allow POST too for forms that prefer it.
export async function POST(request: NextRequest): Promise<Response> {
  return GET(request);
}
