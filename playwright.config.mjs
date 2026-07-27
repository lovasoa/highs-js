import { defineConfig, devices } from "@playwright/test";

const desktopTestIgnore = /demo-mobile\.spec\.mjs/;

export default defineConfig({
  testDir: "./tests/demo",
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 30_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "node tests/demo/demo-server.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: desktopTestIgnore,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      testIgnore: desktopTestIgnore,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testIgnore: desktopTestIgnore,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      testMatch: /demo-mobile\.spec\.mjs/,
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      testMatch: /demo-mobile\.spec\.mjs/,
      use: { ...devices["iPhone 12"] },
    },
  ],
});
