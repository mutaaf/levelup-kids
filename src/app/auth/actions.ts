"use server";

import {
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase/server";

export type EnsureParentsResult = { next: "/onboarding/household" | "/" };

/**
 * Called from AuthForm right after a successful client-side verifyOtp.
 * Ensures a parents row exists for the just-signed-in user and returns
 * the URL to navigate to (onboarding for first-time users; / for returning).
 *
 * Uses createServerSupabase to read the session that the client just set —
 * the cookies were written client-side via verifyOtp, and the server
 * action can read them via cookies().
 */
export async function ensureParentsRow(input: {
  email: string;
}): Promise<EnsureParentsResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Shouldn't happen — client just verified — but treat as "go to signin"
    // by returning the onboarding path. Middleware will gate.
    return { next: "/onboarding/household" };
  }

  const svc = createServiceSupabase();
  const { data: existing } = await svc
    .from("parents")
    .select("id, household_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    await svc.from("parents").upsert(
      {
        id: user.id,
        email: input.email,
        name: "",
        household_id: null,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    return { next: "/onboarding/household" };
  }

  if (!existing.household_id) {
    return { next: "/onboarding/household" };
  }

  return { next: "/" };
}
