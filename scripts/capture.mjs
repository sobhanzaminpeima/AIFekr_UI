import { chromium } from "playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext();
const page = await context.newPage();
await fs.mkdir("screenshots", { recursive: true });
for (const locale of ["fa", "en"]) {
  await page.goto("http://localhost:3100/home");
  await page.locator(".topbar select:visible").selectOption(locale);
  for (const [name, path] of [
    ["design-system", "/design-system"],
    ["landing", "/"],
    ["auth", "/login"],
    ["create", "/create"],
    ["business", "/business"],
    ["learn", "/learn"],
    ["admin", "/admin/overview"],
  ]) {
    for (const [size, width, height] of [
      ["desktop", 1440, 1000],
      ["mobile", 390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto("http://localhost:3100" + path);
      await page.locator("main:visible").waitFor();
      await page.screenshot({
        path: `screenshots/${name}-${locale}-${size}.png`,
        fullPage: true,
      });
    }
  }
}
console.log("Captured 28 phase review screenshots.");
await browser.close();
