import {test,expect} from '@playwright/test';
import {v2App} from '../lib/live-app';
import {findModule,moduleViewHref,resolveView} from '../lib/upstream/registry';
test('every migrated module view resolves back to itself on an allowed route',()=>{
 for(const path of ['/lead-gen','/business-doctor','/meeting','/website-designer','/referral','/startup/builder']){
  const module=findModule(path)!;expect(module).toBeTruthy();
  for(const view of module.views){const href=moduleViewHref(module,view),url=new URL(href,'https://aifekr.com');expect(v2App(href)).toBe(true);expect(resolveView(module,url.pathname,url.searchParams).id).toBe(view.id)}
  expect(v2App(path+'/not-ready')).toBe(false);
 }
});
