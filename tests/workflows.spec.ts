import { test, expect } from "@playwright/test";
test.use({actionTimeout:15000});

test('lead form responses convert into linked CRM contacts',async({page})=>{
 await page.goto('/lead-gen?tab=forms');await page.getByRole('button',{name:'ساخت فرم جذب'}).click();await page.getByRole('dialog').getByLabel('عنوان فرم').fill('فرم درخواست مشاوره');await page.getByRole('dialog').getByRole('button',{name:'ذخیره کن'}).click();await page.getByRole('link',{name:'پیش‌نمایش فرم'}).click();await page.locator("main:visible").getByLabel('نام',{exact:true}).fill('سرنخ تازه');await page.locator("main:visible").getByLabel('ایمیل',{exact:true}).fill('lead@example.com');await page.getByRole('button',{name:'ثبت پاسخ محلی'}).click();await page.goto('/lead-gen?tab=inbox');await page.getByRole('button',{name:'تبدیل به مخاطب CRM'}).click();await page.goto('/crm?tab=contacts');await page.getByRole('textbox',{name:'جستجوی رکوردها'}).fill('lead@example.com');await expect(page.locator('.domain-table tbody tr')).toHaveCount(1);await expect(page.locator('.domain-table tbody')).toContainText('سرنخ تازه');
});
test('voice agent knowledge is used by its local simulator',async({page})=>{
 await page.goto('/voice-agent?tab=setup');await page.locator("main:visible").getByLabel('نام منشی').fill('منشی تست');await page.locator("main:visible").getByLabel('کسب‌وکار',{exact:true}).fill('استودیو');await page.locator("main:visible").getByLabel('پیام خوش‌آمد').fill('سلام، خوش آمدید');await page.getByRole('button',{name:'بعدی',exact:true}).click();await page.getByRole('button',{name:'بعدی',exact:true}).click();await page.getByRole('button',{name:'ذخیره کن'}).click();await page.goto('/voice-agent?tab=knowledge');await page.getByRole('button',{name:'افزودن پرسش و پاسخ'}).click();await page.getByRole('dialog').getByLabel('پرسش یا کلیدواژه').fill('قیمت');await page.getByRole('dialog').getByLabel('پاسخ تأییدشده').fill('قیمت پس از مشاوره اعلام می‌شود');await page.getByRole('dialog').getByRole('button',{name:'ذخیره کن'}).click();await page.goto('/voice-agent?tab=agents');await page.locator("main:visible").getByLabel('سؤال تماس‌گیرنده').fill('قیمت چقدر است؟');await page.getByRole('button',{name:'آزمایش بدون تماس واقعی'}).click();await expect(page.locator('main').getByRole('status')).toContainText('قیمت پس از مشاوره');await page.goto('/voice-agent?tab=calls');await expect(page.locator('main')).toContainText('قیمت پس از مشاوره');
});

