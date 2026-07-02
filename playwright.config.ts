import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: "**/accessibility/**",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
    },
    {
      name: "webkit",
      dependencies: ["setup"],
      testIgnore: "**/accessibility/**",
      use: {
        ...devices["Desktop Safari"],
        storageState: "playwright/.auth/admin.json",
      },
    },
    {
      name: "broker-setup",
      testMatch: /broker\.auth\.setup\.ts/,
    },
    {
      name: "broker",
      dependencies: ["setup", "broker-setup"],
      testIgnore: "**/accessibility/**",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/broker.json",
      },
    },
    {
      name: "finance-setup",
      testMatch: /finance\.auth\.setup\.ts/,
    },
    {
      name: "finance",
      dependencies: ["setup", "finance-setup"],
      testIgnore: "**/accessibility/**",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/finance.json",
      },
    },
    {
      name: "viewer-setup",
      testMatch: /viewer\.auth\.setup\.ts/,
    },
    {
      name: "viewer",
      dependencies: ["setup", "viewer-setup"],
      testIgnore: "**/accessibility/**",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/viewer.json",
      },
    },
    {
      name: "a11y-login",
      testMatch: "**/accessibility/**",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: `npm run dev -- -p ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
