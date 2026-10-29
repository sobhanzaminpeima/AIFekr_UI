const fs = require("node:fs");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage();
  const base = process.env.AIFEKR_PREVIEW_URL || "http://localhost:3100";
  const results = [];
  for (const width of [1440, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/crm?tab=contacts",
      "/fitness?tab=profile",
      "/admin/module-access",
      "/features/crm",
      '/accounting?tab=journal',
      '/accounting?tab=payroll',
      '/crm?tab=board',
      '/social?tab=content',
      '/seo?tab=content',
      '/website-designer?tab=brief',
      '/startup/builder?tab=canvas',
      '/fitness?tab=gym',
      '/voice-agent?tab=setup',
      '/lead-gen?tab=forms',
      '/admin/packages',
    ]) {
      await page.goto(base + route);
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const result = await page.evaluate(async () =>
        window.axe.run(document.querySelector("main"), {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
      );
      results.push({
        route,
        width,
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
  }
  fs.writeFileSync(
    "reports/workspace-accessibility.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    JSON.stringify({
      scans: results.length,
      violations: results.reduce((n, r) => n + r.violations.length, 0),
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
