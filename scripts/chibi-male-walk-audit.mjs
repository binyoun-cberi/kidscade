import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader']});
const page=await browser.newPage();
await page.addInitScript(()=>sessionStorage.setItem('kc_teacher_admin_key','audit-key'));
await page.route('**/api/teacher/overview',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"scope":"global"}'}));
await page.goto('http://127.0.0.1:4173/teacher/character-3d-studio.html');
await browser.close();
