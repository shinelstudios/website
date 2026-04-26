/**
 * Shared Playwright fixtures.
 *
 * `loggedInAdmin` — a page that has already logged in as the dedicated
 * E2E admin. Drives the real /login form so we exercise auth + JWT plumbing
 * end-to-end.
 *
 * Setup (one-time, manual):
 *   1. Generate bcrypt hash of a long random password:
 *        node -e "const b=require('bcryptjs'); console.log(b.hashSync('<pw>',10))"
 *   2. Create the user via the existing admin UI OR via wrangler KV:
 *        wrangler kv:key put "user:e2e-test@shinelstudios.in" \
 *          '{"email":"e2e-test@shinelstudios.in","passwordHash":"<bcrypt>","role":"admin","firstName":"E2E","e2eTest":true}' \
 *          --binding=SHINEL_AUDIT --remote
 *   3. Add GH Actions secrets E2E_TEST_EMAIL + E2E_TEST_PASSWORD.
 *   4. (Optional, local) put the same in `frontend/.env.test` (gitignored).
 *
 * Specs that depend on this fixture should `test.skip(...)` when the env
 * vars are missing so the public smoke suite still runs in forks/PRs that
 * don't have the secrets.
 */
import { test as base, expect } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_TEST_EMAIL || "";
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD || "";

export const HAS_ADMIN_CREDS = Boolean(E2E_EMAIL && E2E_PASSWORD);

export const test = base.extend({
  loggedInAdmin: async ({ page }, use) => {
    await page.goto("/login");
    // Form fields: input[type="email"] / input[type="password"], submit button.
    await page.locator('input[type="email"], input[name="email"]').first().fill(E2E_EMAIL);
    await page.locator('input[type="password"]').first().fill(E2E_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    // After successful login the worker stamps role into the JWT and the
    // frontend redirects to /dashboard or /studio depending on role.
    await page.waitForURL(/\/(dashboard|studio|hub|me)\b/, { timeout: 15_000 });
    await use(page);
  },
});

export { expect };
