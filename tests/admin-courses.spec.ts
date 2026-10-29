import { test, expect } from "@playwright/test";
import AxeBuilder from '@axe-core/playwright';
test('course editor remains accessible and usable on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/admin/ai-courses');
  await page.locator('main:visible').getByRole('button',{name:'دورهٔ تازه',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
  const result=await new AxeBuilder({page}).include('dialog').analyze();
  expect(result.violations.filter(v=>['serious','critical'].includes(v.impact||''))).toEqual([]);
});
test.use({ actionTimeout: 15000 });
test("course editor previews exact content and restores a saved revision", async ({
  page,
}) => {
  await page.goto("/admin/ai-courses");
  await page
    .locator("main:visible")
    .getByRole("button", { name: "دورهٔ تازه", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("عنوان دوره", { exact: true }).fill("دوره نگارش تست");
  await dialog.getByLabel("عنوان درس", { exact: true }).fill("درس اول");
  await dialog.getByLabel("متن درس", { exact: true }).fill("متن اصلی درس");
  await dialog
    .getByRole("button", { name: "ذخیرهٔ دوره", exact: true })
    .click();
  await page
    .locator("main:visible")
    .getByRole("link", { name: "پیش‌نمایش دوره", exact: true })
    .click();
  await expect(page.locator("main:visible .admin-course-content")).toHaveText(
    "متن اصلی درس",
  );
  await page.goto("/admin/ai-courses");
  await page
    .locator("main:visible")
    .getByRole("button", { name: "ویرایش محتوا", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "متن درس", exact: true })
    .fill("محتوای ویرایش شده");
  await dialog
    .getByRole("button", { name: "ذخیرهٔ دوره", exact: true })
    .click();
  await page.goto("/admin/ai-courses?tab=ai-course-revision");
  await page
    .locator("main:visible")
    .getByRole("button", { name: "بازگردانی نسخه", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "تأیید بازگردانی", exact: true })
    .click();
  const data = await page.evaluate(() => ({
    courses: JSON.parse(localStorage.getItem("aifekr-domain:AiCourse") || "[]"),
    revisions: JSON.parse(
      localStorage.getItem("aifekr-course-revisions") || "[]",
    ),
  }));
  expect(JSON.parse(data.courses[0].content).lessons[0].body).toBe(
    "متن اصلی درس",
  );
  expect(data.revisions).toHaveLength(2);
  expect(JSON.parse(data.revisions[0].course.content).lessons[0].body).toBe(
    "محتوای ویرایش شده",
  );
});
