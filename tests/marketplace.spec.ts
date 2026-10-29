import { test, expect } from "@playwright/test";
test.use({ actionTimeout: 15000 });
test("coach approval enables products, fulfillment and verified-order feedback", async ({
  page,
}) => {
  await page.goto("/fitness/marketplace?tab=apply");
  await page.locator('main:visible').getByLabel("نام مربی").fill("مربی تست");
  await page.locator('main:visible').getByLabel("ایمیل", { exact: true }).fill("coach@example.com");
  await page.locator('main:visible').getByLabel("تخصص", { exact: true }).fill("تمرین پایه");
  await page
    .locator('main:visible').getByLabel("تجربه و شرح خدمات")
    .fill("توضیح برنامه آزمایشی برای بررسی رابط");
  await page.getByRole("button", { name: "ثبت درخواست محلی" }).click();
  await page.goto("/fitness/marketplace?tab=seller");
  await expect(page.getByRole("button", { name: "محصول تازه" })).toBeDisabled();
  await page.goto("/admin/fitness/marketplace");
  await page.getByRole("button", { name: "تأیید و فعال‌سازی فروشنده" }).click();
  await page.goto("/fitness/marketplace?tab=seller");
  await page.getByRole("button", { name: "محصول تازه" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("عنوان برنامه").fill("برنامه تست چهار هفته");
  await dialog.getByLabel("قیمت نمایشی").fill("300000");
  await dialog.getByLabel("شرح برنامه").fill("توضیحات برنامه آزمایشی");
  await dialog.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await page.goto("/fitness/marketplace?tab=store");
  await page
    .locator("main:visible .market-product")
    .filter({ hasText: "برنامه تست چهار هفته" })
    .getByRole("button", { name: "بررسی و سفارش نمونه" })
    .click();
  await page.getByRole("button", { name: "ثبت سفارش آزمایشی" }).click();
  await page.goto("/fitness/marketplace?tab=orders");
  await expect(
    page.getByRole("button", { name: "ثبت بازخورد خرید" }),
  ).toBeDisabled();
  await page.goto("/fitness/marketplace?tab=seller");
  await page.getByRole("button", { name: "ثبت تکمیل آزمایشی" }).click();
  await page.goto("/fitness/marketplace?tab=orders");
  await page.getByRole("button", { name: "ثبت بازخورد خرید" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("تجربه من")
    .fill("بازخورد سفارش نمونه");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ذخیره کن", exact: true })
    .click();
  await page.goto("/fitness/marketplace?tab=reviews");
  await expect(page.locator("main:visible")).toContainText(
    "بازخورد سفارش نمونه",
  );
  await page.goto("/fitness/marketplace?tab=orders");
  await expect(
    page.getByRole("button", { name: "ثبت بازخورد خرید" }),
  ).toBeDisabled();
});
test("marketplace pages fit mobile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of [
    "/fitness/marketplace",
    "/fitness/marketplace?tab=apply",
    "/fitness/marketplace?tab=store",
    "/admin/fitness/marketplace",
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      path,
    ).toBeTruthy();
  }
});
