import { test, expect } from "@playwright/test";
test.use({ actionTimeout: 15000 });
test("admin course preview uses the requested ID and handles missing records", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "aifekr-domain:AiCourse",
      JSON.stringify([
        {
          id: "course-a",
          title: "دوره اختصاصی الف",
          description: "شرح دوره الف",
          status: "draft",
          content: JSON.stringify({
            lessons: [{ title: "درس اول الف", body: "محتوای مخصوص دوره الف" }],
          }),
        },
        { id: "course-b", title: "دوره ب", content: "محتوای نامرتبط ب" },
      ]),
    ),
  );
  await page.goto("/admin/ai-courses/course-a/preview");
  await expect(page.locator("main:visible .admin-course-content")).toHaveText(
    "محتوای مخصوص دوره الف",
  );
  await expect(page.locator("main:visible")).not.toContainText(
    "محتوای نامرتبط ب",
  );
  await page.goto("/admin/ai-courses/missing/preview");
  await expect(page.locator("main:visible")).toContainText(
    "دورهٔ این شناسه پیدا نشد",
  );
});
test("admin names open the matching profile and changes remain user scoped", async ({
  page,
}) => {
  await page.goto("/admin/users");
  await page
    .locator("main:visible")
    .getByRole("link", { name: /سارا محمدی/ })
    .click();
  await expect(page).toHaveURL(/admin\/users\/1$/);
  await expect(page.locator("main:visible h1")).toHaveText("سارا محمدی");
  await expect(page.locator("main:visible .user-profile-hero")).toContainText(
    "sara@example.com",
  );
  await page.getByRole("button", { name: "اصلاح اعتبار" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("مقدار تغییر").fill("50");
  await dialog.getByLabel("دلیل تغییر").fill("اصلاح اعتبار نمایشی");
  await dialog.getByRole("button", { name: "تأیید و ثبت تغییر" }).click();
  await page
    .locator("main:visible .module-tabs")
    .getByRole("button", { name: "یادداشت مدیریت" })
    .click();
  await page.getByLabel("یادداشت پرونده").fill("یادداشت اختصاصی سارا");
  await page.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await page.reload();
  await expect(page.locator("main:visible .user-credit-summary")).toContainText(
    "۵۰",
  );
  await page.goto("/admin/users/2");
  await expect(page.locator("main:visible h1")).toHaveText("علی رضایی");
  await expect(page.locator("main:visible .user-credit-summary")).toContainText(
    "۰",
  );
  await page
    .locator("main:visible .module-tabs")
    .getByRole("button", { name: "یادداشت مدیریت" })
    .click();
  await expect(page.getByLabel("یادداشت پرونده")).toHaveValue("");
});
test("admin block state and subscription changes update the user directory", async ({
  page,
}) => {
  await page.goto("/admin/users/1");
  await page.getByRole("button", { name: "مسدودسازی حساب" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("دلیل تغییر")
    .fill("بازبینی حساب نمونه");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "تأیید و ثبت تغییر" })
    .click();
  await page
    .locator("main:visible .module-tabs")
    .getByRole("button", { name: "اشتراک و دسترسی" })
    .click();
  await page.getByLabel("طرح پلتفرم").selectOption("pro");
  await page.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await page.goto("/admin/users");
  await page.getByRole("textbox", { name: "جستجو و فیلتر" }).fill("sara");
  await expect(page.locator("main:visible tbody tr")).toHaveCount(1);
  await expect(page.locator("main:visible tbody")).toContainText("PRO");
  await expect(page.locator("main:visible tbody")).toContainText("مسدود");
});
test("voice projects preserve segments and can be archived and restored", async ({
  page,
}) => {
  await page.goto("/voice-studio?tab=text");
  await page.getByRole("button", { name: "پروژه صوتی تازه" }).click();
  await page.getByLabel("نام پروژه").fill("روایت تست");
  await page.getByLabel("متن گویندگی").fill("سلام، این متن بخش اول است.");
  await page.getByRole("button", { name: "افزودن بخش" }).click();
  await page.getByLabel("متن گویندگی").nth(1).fill("و این بخش دوم روایت است.");
  await page.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await page.goto("/voice-studio?tab=projects");
  await expect(page.locator("main:visible")).toContainText("روایت تست");
  await page.getByRole("button", { name: "بایگانی", exact: true }).click();
  await page.goto("/voice-studio?tab=archive");
  await expect(page.locator("main:visible")).toContainText("روایت تست");
  await page.getByRole("button", { name: "بازگردانی", exact: true }).click();
  await page.goto("/voice-studio?tab=text");
  await expect(page.getByLabel("متن گویندگی").first()).toHaveValue(
    "سلام، این متن بخش اول است.",
  );
});
test("team invites become members in the local acceptance preview", async ({
  page,
}) => {
  await page.goto("/organization/onboarding");
  await page.getByRole("button", { name: "راه‌اندازی فضای تیم" }).click();
  await page.getByLabel("نام کسب‌وکار").fill("تیم تست");
  await page.getByRole("button", { name: "بررسی اطلاعات" }).click();
  await page.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await page.goto("/organization/onboarding?tab=invites");
  await page.getByLabel("ایمیل", { exact: true }).fill("teammate@example.com");
  await page.getByRole("button", { name: "ایجاد دعوت محلی" }).click();
  await page.getByRole("button", { name: "پیش‌نمایش پذیرش" }).click();
  await page.getByRole("button", { name: "پذیرش در پیش‌نمایش" }).click();
  await page.goto("/organization/onboarding?tab=members");
  await expect(page.locator("main:visible")).toContainText(
    "teammate@example.com",
  );
  await page.goto("/organization/onboarding?tab=audit");
  await expect(page.locator("main:visible")).toContainText("پذیرش دعوت");
});
test("approved strategic decisions create a single task", async ({ page }) => {
  await page.goto("/ceo?tab=approvals");
  await page.getByRole("button", { name: "پیشنهاد تصمیم" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("عنوان", { exact: true })
    .fill("بهبود فرایند فروش");
  await page
    .getByRole("dialog")
    .getByLabel("دلیل و اثر مورد انتظار")
    .fill("کاهش پیگیری‌های فراموش‌شده");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ذخیره کن", exact: true })
    .click();
  await page.getByRole("button", { name: "تأیید و تبدیل به کار" }).click();
  await expect(
    page.getByRole("button", { name: "تأیید و تبدیل به کار" }),
  ).toBeDisabled();
  await page.goto("/ceo?tab=orchestrator");
  await expect(page.locator("main:visible .domain-board")).toContainText(
    "بهبود فرایند فروش",
  );
});
test("student subjects, notes and study time persist", async ({ page }) => {
  await page.goto("/student?view=courses");
  await page.getByRole("button", { name: "افزودن درس" }).click();
  await page.getByRole("dialog").getByLabel("نام درس").fill("ریاضی تست");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ذخیره کن", exact: true })
    .click();
  await page.goto("/student?view=notes");
  await page.getByRole("button", { name: "یادداشت تازه" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("عنوان یادداشت")
    .fill("نکته جلسه اول");
  await page
    .getByRole("dialog")
    .getByLabel("متن یادداشت")
    .fill("محتوای یادداشت شخصی");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ذخیره کن", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("main:visible")).toContainText(
    "محتوای یادداشت شخصی",
  );
  await page.goto("/student?view=reports");
  await page.getByRole("button", { name: "شروع مطالعه" }).click();
  await page.getByRole("button", { name: "پایان و ثبت جلسه" }).click();
  await expect(page.locator("main:visible .domain-card")).toHaveCount(1);
});
test("academy text exercises unlock the local completion record", async ({
  page,
}) => {
  await page.goto("/learn?tab=lesson&course=customer-workflow");
  for (let i = 0; i < 2; i++) {
    await page
      .locator("main:visible .academy-exercise textarea")
      .fill("پاسخ تمرین نمونه");
    await page
      .locator("main:visible .academy-exercise button[type=submit]")
      .click();
  }
  await page.goto("/learn?tab=certificates");
  const card = page
    .locator("main:visible .academy-certificate")
    .filter({ hasText: "مرتب‌کردن مسیر ارتباط با مشتری" });
  await expect(
    card.getByRole("button", { name: "دریافت سابقه تکمیل" }),
  ).toBeEnabled();
});
test("new internal pages fit mobile screens", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of [
    "/admin/users",
    "/admin/users/1",
    "/voice-studio?tab=voice",
    "/organization/onboarding",
    "/agents",
    "/meeting",
    "/student?view=reports",
    "/learn?tab=lesson",
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
