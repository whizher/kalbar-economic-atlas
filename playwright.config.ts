import { defineConfig, devices } from "@playwright/test";

const baseURL = (
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4321/kalbar-economic-atlas/"
).replace(/\/?$/, "/");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run preview -- --host 127.0.0.1",
        url: "http://127.0.0.1:4321/kalbar-economic-atlas/",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000
      }
});
