import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PLAYWRIGHT_PORT ?? "3002";
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * E2E: `npm run test:e2e`（初回は `npx playwright install chromium`）
 * 既に `next dev` が動いていれば reuseExistingServer で流用します。
 *
 * デスクトップのみ: `npm run test:e2e:desktop`（`--project=desktop-chrome`）
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  timeout: 90_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "mobile-pixel",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-iphone",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `${baseURL}/chokaigi`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
