import { NextResponse, type NextRequest } from "next/server";
import {
  carryCookies,
  createRouteHandlerSupabase,
} from "@/lib/supabase/route-handler";

async function clearSessionAndRedirect(
  request: NextRequest,
): Promise<Response> {
  const { supabase, carrier } = createRouteHandlerSupabase(request);
  await supabase.auth.signOut();
  return carryCookies(carrier, NextResponse.redirect(new URL("/", request.url)));
}

export async function GET(request: NextRequest): Promise<Response> {
  return clearSessionAndRedirect(request);
}

export async function POST(request: NextRequest): Promise<Response> {
  return clearSessionAndRedirect(request);
}
