import { test, expect } from "@playwright/test";
import { sourceRoutes, allModules } from "../lib/upstream/registry";
import { examplePath } from "../lib/upstream/coverage";

test("owner login and unknown paths use the correct screens", async ({
  page,
}) => {
  await page.goto("/owner/login");
  await expect(page.locator(".module-workspace")).toHaveCount(0);
  await expect(page.locator("main form")).toBeVisible();
  await page.goto("/unknown-workspace");
  await expect(page.locator("main")).toContainText(
    "این فکر هنوز به جایی نرسیده",
  );
});

const pages = sourceRoutes.filter((p) => !["/[locale]"].includes(p.route));
for (let offset = 0; offset < pages.length; offset += 25) {
  test(`upstream page coverage ${offset + 1}-${Math.min(offset + 25, pages.length)}`, async ({
    page,
  }) => {
    test.setTimeout(240000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const p of pages.slice(offset, offset + 25)) {
      const path = examplePath(p.route);
      await page.goto(path);
      await expect(page.locator("main:visible"), path).toBeVisible();
      await expect(page.locator("main:visible"), path).not.toContainText(
        "این فکر هنوز به جایی نرسیده",
      );
    }
    expect(errors).toEqual([]);
  });
}
test("canonical CRM records persist across views and reloads", async ({
  page,
}) => {
  await page.goto("/crm?tab=contacts");
  await page.getByRole("button", { name: "افزودن", exact: true }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("نام", { exact: true }).fill("مشتری آزمایشی جدید");
  await modal.getByRole("button", { name: "ذخیره کن", exact: true }).click();
  await page
    .getByRole("textbox", { name: "جستجوی رکوردها" })
    .fill("مشتری آزمایشی جدید");
  await expect(page.locator(".domain-table tbody tr")).toHaveCount(1);
  await page.reload();
  await page
    .getByRole("textbox", { name: "جستجوی رکوردها" })
    .fill("مشتری آزمایشی جدید");
  await expect(page.locator(".domain-table tbody tr")).toHaveCount(1);
});
test("every module tab resolves to its own title", async ({ page }) => {
  test.setTimeout(600000);
  for (const m of allModules) {
    // ID-scoped user profiles and the user directory are covered by internal-completion.spec.ts.
    if (m.base === "/admin/users" || m.base.startsWith("/admin/users/"))
      continue;
    for (const v of m.views) {
      await page.goto(examplePath(m.base) + "?tab=" + v.id);
      await expect(
        page.locator(
          ".module-tabs:visible a[aria-current=page], .suite-sidebar:visible a[aria-current=page]",
        ),
        m.id + "/" + v.id,
      ).toContainText(v.title[0]);
      await expect(page.locator("main:visible")).not.toContainText(
        "Application error",
      );
    }
  }
});
test("mobile domain workspace has no horizontal document overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of [
    "/crm?tab=contacts",
    "/accounting?tab=expenses",
    "/fitness?tab=profile",
    "/admin/module-access",
    "/features/crm",
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
