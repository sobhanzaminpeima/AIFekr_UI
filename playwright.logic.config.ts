import { defineConfig } from "@playwright/test";
// Pure logic checks: no browser, server, credentials or paid provider calls.
export default defineConfig({ testDir: "./tests", testMatch: ["media-outcome.spec.ts", "live-accounting.spec.ts"], workers: 1 });
