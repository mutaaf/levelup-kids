import { NextResponse, type NextRequest } from "next/server";
import {
  carryCookies,
  createRouteHandlerSupabase,
} from "@/lib/supabase/route-handler";
import { createServiceSupabase } from "@/lib/supabase/server";
import { handleAuthCallback } from "./handler";

// GET /auth/callback?code=… — landing target for the magic-link email.
//
// CRITICAL: cookies set by supabase.auth.exchangeCodeForSession MUST live on
// the outgoing response, not the cookies() store. See
// src/lib/supabase/route-handler.ts for the why.
export async function GET(request: NextRequest): Promise<Response> {
  const { supabase, carrier } = createRouteHandlerSupabase(request);
  const svc = createServiceSupabase();

  const result = await handleAuthCallback({
    url: new URL(request.url),
    async exchangeCode(code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data?.user) {
        throw new Error(error?.message ?? "exchange-failed");
      }
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

  const url = new URL(result.location, request.url);
  return carryCookies(carrier, NextResponse.redirect(url));
}
