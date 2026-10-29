import {test,expect} from '@playwright/test';
test('chat voice mode exposes the studio and preserves the draft',async({page})=>{
 await page.goto('/chat');const main=page.locator('main:visible');await expect(main.locator('.chat-voice-entry')).toHaveCount(0);await main.locator('.mode-chips').getByRole('button',{name:'صدا',exact:true}).click();await expect(main.locator('.chat-voice-entry')).toBeVisible();await main.getByRole('textbox',{name:'ایدهٔ شما'}).fill('سلام، به آی‌فکر خوش آمدید.');await main.getByRole('link',{name:'ورود به استودیوی صدا'}).click();await expect(page).toHaveURL(/voice-studio\?tab=generate/);await expect(page.locator('main:visible .prompt-panel textarea').first()).toHaveValue('سلام، به آی‌فکر خوش آمدید.');
});
test('voice studio access works without a prompt on mobile',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/chat');await page.locator('main:visible .mode-chips').getByRole('button',{name:'صدا',exact:true}).click();await expect(page.locator('main:visible .chat-voice-link')).toHaveAttribute('href','/voice-studio?tab=generate');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();await page.locator('main:visible .mode-chips').getByRole('button',{name:'همه',exact:true}).click();await expect(page.locator('.chat-voice-entry:visible')).toHaveCount(0);
});
