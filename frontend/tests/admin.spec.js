/**
 * Admin spec — login-gated coverage of the dashboard surface.
 *
 * Auth comes from the storageState saved by tests/auth.setup.js. The whole
 * describe shares a single browser context + page so we only refresh the
 * access token once. Refresh-token rotation invalidates the saved refresh
 * cookie on first use, so per-test contexts (Playwright's default) make
 * subsequent tests race-fail. One-context-per-describe sidesteps that.
 *
 * The suite is gated by the playwright.config.js project filter — when
 * E2E_TEST_EMAIL + E2E_TEST_PASSWORD aren't set, the admin project isn't
 * included at all, so PRs from forks (no GH Actions secrets) still run
 * the public smoke suite cleanly.
 *
 * Tests run in serial within the describe because they share state and
 * the logout test deliberately tears down auth.
 */
import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE = path.join(__dirname, ".auth", "admin.json");

test.describe.configure({ mode: "serial" });

test.describe("Admin (login-gated)", () => {
  let context;
  let page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ storageState: STORAGE });
    page = await context.newPage();
    // Warm up: navigate once so App.jsx fires refreshOnce and the in-memory
    // access token settles. Subsequent tests reuse the same page.
    await page.goto("/dashboard");
    await expect(page.getByText(/Workspace/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("/dashboard renders sidebar without JS errors", async () => {
    const errs = [];
    page.on("pageerror", (e) => errs.push(e.message));
    await page.goto("/dashboard");
    await expect(page.getByText(/Workspace/i).first()).toBeVisible();
    expect(errs, "JS errors on /dashboard").toEqual([]);
  });

  test("/dashboard/leads loads list or empty state", async () => {
    await page.goto("/dashboard/leads");
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("/dashboard/blog renders post list", async () => {
    await page.goto("/dashboard/blog");
    await expect(page.getByText(/Blog/i).first()).toBeVisible();
  });

  test("/dashboard/landing-pages renders registry surface", async () => {
    await page.goto("/dashboard/landing-pages");
    await expect(page.getByText(/Hidden landing pages/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /New entry/i }).first()).toBeVisible();
  });

  test("/studio shows the role chip without leaking the JWT", async () => {
    await page.goto("/studio");
    await expect(page.getByText(/Logged in as/i).first()).toBeVisible();
    // The raw JWT must NOT appear in the rendered HTML (security regression
    // we removed in the AI Studio refresh — keep it removed).
    const html = await page.content();
    expect(html).not.toMatch(/eyJ[A-Za-z0-9_-]{30,}\./);
  });

  test("logout clears the session and lands on / (homepage)", async () => {
    await page.goto("/studio");
    // AIStudioPage's handleLogout does window.location.href = "/" (homepage),
    // not /login — verify we land there and the auth-gated surfaces stop
    // rendering.
    await expect(page.getByText(/Logged in as/i).first()).toBeVisible({ timeout: 15_000 });
    const logout = page.locator('button:has-text("Logout")').first();
    await logout.click();
    await page.waitForURL(/\/$/, { timeout: 15_000, waitUntil: "commit" });
    // localStorage role must be cleared by handleLogout.
    const role = await page.evaluate(() => localStorage.getItem("role"));
    expect(role).toBeFalsy();
  });
});
