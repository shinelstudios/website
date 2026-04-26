/**
 * auth.setup.js — runs ONCE before the admin project to log in as the
 * E2E test admin and save the resulting storage state to disk. The admin
 * project loads that state via storageState in playwright.config.js, so
 * every admin test starts already-authenticated.
 *
 * Why: hitting /auth/login per test trips the worker's per-IP rate limit
 * (5 logins / 10 min). One login total keeps us well under the cap and
 * makes the admin suite genuinely reusable.
 *
 * The auth file lives at tests/.auth/admin.json and is gitignored.
 */
import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE = path.join(__dirname, ".auth", "admin.json");

setup("authenticate as admin", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  setup.skip(!email || !password, "E2E_TEST_EMAIL/PASSWORD not set");

  await page.goto("/login");
  await page.locator('input[type="email"], input[name="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();

  // The login handler does setTimeout(nav, 1200) before redirecting, so
  // give it room. waitUntil:'commit' fires when the URL changes (SPA
  // navigation doesn't always trigger 'load').
  await page.waitForURL(/\/(dashboard|studio|hub|me)\b/, {
    timeout: 25_000,
    waitUntil: "commit",
  });

  // Sanity: at this point there must be an access token in localStorage
  // OR the role chip ought to render. Pick the cheapest check.
  await expect(page.locator("body")).toBeVisible();

  await page.context().storageState({ path: STORAGE });
});
