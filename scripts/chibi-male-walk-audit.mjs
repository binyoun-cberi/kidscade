import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1100,height:850}});
await page.addInitScript(()=>sessionStorage.setItem('kc_teacher_admin_key','audit-key'));
page.on('pageerror',e=>console.log('PAGEERROR '+e.message));
await page.route('**/api/teacher/overview',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"scope":"global"}'}));
await page.route('**/teacher/character-3d-studio.js*',async route=>{
 const response=await route.fetch();
 const inspector=`
window.__kcWalkInspect=()=>{
 const clip=animations.find(a=>a.name==='anim_walk');
 const tracks=clip.tracks.map(t=>{
  let min=[],max=[],sample=[],stride=t.values.length/t.times.length;
  for(let k=0;k<stride;k++){
    let vals=[];for(let i=0;i<t.times.length;i++)vals.push(t.values[i*stride+k]);
    min.push(Math.min(...vals));max.push(Math.max(...vals));sample.push(vals[0]);
  }
  return {name:t.name,frames:t.times.length,min,max,first:sample};
 });
 const bones=uniqueBones().map(b=>({name:b.name,parent:b.parent?.name}));
 return {duration:clip.duration,tracks,bones};
};
`;
 await route.fulfill({response,body:(await response.text())+inspector});
});
await page.goto('http://127.0.0.1:4173/teacher/character-3d-studio.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>document.querySelector('#chibiAssetStatus')?.textContent?.includes('로드 완료'),{timeout:45000});
await page.click('[data-chibi-preset="male"]');
console.log('WALK_TRACKS '+JSON.stringify(await page.evaluate(()=>window.__kcWalkInspect())));
await browser.close();
