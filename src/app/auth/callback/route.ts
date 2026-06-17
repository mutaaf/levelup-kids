import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { handleAuthCallback } from "./handler";

// GET /auth/callback?code=… — landing target for the magic-link email.
//
// Flow (ticket 0003 ACs):
//   1. Exchange the code for a session via supabase.auth.exchangeCodeForSession().
//      The @supabase/ssr server client will write the session cookies onto
//      our outgoing response.
//   2. Look up the parents row (service role bypasses RLS — safe here, the
//      auth.uid() has already been verified by the code exchange).
//   3. Branch:
//        - no parents row → upsert {id, email, name:"", household_id:null}
//          then redirect to /onboarding/household.
//        - parents row exists with household_id NULL → /onboarding/household.
//        - parents row exists with household_id NOT NULL → / (or `?next=`).
export async function GET(request: NextRequest): Promise<Response> {
  const supabase = await createServerSupabase();
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
      // Per ticket 0003 AC: id = auth.uid(), email, name "", household_id null.
      // The 0002 schema originally declared household_id NOT NULL; migration
      // 0002_parents_household_nullable.sql (this ticket) relaxes that so a
      // pre-household parents row is a legal state until /onboarding/household
      // (ticket 0004) fills it in.
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

  // Always-respond: build the redirect against the request's origin so the
  // hosted environment never accidentally redirects to localhost.
  const url = new URL(result.location, request.url);
  return NextResponse.redirect(url);
}
