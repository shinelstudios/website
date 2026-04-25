/**
 * Smoke suite — fast, broad coverage of the public surfaces. Each test
 * is a single navigation + a handful of assertions. No login flows here
 * (that needs fixtures + a test account); add login-gated tests in a
 * second file when ready.
 *
 * Goal: catch regressions like "DP upload silently fails", "/work
 * crashes after restructure", "scroll position leaks across routes"
 * BEFORE they hit prod.
 */
import { test, expect } from "@playwright/test";

test.describe("Public surfaces", () => {
  test("homepage renders and has primary CTA", async ({ page }) => {
    await page.goto("/");
    // Hero text — the kinetic verb hero ships some always-rendered fragments.
    await expect(page).toHaveTitle(/Shinel/i);
    // At least one anchor or button to /work or /pricing should exist.
    const ctaCount = await page.locator('a[href="/work"], a[href="/pricing"]').count();
    expect(ctaCount).toBeGreaterThan(0);
  });

  test("/work renders services matrix + specialties band", async ({ page }) => {
    await page.goto("/work");
    await expect(page.getByText(/Services/i).first()).toBeVisible();
    // The 3 specialty links should all be present.
    await expect(page.locator('a[href="/work/ai-music"]')).toBeVisible();
    await expect(page.locator('a[href="/work/ai-tattoo"]')).toBeVisible();
    await expect(page.locator('a[href="/work/ai-gfx"]')).toBeVisible();
  });

  test("each AI specialty page renders without errors", async ({ page }) => {
    for (const slug of ["ai-music", "ai-tattoo", "ai-gfx"]) {
      const errs = [];
      page.on("pageerror", (e) => errs.push(e.message));
      await page.goto(`/work/${slug}`);
      // Hero kicker is unique per specialty.
      await expect(page.getByText(/Specialty ·/).first()).toBeVisible();
      expect(errs, `JS errors on /work/${slug}`).toEqual([]);
    }
  });

  test("/pricing loads without crashing", async ({ page }) => {
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto("/pricing");
    await expect(page.getByText(/Pricing|Tier|Plan/i).first()).toBeVisible();
    expect(errs).toEqual([]);
  });

  test("/team renders team directory or empty state", async ({ page }) => {
    await page.goto("/team");
    // Either the team grid OR a graceful empty state — no broken page.
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("404 page renders with back-home link on unknown route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-xyz");
    // NotFound component should mount and offer a way home.
    const homeLink = page.locator('a[href="/"]').first();
    await expect(homeLink).toBeVisible();
  });

  test("scroll-to-top fires on route change (no opens-mid-page bug)", async ({ page }) => {
    await page.goto("/work");
    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.waitForTimeout(150);
    // Click into a specialty page.
    await page.locator('a[href="/work/ai-gfx"]').first().click();
    await page.waitForLoadState("networkidle");
    // After navigation, scrollY should be near 0.
    const y = await page.evaluate(() => window.scrollY);
    expect(y).toBeLessThan(50);
  });
});

test.describe("Tools", () => {
  test("/tools/thumbnail-clickability mounts + has uploader", async ({ page }) => {
    await page.goto("/tools/thumbnail-clickability");
    await expect(page.getByText(/clickable\?/i).first()).toBeVisible();
    // The drop zone is a labeled file input.
    await expect(page.locator('input[type="file"]').first()).toBeAttached();
  });

  test("/tools/channel-audit mounts + has input", async ({ page }) => {
    await page.goto("/tools/channel-audit");
    await expect(page.getByText(/Channel audit/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/MrBeast|youtube/i).first()).toBeVisible();
  });

  test("/tools/content-calendar mounts + generates a plan", async ({ page }) => {
    await page.goto("/tools/content-calendar");
    await expect(page.getByText(/30-day/i).first()).toBeVisible();
    // Should generate at least one slot card by default.
    await expect(page.getByText(/Day 1/i).first()).toBeVisible();
  });
});

test.describe("Login", () => {
  test("/login renders email + password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });
});
