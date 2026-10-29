import {test,expect} from '@playwright/test';
test.use({actionTimeout:15000});
test('redesigned module pages show context and relevant navigation',async({page})=>{
 for(const path of ['/crm?tab=board','/accounting?tab=payroll','/admin/student','/admin/voice-studio','/student?view=notes','/fitness?tab=gym','/video-factory?tab=ideas']){await page.goto(path);await expect(page.locator('main:visible :is(.workspace-banner,.suite-page-heading) h1')).toBeVisible();await expect(page.locator('main:visible :is(.workspace-related,.suite-sidebar) a').first()).toBeVisible();}
});
test('public pages have their own editorial layouts',async({page})=>{
 await page.goto('/about');await expect(page.locator('main:visible .about-story')).toBeVisible();await expect(page.locator('main:visible .about-pillar')).toHaveCount(3);
 await page.goto('/guides');await page.getByRole('textbox',{name:'جستجوی راهنما'}).fill('یادگیری');await expect(page.locator('main:visible .guide-card')).toHaveCount(1);await page.locator('main:visible .guide-card').click();await expect(page.locator('main:visible .editorial-document')).toBeVisible();
 for(const path of ['/privacy','/terms','/security']){await page.goto(path);await expect(page.locator('main:visible .editorial-toc a')).toHaveCount(4);await expect(page.locator('main:visible .editorial-document section')).toHaveCount(4);}
});
test('contact page saves a local inquiry and shows its result',async({page})=>{
 await page.goto('/contact');await page.getByLabel('نام',{exact:true}).fill('کاربر تست');await page.getByLabel('ایمیل',{exact:true}).fill('test@example.com');await page.getByLabel('پیام تو').fill('بازخورد طراحی صفحات');await page.getByRole('button',{name:'ثبت پیام در پیش‌نمایش'}).click();await expect(page.locator('main:visible .contact-success')).toContainText('بازخوردت ثبت شد');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aifekr-contact-inquiries')||'[]')[0].message)).toBe('بازخورد طراحی صفحات');
});
test('redesigned public and module pages fit mobile widths',async({page})=>{
 await page.setViewportSize({width:360,height:800});for(const path of ['/about','/contact','/guides','/privacy','/admin/student','/crm?tab=board','/fitness?tab=gym']){await page.goto(path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBeTruthy();}
});
