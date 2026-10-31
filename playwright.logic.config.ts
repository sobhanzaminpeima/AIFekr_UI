import { defineConfig } from "@playwright/test";
// Pure logic checks: no browser, server, credentials or paid provider calls.
export default defineConfig({ testDir: "./tests", testMatch: ["media-outcome.spec.ts", "live-accounting.spec.ts", "live-social.spec.ts", "live-leads.spec.ts", "live-stream.spec.ts", "live-batch-modules.spec.ts", "live-seo.spec.ts", "live-stream.spec.ts", "live-batch-modules.spec.ts", "live-seo.spec.ts"], workers: 1 });
