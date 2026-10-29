import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('issued owner statements remain scoped to the selected owner',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('aifekr-domain:CrmContact',JSON.stringify([{id:'o1',name:'مالک اول'},{id:'o2',name:'مالک دوم'}]));
    localStorage.setItem('aifekr-crm:properties',JSON.stringify([{id:'p1',title:'ملک آزمایشی',contactId:'o1',amount:100,status:'active',description:'شرح ملک'}]));
    localStorage.setItem('aifekr-owner-statements',JSON.stringify([{id:'s1',owner:'o1',property:'p1',period:'2026-10',gross:1000,expenses:100,rate:10,status:'issued'},{id:'s2',owner:'o2',property:'other',period:'2026-09',gross:20,expenses:0,rate:0,status:'draft'}]));
  });
  await page.goto('/owner?tab=statements');
  const main=page.locator('main:visible');
  await expect(main.locator('.owner-statement-list')).toContainText('ملک آزمایشی');
  await expect(main.locator('.owner-statement-list')).not.toContainText('other');
  await main.getByLabel('مالک در پیش‌نمایش').selectOption('o2');
  await expect(main.locator('.owner-statement-list')).toHaveCount(0);
});

test('property booking rejects overlapping dates',async({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('aifekr-domain:CrmContact',JSON.stringify([{id:'o1',name:'مالک'}]));
    localStorage.setItem('aifekr-crm:properties',JSON.stringify([{id:'p1',title:'ملک',contactId:'o1',amount:100,status:'active',description:''}]));
    localStorage.setItem('aifekr-owner-bookings',JSON.stringify([{id:'b1',property:'p1',name:'رزرو موجود',start:'2026-11-01',end:'2026-11-10',status:'active'}]));
  });
  await page.goto('/owner?tab=bookings');
  await page.getByRole('button',{name:'ثبت رزرو محلی',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('عنوان رزرو').fill('رزرو متداخل');
  await dialog.getByLabel('شروع',{exact:true}).fill('2026-11-05');
  await dialog.getByLabel('پایان',{exact:true}).fill('2026-11-12');
  await dialog.getByRole('button',{name:'ثبت رزرو',exact:true}).click();
  await expect(page.getByText('بازه انتخاب‌شده با رزرو دیگری تداخل دارد.')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aifekr-owner-bookings')||'[]').length)).toBe(1);
});

test('arcade scores only one attempt per answer and persists history',async({page})=>{
  await page.goto('/play?tab=arcade');
  const answers=page.locator('main:visible .arcade-answers button');
  await answers.nth(1).click();
  await expect(answers.nth(1)).toBeDisabled();
  await expect(page.locator('main:visible .arcade-result')).toContainText('۱۰ امتیاز');
  await page.goto('/play?tab=history');
  await expect(page.locator('main:visible')).toContainText('3 × 4 = 12');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aifekr-play-attempts')||'[]').length)).toBe(1);
});

test('referral payout starts empty and cannot request funds',async({page})=>{
  await page.goto('/referral?tab=payout');
  await expect(page.locator('main:visible').getByRole('button',{name:'ثبت درخواست محلی',exact:true})).toBeDisabled();
});

test('new internal workspaces remain usable on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const url of ['/business-doctor','/owner','/referral?tab=invite','/play','/video-factory?tab=versions','/seo?tab=sites','/social?tab=competitors','/accounting?tab=automation']){
    await page.goto(url);
    await expect(page.locator('main:visible')).toBeVisible();
    await expect(page.getByText('Application error',{exact:false})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),url).toBe(true);
  }
});

test('new workspaces have no serious accessibility violations',async({page})=>{
  for(const url of ['/business-doctor','/owner','/referral?tab=invite','/play','/video-factory?tab=versions','/seo?tab=sites']){
    await page.goto(url);
    const result=await new AxeBuilder({page}).include('main').analyze();
    expect(result.violations.filter(v=>['serious','critical'].includes(v.impact||'')),url).toEqual([]);
  }
});
