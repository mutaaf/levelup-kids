import { NextResponse, type NextRequest } from "next/server";
import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";
import { handleAuthCallback } from "./handler";

// GET /auth/callback?code=… — landing target for the magic-link email.
//
// Uses the canonical Supabase Next 15 pattern with cookies() from
// next/headers. The carrier-response trick I tried in a prior fix turned
// out to drop cookie options when round-tripping through
// NextResponse.cookies.getAll() — reverted here.
//
// cookies().set() in a Route Handler DOES propagate to the outgoing
// response, even when that response is a fresh NextResponse.redirect().
// Verified against the official Supabase quickstart.
export async function GET(request: NextRequest): Promise<Response> {
  const supabase = await createServerSupabase();
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
        `[auth.callback] exchanged code for ${data.user.id} (${data.user.email ?? "no email"})`,
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

  const url = new URL(result.location, request.url);
  return NextResponse.redirect(url);
}
