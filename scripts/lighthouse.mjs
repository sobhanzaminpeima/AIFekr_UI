import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import fs from "node:fs/promises";
const chrome = await launch({
  chromePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  chromeFlags: ["--headless=new", "--no-first-run", "--disable-gpu"],
});
try {
  const result = await lighthouse("http://localhost:3100", {
    port: chrome.port,
    output: ["html", "json"],
    onlyCategories: ["accessibility", "best-practices", "performance"],
    logLevel: "error",
  });
  await fs.mkdir("reports", { recursive: true });
  await fs.writeFile("reports/lighthouse.html", result.report[0]);
  await fs.writeFile("reports/lighthouse.json", result.report[1]);
  console.log(
    JSON.stringify(
      Object.fromEntries(
        Object.entries(result.lhr.categories).map(([k, v]) => [k, v.score]),
      ),
    ),
  );
} finally {
  await chrome.kill();
}
