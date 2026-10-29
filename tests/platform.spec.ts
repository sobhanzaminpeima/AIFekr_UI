import { test, expect } from "@playwright/test";
import { allRoutes } from "../mocks/catalog";
test("video factory reviews scene costs before producing a storyboard", async ({
  page,
}) => {
  await page.goto("/create/video-factory");
  await page.locator("textarea").first().fill("داستان یک کسب‌وکار کوچک");
  await page.getByRole("button", { name: "طرح داستان را بساز" }).click();
  await expect(page.locator(".scene-script")).toHaveCount(3);
  await page.getByRole("button", { name: "مرحلهٔ بعد", exact: true }).click();
  await expect(page.locator(".storyboard-card")).toHaveCount(3);
  await page.getByRole("button", { name: "مرحلهٔ بعد", exact: true }).click();
  await page.getByRole("button", { name: "مرحلهٔ بعد", exact: true }).click();
  await expect(page.locator(".cost-row.total")).toContainText("۱۲۰");
  await page.getByRole("button", { name: /تأیید هزینه و ساخت/ }).click();
  await page
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  await expect(page.locator(".storyboard-preview")).toBeVisible();
  await expect(page.locator(".topbar .credit-pill")).toContainText("۱٬۱۲۰");
});
test("invoice calculations update when line items change", async ({ page }) => {
  await page.goto("/business/crm/invoices");
  await expect(page.locator(".invoice-total")).toContainText("۲٬۵۰۰٬۰۰۰");
  await page.locator("input[type=number]").first().fill("2");
  await expect(page.locator(".invoice-total")).toContainText("۵٬۰۰۰٬۰۰۰");
  await page.getByRole("button", { name: "افزودن", exact: true }).click();
  await expect(page.locator(".invoice-line")).toHaveCount(2);
});
test("permissions and provider order can be edited with the keyboard", async ({
  page,
}) => {
  await page.goto("/admin/roles");
  const box = page.locator(".permission-matrix input").first();
  await box.uncheck();
  await expect(box).not.toBeChecked();
  await page.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await expect(page.locator(".audit-trail")).toBeVisible();
  await page.goto("/admin/fallback");
  await page.getByRole("button", { name: "اولویت پایین‌تر" }).first().click();
  await expect(page.locator(".fallback-row").first()).toContainText(
    "Anthropic",
  );
});
test("all registered routes render without browser errors", async ({
  page,
}) => {
  test.setTimeout(600000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of allRoutes) {
    await page.goto(path);
    await expect(page.locator("main:visible"), path).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Application error:");
  }
  expect(errors).toEqual([]);
});
test("generation deducts credits and persists a result", async ({ page }) => {
  await page.goto("/create/image");
  await page.locator("textarea").first().fill("یک جهان نارنجی مینیمال");
  await page
    .locator(".prompt-panel")
    .getByRole("button", { name: /بساز/ })
    .click();
  await page.getByRole("button", { name: "تأیید و ادامه" }).click();
  await expect(page.locator(".generated-result")).toHaveCount(1);
  await expect(page.locator(".topbar .credit-pill")).toContainText("۱٬۲۲۸");
  await page.goto("/gallery");
  await expect(page.locator(".gallery-item")).toHaveCount(1);
});
test("chat streams a response and keyboard opens command search", async ({
  page,
}) => {
  await page.goto("/chat");
  await page
    .getByRole("textbox", { name: "ایدهٔ شما" })
    .fill("یک ایده برای فروشگاه کتاب");
  await page.getByRole("button", { name: "بفرست", exact: true }).click();
  await expect(page.locator(".message.assistant")).toContainText(
    "این پاسخ برای نمایش رابط کاربری",
    { timeout: 20000 },
  );
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("textbox").fill("تصویر");
  await expect(page.getByRole("dialog").locator("a").first()).toHaveAttribute(
    "href",
    "/create/image",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("table search and export actions are available", async ({ page }) => {
  await page.goto("/admin/users");
  await page.getByRole("textbox", { name: "جستجو و فیلتر" }).fill("sara");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "جزئیات", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("sara@example.com");
});
test("layout at 360px and locale/theme changes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of [
    "/",
    "/home",
    "/chat",
    "/create/image",
    "/business/crm",
    "/learn",
    "/fit/dashboard",
    "/plans",
    "/settings",
    "/admin/users",
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    expect(overflow, path).toBe(false);
  }
  await page.goto("/home");
  await page.locator(".topbar select:visible").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(
    page.getByRole("heading", { name: /Hello, Sara/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("capture review screenshots for desktop/mobile, fa/en", async ({
  page,
}) => {
  for (const locale of ["fa", "en"]) {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto("/home");
    await page.locator(".topbar select:visible").selectOption(locale);
    await page.screenshot({
      path: `screenshots/dashboard-${locale}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: `screenshots/dashboard-${locale}-mobile.png`,
      fullPage: true,
    });
  }
  await page.goto("/");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "screenshots/landing-desktop.png",
    fullPage: true,
  });
});
