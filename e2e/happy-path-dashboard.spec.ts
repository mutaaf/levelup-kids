import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Happy-path E2E for the parent dashboard.
//
// What this covers:
//   1. Service-role provisions a user + household + child via the admin API.
//   2. Supabase admin.generateLink returns the 6-digit OTP that would
//      normally land in the user's inbox.
//   3. We POST that OTP to our own /api/auth/verify route to mint a
//      session — exactly the same path a real user takes after pasting
//      the code from email. No bypass: we exercise the actual middleware
//      + cookie-attach plumbing.
//   4. We hand the resulting sb-* cookies to Playwright's context.
//   5. Navigate to / and assert ParentDashboard renders the seeded
//      household name and child card.
//
// Why this is high-leverage: it touches the middleware refresh path, the
// service-role parent lookup, the focus-pillars onboarding gate, the child
// card rendering. A regression in any of those will turn this red.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Skip the suite entirely when the env isn't there (local `npm run test:e2e`
// without supabase start). CI sets both before invoking playwright.
test.describe("parent dashboard — happy path", () => {
  test.skip(
    !SUPABASE_URL || !SERVICE_ROLE,
    "requires SUPABASE_URL + SERVICE_ROLE_KEY (CI sets these via supabase status -o env)",
  );

  test("seeded parent sees their household and child after sign-in", async ({
    page,
    baseURL,
  }) => {
    expect(baseURL, "baseURL must be set by playwright.config").toBeTruthy();
    const appBase = baseURL!.replace(/\/+$/, "");

    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Unique per run so reruns don't collide on the unique(email) constraint.
    const stamp = Date.now();
    const email = `e2e-happy-${stamp}@levelupkids.test`;
    const householdName = `E2E ${stamp} Family`;
    const childName = `Mira ${stamp}`;

    // (1) Create the auth user, pre-confirmed so we can OTP-verify against
    //     the SAME email/account in the next step.
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
    expect(createErr, createErr?.message).toBeNull();
    const userId = created.user?.id;
    expect(userId).toBeTruthy();

    // (2) Generate a magic-link to obtain the 6-digit OTP that would land
    //     in the user's inbox in production. admin.generateLink returns
    //     properties.email_otp for the magiclink + email types — that's
    //     the same 6-digit code our /api/auth/verify route consumes.
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
    expect(linkErr, linkErr?.message).toBeNull();
    const otp = (linkData?.properties as { email_otp?: string } | undefined)
      ?.email_otp;
    expect(otp, "generateLink should return email_otp").toMatch(/^\d{6}$/);

    // (3) Seed household + parent + child via the service role BEFORE we
    //     verify the OTP. This is important: /api/auth/verify upserts the
    //     parents row (linking auth user → household) only if a parents
    //     row already exists; otherwise it inserts a new one with a fresh
    //     household_id. We want our seeded household, so insert first.
    const { data: hh, error: hhErr } = await admin
      .from("households")
      .insert({
        name: householdName,
        focus_pillars: ["scholar", "athlete", "character", "purpose"],
      })
      .select("id")
      .single();
    expect(hhErr, hhErr?.message).toBeNull();
    const householdId = hh!.id as string;

    const { error: parentErr } = await admin.from("parents").upsert(
      {
        id: userId,
        email,
        name: "E2E Parent",
        household_id: householdId,
        role: "parent",
      },
      { onConflict: "id" },
    );
    expect(parentErr, parentErr?.message).toBeNull();

    const { error: childErr } = await admin.from("children").insert({
      household_id: householdId,
      name: childName,
      age: 9,
      avatar: "fox",
    });
    expect(childErr, childErr?.message).toBeNull();

    // (4) Mint the session by hitting /api/auth/verify exactly as the
    //     real client does. The response sets HttpOnly sb-* cookies via
    //     Set-Cookie — we'll lift them into the Playwright context.
    const verifyRes = await page.request.post(`${appBase}/api/auth/verify`, {
      data: { email, code: otp },
    });
    expect(
      verifyRes.ok(),
      `verify must succeed; got ${verifyRes.status()} ${await verifyRes.text()}`,
    ).toBeTruthy();

    // Playwright's APIRequestContext shares storage with the page when
    // launched from the same context, so navigating now uses the cookies
    // already attached. Belt-and-suspenders: explicitly confirm by reading
    // back the cookies and asserting at least one sb-* is present.
    const cookies = await page.context().cookies(appBase);
    const sbCookies = cookies.filter((c) => c.name.startsWith("sb-"));
    expect(sbCookies.length, "expected sb-* session cookies after verify")
      .toBeGreaterThan(0);

    // (5) Drive the UI. The dashboard should render the seeded household
    //     name as the H1 and the child card with the seeded child's first
    //     name.
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: householdName }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(childName, { exact: false })).toBeVisible();

    // Cleanup — best-effort; if it fails the next run still gets a
    // unique stamp so nothing collides.
    await admin
      .from("children")
      .delete()
      .eq("household_id", householdId);
    await admin.from("parents").delete().eq("id", userId);
    await admin.from("households").delete().eq("id", householdId);
    await admin.auth.admin.deleteUser(userId!);
  });
});
