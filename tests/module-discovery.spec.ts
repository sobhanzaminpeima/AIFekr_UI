import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {findModule,resolveView} from '../lib/upstream/registry';
test.use({actionTimeout:15000});
test('home keeps only the doctor recommendation and chooser searches by goal',async({page})=>{
 await page.goto('/home');
 await expect(page.locator('main:visible .directory-doctor')).toBeVisible();
 await expect(page.locator('main:visible .module-directory')).toHaveCount(0);
 await expect(page.locator('main:visible .directory-card')).toHaveCount(0);
 await page.getByRole('button',{name:'انتخاب ماژول',exact:true}).click();
 const directory=page.getByRole('dialog').locator('.module-directory');
 await expect(directory.locator('.directory-card')).toHaveCount(14);
 await directory.getByRole('textbox',{name:'جست‌وجوی ماژول یا هدف'}).fill('تماس');
 await expect(directory.locator('.directory-card')).toHaveCount(1);
 await expect(directory.locator('.directory-card')).toContainText('مرکز تماس‌های هوشمند');
 await directory.getByRole('textbox').fill('');
 await directory.getByRole('button',{name:'یادگیری',exact:true}).click();
 await expect(directory.locator('.directory-card')).toHaveCount(1);
 await expect(directory.locator('.directory-card')).toContainText('فضای دانشجویی');
});
test('every directory destination resolves to the requested view',async({page})=>{
 test.setTimeout(180000);await page.goto('/home');
 await page.getByRole('button',{name:'انتخاب ماژول',exact:true}).click();
 await expect(page.getByRole('dialog').locator('.directory-card')).toHaveCount(14);
 const links=await page.getByRole('dialog').locator('.module-directory a').evaluateAll(elements=>elements.map(e=>e.getAttribute('href')||''));
 expect(links.length).toBe(14);
 for(const href of [...new Set(links)]){
   const url=new URL(href,'http://localhost');const module=findModule(url.pathname);
   expect(module,href).toBeTruthy();if(!module)continue;
   const requested=url.searchParams.get('tab')||url.searchParams.get('view');
   const view=resolveView(module,url.pathname,url.searchParams);
   if(requested)expect(view.id,href).toBe(requested);
   await page.goto(href);
   await expect(page.locator('main:visible')).not.toContainText('Application error');
   await expect(page.locator('.module-tabs:visible a[aria-current=page],.suite-sidebar:visible a[aria-current=page]'),href).toContainText(view.title[0]);
 }
});
test('workspace chooser is available from an admin user profile',async({page})=>{
 await page.goto('/admin/users/2');
 await page.getByRole('button',{name:'انتخاب ماژول',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByRole('textbox').fill('دکتر');
 await dialog.locator('.directory-card-main').click();
 await expect(page).toHaveURL(/business-doctor$/);
 await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('brand follows the requested Persian and English spelling',async({page})=>{
 await page.goto('/home');await expect(page.locator('.sidebar .brand')).toHaveAttribute('aria-label','ای آی فکر');
 await page.locator('.preferences select').selectOption('en');
 await expect(page.locator('.sidebar .brand')).toHaveAttribute('aria-label','AIFekr');
 await expect(page.locator('.sidebar .brand b')).toContainText('AIFekr');
});
test('business doctor retains business context and gives actionable next steps',async({page})=>{
 await page.goto('/business-doctor');await page.locator('main:visible').getByRole('button',{name:'شروع ارزیابی',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.getByLabel('نام کسب‌وکار',{exact:true}).fill('کسب و کار تست');
 await dialog.getByLabel('حوزه فعالیت',{exact:true}).fill('خدمات');
 await dialog.getByRole('textbox',{name:'وضعیت درآمد و مدل درآمدی (اختیاری)',exact:true}).fill('درآمد اشتراکی ماهانه');
 await dialog.getByRole('button',{name:'ادامه',exact:true}).click();
 await dialog.getByRole('textbox',{name:'محصول یا خدمت اصلی (اختیاری)',exact:true}).fill('مشاوره');
 await dialog.getByRole('textbox',{name:'چالش اصلی',exact:true}).fill('پیگیری مشتری');
 await dialog.getByRole('textbox',{name:'نتیجه مورد انتظار',exact:true}).fill('ثبت برنامه فروش');
 await dialog.getByRole('button',{name:'ادامه',exact:true}).click();
 await dialog.getByRole('button',{name:'ذخیره کن',exact:true}).click();
 await page.reload();
 await expect(page.locator('main:visible .doctor-next-steps a')).toHaveCount(3);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aifekr-business-assessments')||'[]')[0].revenue)).toBe('درآمد اشتراکی ماهانه');
 await page.locator('main:visible .doctor-next-steps').getByRole('link').nth(1).click();
 await expect(page).toHaveURL(/tab=action-plan/);
});
test('module discovery fits mobile and has no serious accessibility violations',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/home');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 await expect(page.locator('main:visible .directory-doctor')).toBeVisible();
 const results=await new AxeBuilder({page}).include('.directory-doctor').analyze();
 expect(results.violations.filter(v=>['serious','critical'].includes(v.impact||''))).toEqual([]);
 await page.getByRole('button',{name:'انتخاب ماژول',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});
