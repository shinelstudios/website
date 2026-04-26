/**
 * Admin spec — login-gated coverage of the dashboard surface.
 *
 * Skipped when E2E_TEST_EMAIL + E2E_TEST_PASSWORD aren't set in the env,
 * so PRs from forks (no access to GH Actions secrets) still run the
 * public smoke suite cleanly.
 *
 * Owner: this file should hold one test per critical admin surface so a
 * regression that breaks /dashboard/leads or /dashboard/blog gets caught
 * before deploy. Keep tests shallow — single navigation + 2-3 assertions
 * each. Deep workflow tests belong in their own spec.
 */
import { test, expect, HAS_ADMIN_CREDS } from "./_fixtures.js";

test.describe("Admin (login-gated)", () => {
  test.skip(!HAS_ADMIN_CREDS, "E2E admin credentials not configured");

  test("login flow lands on the dashboard or studio", async ({ loggedInAdmin: page }) => {
    // Just being inside the fixture means login worked and the redirect fired.
    expect(page.url()).toMatch(/\/(dashboard|studio|hub|me)\b/);
  });

  test("/dashboard renders sidebar without JS errors", async ({ loggedInAdmin: page }) => {
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto("/dashboard");
    // Sidebar header is rendered by ManagementHub.jsx.
    await expect(page.getByText(/Workspace/i).first()).toBeVisible();
    expect(errs, "JS errors on /dashboard").toEqual([]);
  });

  test("/dashboard/leads loads list or empty state", async ({ loggedInAdmin: page }) => {
    await page.goto("/dashboard/leads");
    // Either rows of leads OR a graceful empty state — no broken page.
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("/dashboard/blog renders post list", async ({ loggedInAdmin: page }) => {
    await page.goto("/dashboard/blog");
    await expect(page.getByText(/Blog/i).first()).toBeVisible();
  });

  test("/dashboard/landing-pages renders registry surface", async ({ loggedInAdmin: page }) => {
    await page.goto("/dashboard/landing-pages");
    await expect(page.getByText(/Hidden landing pages/i).first()).toBeVisible();
    // The "New entry" CTA is the registry's only required affordance.
    await expect(page.getByRole("button", { name: /New entry/i }).first()).toBeVisible();
  });

  test("/studio shows the role chip without leaking the JWT", async ({ loggedInAdmin: page }) => {
    await page.goto("/studio");
    // The new "Logged in as <name> · <role>" chip replaced the old "0 days" UI.
    await expect(page.getByText(/Logged in as/i).first()).toBeVisible();
    // The raw JWT must NOT appear in the rendered HTML (security regression
    // we removed in the AI Studio refresh — keep it removed).
    const html = await page.content();
    expect(html).not.toMatch(/eyJ[A-Za-z0-9_-]{30,}\./);
  });

  test("logout clears the session and lands on /login", async ({ loggedInAdmin: page }) => {
    await page.goto("/studio");
    // Click the logout button — accept either a button or link with that label.
    const logout = page.getByRole("button", { name: /log\s*out|sign\s*out/i }).first();
    if (await logout.count() === 0) {
      // Some surfaces render logout as a link.
      await page.getByRole("link", { name: /log\s*out|sign\s*out/i }).first().click();
    } else {
      await logout.click();
    }
    await page.waitForURL(/\/login\b/, { timeout: 10_000 });
    // Refresh cookie should be cleared (set to past date by /auth/logout).
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "ss_refresh")).toBeUndefined();
  });
});
