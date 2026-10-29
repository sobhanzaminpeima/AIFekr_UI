import { test, expect } from "@playwright/test";
test("CRM has specialist navigation and data-based copilot", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "aifekr-domain:CrmDeal",
      JSON.stringify([
        {
          id: "deal-1",
          title: "فرصت تست",
          value: 1000000,
          probability: 50,
          status: "active",
          expectedCloseDate: "2030-01-01",
        },
      ]),
    );
  });
  await page.goto("/crm?tab=board");
  await expect(
    page.locator("main:visible").locator(".crm-suite"),
  ).toBeVisible();
  await expect(
    page
      .locator("main:visible")
      .getByRole("navigation", { name: "ناوبری تخصصی ماژول" }),
  ).toBeVisible();
  await page
    .locator("main:visible")
    .getByRole("button", { name: "AI copilot" })
    .count();
  await page.locator("main:visible").locator(".suite-ai-button").click();
  await expect(
    page.locator("main:visible").locator(".suite-copilot"),
  ).toContainText("۵۰۰٬۰۰۰");
  await page
    .locator("main:visible")
    .getByRole("button", { name: "خلاصه داده‌های من" })
    .click();
  await expect(
    page.locator("main:visible").locator(".suite-answer"),
  ).toContainText("۱ فرصت باز");
  await page
    .locator("main:visible")
    .locator(".suite-sidebar")
    .getByRole("link", { name: "مخاطبان", exact: true })
    .click();
  await expect(
    page.locator("main:visible").locator(".suite-page-heading h1"),
  ).toHaveText("مخاطبان");
});
test("accounting has financial navigation and mobile drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/accounting?tab=overview");
  await expect(
    page.locator("main:visible").locator(".accounting-suite"),
  ).toBeVisible();
  await page
    .locator("main:visible")
    .getByRole("button", { name: "منوی ماژول", exact: true })
    .click();
  await page
    .locator("main:visible")
    .locator(".suite-sidebar")
    .getByRole("link", { name: "حقوق و دستمزد" })
    .click();
  await expect(
    page.locator("main:visible").locator(".suite-page-heading h1"),
  ).toHaveText("حقوق و دستمزد");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
  await page.locator("main:visible").locator(".suite-ai-button").click();
  await expect(
    page.locator("main:visible").locator(".suite-copilot"),
  ).toContainText("تراکنش‌های تطبیق‌نشده");
});
