// Playwright config — smoke suite for shinelstudios.in surfaces.
// Runs in two browsers (Chromium + WebKit) on every PR via .github/workflows/playwright.yml.
import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
const PREVIEW_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;
const HAS_ADMIN_CREDS = !!(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);
const ADMIN_STORAGE = path.join(__dirname, "tests", ".auth", "admin.json");

export default defineConfig({
  testDir: "./tests",
  // Don't bail on first failure — we want the full picture.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI gets a single retry to absorb cold-start flakes; local gets none.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",

  use: {
    baseURL: PREVIEW_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Bots/crawlers UA so the web-vitals beacon and DNT skip in webVitals.js
    // don't fire during tests, keeping noise out of the metrics KV.
    userAgent: "Mozilla/5.0 (compatible; ShinelPlaywrightBot/1.0; +smoke-tests)",
  },

  projects: [
    // Public smoke suites — never touch the admin surface.
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /admin\.spec\.js/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: /admin\.spec\.js/,
    },
    // Admin suite — only enabled when E2E credentials are configured.
    // The setup project performs ONE login and saves storage state;
    // every admin test reuses it (no rate-limit pressure on /auth/login).
    ...(HAS_ADMIN_CREDS
      ? [
          {
            name: "setup",
            testMatch: /auth\.setup\.js/,
          },
          {
            name: "admin",
            testMatch: /admin\.spec\.js/,
            dependencies: ["setup"],
            use: {
              ...devices["Desktop Chrome"],
              storageState: ADMIN_STORAGE,
            },
          },
        ]
      : []),
  ],

  // Spin vite preview server before tests. Skipped on CI when
  // PLAYWRIGHT_SKIP_WEBSERVER=1 (we run npm run build && npm run preview manually).
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run build && npm run preview -- --port " + PORT + " --strictPort",
        url: PREVIEW_URL,
        timeout: 240_000,
        reuseExistingServer: !process.env.CI,
      },
});
