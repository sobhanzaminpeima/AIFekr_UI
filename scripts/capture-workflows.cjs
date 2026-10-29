const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const base=process.env.AIFEKR_PREVIEW_URL||'http://localhost:3100';
  await page.addInitScript(()=>{
   if(!localStorage.getItem('aifekr-domain:CrmDeal'))localStorage.setItem('aifekr-domain:CrmDeal',JSON.stringify([{id:'preview-1',title:'طراحی وب‌سایت فروشگاهی',contactId:'contact-1',value:25000000,probability:60,status:'active',expectedCloseDate:'2026-11-10'},{id:'preview-2',title:'پشتیبانی محتوای برند',contactId:'contact-2',value:12000000,probability:30,status:'draft',expectedCloseDate:'2026-11-15'},{id:'preview-3',title:'راه‌اندازی استودیو',contactId:'contact-1',value:18000000,probability:100,status:'completed',expectedCloseDate:'2026-10-28'}]));
  });
  for(const [name,route] of [['crm','/crm?tab=board'],['payroll','/accounting?tab=payroll'],['social','/social?tab=content'],['fitness','/fitness?tab=gym'],['billing','/admin/packages']]){
   await page.goto(base+route);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`screenshots/workflow-${name}-desktop.png`,fullPage:true});
  }
  await page.goto(base+'/website-designer?tab=brief');await page.getByLabel('نام وب‌سایت').fill('استودیو نارنج');await page.getByLabel('مخاطب هدف').fill('برندهایی که می‌خواهند متفاوت دیده شوند.');await page.getByLabel('هدف و پیام اصلی').fill('به ایده‌های تازه، خانه‌ای برای رشد می‌دهیم. طراحی، محتوا و تجربه‌ای که با مخاطب حرف می‌زند.');await page.getByRole('button',{name:'ساخت پروژه وب‌سایت'}).click();await page.goto(base+'/website-designer?tab=preview');await page.frameLocator('iframe').locator('h1').waitFor();await page.screenshot({path:'screenshots/workflow-website-desktop.png',fullPage:true});
  await page.setViewportSize({width:360,height:800});for(const [name,route] of [['crm','/crm?tab=board'],['payroll','/accounting?tab=payroll'],['fitness','/fitness?tab=gym'],['social','/social?tab=content']]){await page.goto(base+route);await page.screenshot({path:`screenshots/workflow-${name}-mobile.png`,fullPage:true});}
  console.log('Saved 10 workflow screenshots.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
