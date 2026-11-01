import { defineConfig, devices } from "@playwright/test";
import process from "node:process";

// Exercise repository-relative asset URLs, just like GitHub Pages (#32).
const baseURL = "http://127.0.0.1:4173/cse110-project-team3/";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["junit", { outputFile: "test-results/browser.xml" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command:
      "npm run build -- --base /cse110-project-team3/ && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort --base /cse110-project-team3/",
    url: baseURL,
    // Always build fresh; never accidentally test somebody's existing dev server.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
