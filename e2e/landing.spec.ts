import { expect, test } from "@playwright/test";

// Acceptance criterion (ticket 0001):
// "One smoke spec asserts the landing page loads on both projects."
// Two projects are configured: `chromium` and `mobile-webkit`.
//
// We intentionally do NOT assert on font-family — the display face has
// changed once (Fraunces → Quicksand in 2026-06-22) and will change
// again. Copy is the stable contract; font is a stylistic detail.
test("landing page renders the founding promise", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", {
    level: 1,
    name: "Raise the kind of adult you actually want to raise.",
  });
  await expect(heading).toBeVisible();
  // The primary CTA must be present and link to signup.
  const cta = page.getByRole("link", { name: /Start with your family/i });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/auth/signup");
});
