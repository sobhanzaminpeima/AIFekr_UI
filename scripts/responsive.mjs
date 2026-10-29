import { chromium } from "playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: 360, height: 800 },
});
const page = await context.newPage();
await page.goto("http://localhost:3100/sitemap-ui");
const foundRoutes = await page
  .locator(".sitemap-grid a")
  .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
const routes=[...new Set(foundRoutes)];
const failures = [];
for (const path of routes) {
  await page.goto("http://localhost:3100" + path);
  await page.locator("main:visible").waitFor();
  const width = await page.evaluate(() => ({
    actual: document.documentElement.scrollWidth,
    expected: innerWidth,
  }));
  if (width.actual > width.expected) failures.push({ path, ...width });
}
await fs.mkdir("reports", { recursive: true });
await fs.writeFile(
  "reports/responsive.json",
  JSON.stringify({ width: 360, routes: routes.length, failures }, null, 2),
);
console.log(JSON.stringify({ routes: routes.length, failures }));
await browser.close();
