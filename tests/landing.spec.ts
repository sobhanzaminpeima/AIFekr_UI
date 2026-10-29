import {test,expect} from '@playwright/test';
test.use({actionTimeout:15000});
test('landing journeys show relevant workflows and links',async({page})=>{
 await page.goto('/');const main=page.locator('main:visible');await main.getByRole('tab',{name:'تولید محتوا',exact:true}).click();await expect(main.getByRole('tabpanel')).toContainText('یک ایده، چند شکل');await expect(main.getByRole('link',{name:'استودیوی محتوا را ببین'})).toHaveAttribute('href','/social?tab=content');await main.getByRole('tab',{name:'یادگیری و پیشرفت'}).click();await expect(main.getByRole('tabpanel')).toContainText('از سؤال امروز');await main.locator('.journey-flow button').nth(2).click();await expect(main.locator('.journey-focus h4')).toContainText('تمرین و آزمون');
});
test('landing module explorer filters and navigates to product pages',async({page})=>{
 await page.goto('/');const explorer=page.locator('main:visible .landing-explorer');await explorer.getByRole('textbox',{name:'جستجوی ماژول‌ها'}).fill('سئو');await expect(explorer.locator('.explorer-card')).toHaveCount(1);await explorer.locator('.explorer-card').click();await expect(page).toHaveURL(/features\/seo/);await page.goto('/');await page.locator('main:visible .landing-explorer').getByRole('button',{name:'ورزش',exact:true}).click();await expect(page.locator('main:visible .explorer-card')).toHaveCount(2);
});
test('public navigation and footer expose key product destinations',async({page})=>{
 await page.goto('/');const header=page.locator('.public-header:visible');await header.locator('summary').filter({hasText:'محصول'}).click();await expect(header.getByRole('link',{name:'استودیوی صدا',exact:true})).toHaveAttribute('href','/voice-studio');await expect(page.locator('.public-footer:visible .footer-link-groups section')).toHaveCount(3);await expect(page.locator('.public-footer:visible').getByRole('link',{name:'حسابداری',exact:true})).toHaveAttribute('href','/features/accounting');
});
test('landing supports mobile layout and English copy',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/');await expect(page.locator('main:visible #workspace-demo')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.locator('.public-header:visible .menu-btn').click();await page.locator('.public-mobile-preferences:visible').getByRole('combobox',{name:'زبان'}).selectOption('en');await expect(page.locator('main:visible .landing-explorer h2')).toContainText('Find the right workspace');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
