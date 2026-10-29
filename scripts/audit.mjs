import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext();
const page = await context.newPage();
await page.emulateMedia({ reducedMotion: "reduce" });
const results = [];
for (const path of [
  "/",
  "/home",
  "/chat",
  "/create/image",
  "/settings",
  "/admin/users",
  "/create/video-factory",
  "/business/crm/invoices",
  "/admin/roles",
]) {
  await page.goto("http://localhost:3100" + path);
  await page.locator("main").waitFor();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  results.push({
    path,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
}
await page.goto("http://localhost:3100/home");
await page.getByRole("button", { name: "ظاهر", exact: true }).click();
for (const path of ["/", "/home", "/chat", "/create/image", "/admin/users"]) {
  await page.goto("http://localhost:3100" + path);
  await page.locator('html[data-theme="light"]').waitFor();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  results.push({
    path: path + " [light]",
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
}
await fs.mkdir("reports", { recursive: true });
await fs.writeFile(
  "reports/accessibility.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
await browser.close();
