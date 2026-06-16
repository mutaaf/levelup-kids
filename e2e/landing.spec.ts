import { expect, test } from "@playwright/test";

// Acceptance criterion (ticket 0001):
// "One smoke spec asserts the landing page loads on both projects."
// Two projects are configured: `chromium` and `mobile-webkit`.
test("landing page renders the founding promise", async ({ page }) => {
  await page.goto("/");
  const heading = page.getByRole("heading", {
    level: 1,
    name: "Raise the kind of adult you actually want to raise.",
  });
  await expect(heading).toBeVisible();
  // The H1 must render in Fraunces (display face).
  const family = await heading.evaluate(
    (el) => window.getComputedStyle(el).fontFamily,
  );
  expect(family.toLowerCase()).toContain("fraunces");
});
