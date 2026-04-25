// Playwright config — smoke suite for shinelstudios.in surfaces.
// Runs in two browsers (Chromium + WebKit) on every PR via .github/workflows/playwright.yml.
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT || 4173);
const PREVIEW_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${PORT}`;

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
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
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
