import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test('subscription cards use profile access and never assign unlinked purchases',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('aifekr-admin-user:2',JSON.stringify({plan:'pro',expiry:'2020-01-01',credits:77}));
    localStorage.setItem('aifekr-billing-purchases',JSON.stringify([{id:'unlinked',plan:'pro',amount:123,credits:1,period:1,date:'2026-10-29',status:'paid'}]));
  });
  await page.goto('/admin/subscriptions');
  const card=page.locator('main:visible .admin-customer-card').filter({has:page.getByRole('link',{name:'علی رضایی',exact:true})});
  await expect(card).toContainText('منقضی');
  await expect(card).toContainText('۷۷');
  await expect(card.locator('.domain-detail>div').filter({hasText:'خریدهای مرتبط'})).toContainText('۰');
  await card.getByRole('link',{name:'مدیریت پرونده و اشتراک',exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/users\/2$/);
});
test.use({ actionTimeout: 15000 });
test("receipt IDs select only their own purchase and missing IDs stay empty", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "aifekr-billing-purchases",
      JSON.stringify([
        {
          id: "receipt-a",
          plan: "unique-pro",
          amount: 123456,
          credits: 100,
          period: 1,
          date: "2026-10-01T12:00:00Z",
          status: "paid",
          userId: "2",
        },
        {
          id: "receipt-b",
          plan: "unrelated-plan",
          amount: 50,
          credits: 5,
          period: 1,
          date: "2026-10-02T12:00:00Z",
          status: "failed",
        },
      ]),
    ),
  );
  await page.goto("/admin/financial");
  await page
    .locator("main:visible")
    .getByRole("link", { name: "receipt-a", exact: true })
    .click();
  const invoice = page.locator("main:visible .admin-invoice");
  await expect(invoice).toContainText("unique-pro");
  await expect(invoice).not.toContainText("unrelated-plan");
  await expect(
    invoice.getByRole("link", { name: "علی رضایی" }),
  ).toHaveAttribute("href", "/admin/users/2");
  await page.goto("/admin/financial/invoices/unknown");
  await expect(page.locator("main:visible")).toContainText(
    "رسید این شناسه پیدا نشد",
  );
});
test("sales report excludes failed payments and separates currencies", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "aifekr-billing-purchases",
      JSON.stringify([
        {
          id: "p1",
          plan: "pro",
          amount: 100,
          credits: 1,
          period: 1,
          date: "2026-10-01",
          status: "paid",
          currency: "USD",
        },
        {
          id: "p2",
          plan: "pro",
          amount: 200,
          credits: 1,
          period: 1,
          date: "2026-10-02",
          status: "failed",
          currency: "USD",
        },
        {
          id: "p3",
          plan: "pro",
          amount: 50,
          credits: 1,
          period: 1,
          date: "2026-09-01",
          status: "paid",
          currency: "EUR",
        },
      ]),
    ),
  );
  await page.goto("/admin/revenue");
  const stats = page.locator("main:visible .stats-grid");
  await expect(stats).toContainText("USD");
  await expect(stats).toContainText("EUR");
  const usd = stats.locator(".stat").filter({ hasText: "USD" });
  await expect(usd).toContainText("۱۰۰");
  await expect(usd).not.toContainText("۳۰۰");
  await page.locator("main:visible").getByLabel("از تاریخ").fill("2026-10-01");
  await expect(stats).not.toContainText("EUR");
});
test("credit tiers save and exchange rates calculate from manual configuration", async ({
  page,
}) => {
  await page.goto("/admin/credit-tiers");
  await page
    .locator("main:visible")
    .getByRole("button", { name: "بستهٔ اعتبار تازه" })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("نام بسته", { exact: true }).fill("بسته آزمایش");
  await dialog.getByLabel("تعداد اعتبار").fill("500");
  await dialog.getByLabel("مبلغ به تومان").fill("10000");
  await dialog.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await page.reload();
  await expect(page.locator("main:visible .admin-credit-tier")).toContainText(
    "بسته آزمایش",
  );
  await page.goto("/admin/billing/rates");
  await page
    .locator("main:visible")
    .getByRole("button", { name: "ثبت نرخ", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("نرخ تبدیل", { exact: true }).fill("10");
  await dialog.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await page.locator("main:visible").getByLabel("مبلغ مبدا").fill("5");
  await expect(page.locator("main:visible output")).toHaveText("۵۰ IRT");
});
test("industry bundles retain selected modules", async ({ page }) => {
  await page.goto("/admin/industry-packs");
  await page
    .locator("main:visible")
    .getByRole("button", { name: "بستهٔ صنعتی تازه" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("نام بسته", { exact: true }).fill("املاک آزمایشی");
  await dialog.locator("fieldset input").first().check();
  await dialog.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await expect(page.locator("main:visible")).toContainText("املاک آزمایشی");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("aifekr-industry-packs-v2") || "[]")[0]
          .modules.length,
    ),
  ).toBe(1);
});
test("admin finance routes fit mobile and have no serious accessibility defects", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of [
    "/admin/financial",
    "/admin/financial/customers",
    "/admin/subscriptions",
    "/admin/credit-tiers",
    "/admin/billing/rates",
    "/admin/revenue",
    "/admin/industry-packs",
  ]) {
    await page.goto(url);
    await expect(page.locator("main:visible")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
      url,
    ).toBe(true);
    const result = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      result.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact || ""),
      ),
      url,
    ).toEqual([]);
  }
});