test("balanced journals can be posted and matched to bank transactions", async ({
  page,
}) => {
  await page.goto("/accounting?tab=journal");
  await page.locator("main:visible").getByLabel("شرح سند", { exact: true }).fill("دریافت قرارداد جدید");
  await page.getByRole("button", { name: "افزودن آرتیکل" }).click();
  await page.getByRole("button", { name: "افزودن آرتیکل" }).click();
  await page.locator("main:visible").getByLabel("بدهکار ردیف 1", { exact: true }).fill("2500000");
  await expect(
    page.getByRole("button", { name: "ثبت سند تراز" }),
  ).toBeDisabled();
  await page.locator("main:visible").getByLabel("حساب ردیف 2", { exact: true }).selectOption("4101");
  await page.locator("main:visible").getByLabel("بستانکار ردیف 2", { exact: true }).fill("2500000");
  await page.getByRole("button", { name: "ثبت سند تراز" }).click();
  await expect(
    page.locator(".domain-card").filter({ hasText: "دریافت قرارداد جدید" }),
  ).toHaveCount(1);
  await page.goto("/accounting?tab=bank");
  await page.getByRole("button", { name: "انتخاب سند" }).first().click();
  await page
    .getByLabel("سند هم‌مبلغ", { exact: true })
    .selectOption({
      label: "دریافت قرارداد جدید · " + new Date().toISOString().slice(0, 10),
    });
  await page.getByRole("button", { name: "تأیید تطبیق" }).click();
  await expect(page.getByRole("button", { name: "لغو تطبیق" })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("button", { name: "لغو تطبیق" })).toHaveCount(1);
});
test("payroll calculates compensation and freezes the approved snapshot", async ({
  page,
}) => {
  await page.goto("/accounting?tab=payroll");
  await page.getByRole("button", { name: "ویرایش", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("پاداش", { exact: true }).fill("2000000");
  await dialog.getByLabel("کسورات", { exact: true }).fill("1000000");
  await dialog.getByRole("button", { name: "ذخیره کن" }).click();
  await expect(page.locator(".payroll-total")).toContainText("۱۹٬۰۰۰٬۰۰۰");
  await page.getByRole("button", { name: "محاسبه و ایجاد لیست" }).click();
  await page.getByRole("button", { name: "تأیید لیست" }).click();
  await expect(
    page.getByRole("button", { name: "ویرایش", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "ثبت پرداخت محلی" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "ثبت پرداخت محلی" }),
  ).toBeDisabled();
  await expect(page.locator(".payroll-total")).toContainText("۱۹٬۰۰۰٬۰۰۰");
});
test("closed fiscal periods reject new journal postings", async ({ page }) => {
  await page.goto("/accounting?tab=close-period");
  await page.locator("main:visible").getByLabel("دوره مالی", { exact: true }).fill("2030-01");
  await page.locator(".toggle-row input").check();
  await page.getByRole("button", { name: "بستن و قفل دوره" }).click();
  await page.goto("/accounting?tab=journal");
  await page.locator("main:visible").getByLabel("تاریخ سند", { exact: true }).fill("2030-01-10");
  await expect(page.locator('main').getByRole("alert")).toContainText("دوره بسته");
  await expect(
    page.getByRole("button", { name: "ثبت سند تراز" }),
  ).toBeDisabled();
});
test("CRM links contacts, opportunities, forecast and won revenue", async ({
  page,
}) => {
  await page.goto("/crm?tab=contacts");
  await page.getByRole("button", { name: "افزودن", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("نام", { exact: true })
    .fill("خریدار تست");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ذخیره کن" })
    .click();
  await page.goto("/crm?tab=board");
  await page.getByRole("button", { name: "فرصت فروش جدید" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("عنوان فرصت").fill("قرارداد وب‌سایت");
  await dialog
    .getByLabel("مخاطب", { exact: true })
    .selectOption({ label: "خریدار تست" });
  await dialog.getByLabel("ارزش فرصت").fill("1000000");
  await dialog.getByRole("button", { name: "ذخیره کن" }).click();
  await expect(page.locator(".stats-grid")).toContainText("۵۰۰٬۰۰۰");
  await page.locator("main:visible").getByLabel("مرحله فرصت قرارداد وب‌سایت").selectOption("completed");
  await page.goto("/crm?tab=analytics");
  await expect(page.locator(".stats-grid")).toContainText("۱۰۰٪");
  await expect(page.locator(".stats-grid")).toContainText("۱٬۰۰۰٬۰۰۰");
});
test("social content persists into the local publishing calendar", async ({
  page,
}) => {
  await page.goto("/social?tab=content");
  await page.locator("main:visible").getByLabel("متن و کپشن").fill("خبر تازه برند من");
  await page.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await page.goto("/social?tab=calendar");
  await expect(page.locator("main")).toContainText("خبر تازه برند من");
  await page.getByRole("button", { name: "ویرایش و پیش‌نمایش" }).click();
  await expect(page.getByRole("dialog").getByLabel("متن و کپشن")).toHaveValue(
    "خبر تازه برند من",
  );
});
test("website projects create editable sandboxed pages", async ({ page }) => {
  await page.goto("/website-designer?tab=brief");
  await page.locator("main:visible").getByLabel("نام وب‌سایت").fill("استودیو تست");
  await page.locator("main:visible").getByLabel("مخاطب هدف").fill("تیم‌های کوچک");
  await page.locator("main:visible").getByLabel("هدف و پیام اصلی").fill("ساخت سایت برای برند");
  await page.getByRole("button", { name: "ساخت پروژه وب‌سایت" }).click();
  await page.goto("/website-designer?tab=preview");
  const iframe = page.locator("iframe");
  await expect(iframe).toHaveAttribute("sandbox", "");
  await expect(page.frameLocator("iframe").locator("h1")).toHaveText(
    "استودیو تست",
  );
  await page.locator(".website-editor aside .text-link").first().click();
  await page
    .getByRole("dialog")
    .getByLabel("عنوان بخش")
    .fill("عنوان ویرایش‌شده");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ذخیره کن" })
    .click();
  await expect(page.frameLocator("iframe").locator("h1")).toHaveText(
    "عنوان ویرایش‌شده",
  );
  await page.reload();
  await expect(page.frameLocator("iframe").locator("h1")).toHaveText(
    "عنوان ویرایش‌شده",
  );
});
test("SEO audits inspect supplied HTML rather than inventing metrics", async ({
  page,
}) => {
  await page.goto("/seo?tab=url");
  await page
    .getByLabel("کد HTML برای بررسی")
    .fill(
      '<html><head><title>عنوان تست</title><meta name="description" content="توضیح تست"></head><body><h1>عنوان اصلی</h1><p>یک متن برای بررسی</p><img src="x"></body></html>',
    );
  await page.getByRole("button", { name: "تحلیل محتوای واردشده" }).click();
  await expect(page.locator("main")).toContainText("عنوان تست");
  await expect(
    page.locator(".domain-card").filter({ hasText: "همه تصاویر دارای alt" }),
  ).toContainText("!");
});
test("admin plan pricing and promotions apply to checkout and receipts", async ({
  page,
}) => {
  await page.goto("/admin/packages");
  await page.getByRole("button", { name: "ویرایش طرح" }).nth(1).click();
  await page.getByRole("dialog").getByLabel("قیمت ماهانه").fill("500000");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ذخیره کن" })
    .click();
  await page.goto("/admin/billing/promotions");
  await page.getByRole("button", { name: "کد تخفیف جدید" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("کد", { exact: true })
    .fill("TEST20");
  await page.getByRole("dialog").getByLabel("درصد تخفیف").fill("20");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ذخیره کن" })
    .click();
  await page.goto("/checkout/pro?period=3");
  await expect(page.locator(".checkout-total")).toContainText("۱٬۴۲۵٬۰۰۰");
  await page.locator("main:visible").getByLabel("کد تخفیف", { exact: true }).fill("TEST20");
  await page.getByRole("button", { name: "اعمال", exact: true }).click();
  await expect(page.locator(".checkout-total")).toContainText("۱٬۱۴۰٬۰۰۰");
  await page
    .getByRole("button", { name: "پرداخت آزمایشی", exact: true })
    .click();
  await expect(page).toHaveURL(/checkout\/success/);
  await page.goto("/payments");
  await expect(page.locator("main")).toContainText("۱٬۱۴۰٬۰۰۰");
  await expect(page.locator("main")).toContainText("۷٬۵۰۰");
});
test("fitness completed sets appear in workout history", async ({ page }) => {
  await page.goto("/fitness?tab=gym");
  await page.getByRole("button", { name: "ست ۱", exact: true }).first().click();
  await page.getByRole("button", { name: "ثبت جلسه تمرین" }).click();
  await page.goto("/fitness?tab=history");
  await expect(page.locator("main")).toContainText("تمرین پایه");
  await expect(page.locator(".stats-grid").first()).toContainText("۱");
});
test("new workspaces fit mobile screens", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of [
    "/accounting?tab=journal",
    "/accounting?tab=payroll",
    "/crm?tab=board",
    "/social?tab=content",
    "/seo?tab=content",
    "/website-designer?tab=brief",
    "/startup/builder?tab=canvas",
    "/fitness?tab=gym",
    "/voice-agent?tab=setup",
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
