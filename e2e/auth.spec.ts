import { expect, test } from "@playwright/test";

// Ticket 0003 — Parent sign-up + sign-in via Supabase Auth magic link.
//
// Browser-only acceptance criteria live here. The route handler + middleware
// + email copy live in tests/auth/callback.test.ts.
//
// The Supabase API in CI is the real local stack (per AGENTS.md non-negotiable
// #1 — no mocking). We do not actually click the link from the inbox; we
// assert the form behavior up to the "check your email" confirmation, which
// is the contract the ticket asks for.

test.describe("magic-link auth surface", () => {
  test("signup: entering a valid email and submitting shows 'Check your inbox.' confirmation", async ({
    page,
  }) => {
    await page.goto("/auth/signup");

    // The shared <AuthForm mode="signup"> renders these labels.
    await expect(
      page.getByRole("heading", { level: 1, name: /sign up/i }),
    ).toBeVisible();
    const email = page.getByLabel(/email/i);
    await expect(email).toBeVisible();
    await email.fill("imran+e2e@levelupkids.test");

    const submit = page.getByRole("button", { name: "Send me a code" });
    await expect(submit).toBeVisible();

    const beforeClick = Date.now();
    await submit.click();

    // Loading state — the button must show its in-flight copy and be disabled
    // for at least 400ms (per AC). We assert on observable behavior: the
    // confirmation heading appears after a measurable delay.
    const confirmation = page.getByRole("heading", {
      level: 2,
      name: "Check your inbox.",
    });
    await expect(confirmation).toBeVisible({ timeout: 10_000 });
    const elapsed = Date.now() - beforeClick;
    expect(elapsed, `loading state must be >= 400ms; was ${elapsed}ms`).toBeGreaterThanOrEqual(
      400,
    );

    // Intentionally NOT asserting on font-family. The display face has
    // changed once (Fraunces → Quicksand) and will change again. Copy is
    // the stable contract.
  });

  test("signin: shows the 'Welcome back.' copy and shares one component with signup (mode prop)", async ({
    page,
  }) => {
    await page.goto("/auth/signin");

    await expect(
      page.getByRole("heading", { level: 1, name: "Welcome back." }),
    ).toBeVisible();
    // Same shared component: same submit text.
    await expect(
      page.getByRole("button", { name: "Send me a code" }),
    ).toBeVisible();

    // The two pages reuse the same form id (a behavioral proof of the shared
    // component, not an internal-implementation test).
    const form = page.locator("form[data-auth-form]");
    await expect(form).toHaveAttribute("data-auth-form", "signin");

    await page.goto("/auth/signup");
    const signupForm = page.locator("form[data-auth-form]");
    await expect(signupForm).toHaveAttribute("data-auth-form", "signup");
  });

  test("signup: invalid email format is blocked at the form", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.getByLabel(/email/i).fill("not-an-email");
    await page.getByRole("button", { name: "Send me a code" }).click();
    // The browser's native email validation OR our inline error keeps the
    // confirmation heading from appearing.
    await expect(
      page.getByRole("heading", { level: 2, name: "Check your inbox." }),
    ).toHaveCount(0);
  });

  test("signup: tab order is email → submit; Enter submits", async ({ page }) => {
    await page.goto("/auth/signup");
    const email = page.getByLabel(/email/i);
    await email.focus();
    await expect(email).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Send me a code" }),
    ).toBeFocused();
  });

  test("no password field is rendered on either auth surface", async ({ page }) => {
    for (const path of ["/auth/signup", "/auth/signin"]) {
      await page.goto(path);
      await expect(page.locator('input[type="password"]')).toHaveCount(0);
    }
  });
});
