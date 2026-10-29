import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT || "3100";
export default defineConfig({
  testDir: "./tests",
  timeout: 120000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${port}`,
    channel: "msedge",
    headless: true,
  },
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
