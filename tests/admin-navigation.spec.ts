import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {adminDefinitions} from '../lib/upstream/registry';
test('admin sidebar groups all canonical sections once and reveals the active destination',async({page})=>{
 await page.goto('/admin/users/2');
 const sidebar=page.locator('.sidebar');const navigation=sidebar.locator('.admin-nav-groups');
 await expect(navigation.getByRole('link',{name:'کاربران',exact:true})).toHaveAttribute('aria-current','page');
 await expect(navigation.locator('button[aria-expanded=true]')).toHaveCount(1);
 await expect(navigation.locator('.admin-nav-group-toggle')).toHaveCount(7);
 const links=await navigation.locator('a').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
 expect(new Set(links).size).toBe(links.length);
 for(const [slug] of adminDefinitions.filter(([s])=>!s.includes('[')))expect(links).toContain('/admin/'+slug);
 await navigation.getByRole('button',{name:/مالی و اشتراک‌ها/}).click();
 await expect(navigation.getByRole('link',{name:'خریدها و فاکتورها',exact:true})).toBeVisible();
 await expect(navigation.getByRole('link',{name:'کاربران',exact:true})).toBeHidden();
 await navigation.getByRole('link',{name:'حساب خریداران',exact:true}).click();
 await expect(page).toHaveURL(/\/admin\/financial\/customers$/);
 await expect(navigation.locator('a[aria-current=page]')).toHaveCount(1);
});
test('admin navigation search finds a hidden section and restores the group list',async({page})=>{
 await page.goto('/admin/users/2');const sidebar=page.locator('.sidebar');
 await sidebar.getByRole('textbox',{name:'جست‌وجوی بخش مدیریت'}).fill('پشتیبان');
 await expect(sidebar.getByRole('link',{name:'پشتیبان‌ها',exact:true})).toBeVisible();
 await expect(sidebar.locator('.admin-nav-group-toggle')).toHaveCount(1);
 await sidebar.getByRole('button',{name:'پاک‌کردن جست‌وجو'}).click();
 await expect(sidebar.locator('.admin-nav-group-toggle')).toHaveCount(7);
});
test('sidebar is usable on tablet and mobile with no serious accessibility defects',async({page})=>{
 for(const width of [900,390]){
 await page.setViewportSize({width,height:900});await page.goto('/admin/financial/customers');
 if(width===390)await page.locator('.topbar .menu-btn').click();
 const nav=page.locator('.sidebar .admin-nav-groups');
 await expect(nav.getByRole('link',{name:'حساب خریداران',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 const result=await new AxeBuilder({page}).include('.admin-navigation').analyze();
 expect(result.violations.filter(v=>['serious','critical'].includes(v.impact||''))).toEqual([]);
 }
});
