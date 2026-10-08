import {chromium} from 'playwright';
import sharp from 'sharp';
const browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1100,height:870}});
await page.addInitScript(()=>sessionStorage.setItem('kc_teacher_admin_key','audit-key'));
page.on('pageerror',e=>console.error('PAGEERROR '+e.message));
await page.route('**/api/teacher/overview',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true,"scope":"global"}'}));
await page.route('**/teacher/character-3d-studio.js*',async route=>{
 const response=await route.fetch();
 const instrument=`
window.__walkAudit={
 info(){
  const orig=animations.find(c=>c.name==='anim_walk'),newClip=maleWalkClips.get('anim_walk');
  const get=(clip,target)=>clip?.tracks.find(t=>t.name===target);
  const roll=t=>{let a=[];const q=new THREE.Quaternion(),e=new THREE.Euler();
    for(let i=0;i<t.values.length;i+=4){
      q.fromArray(t.values,i);e.setFromQuaternion(q,'XYZ');a.push(e.z);
    }
    return {min:Math.min(...a),max:Math.max(...a)};
  };
  const xAmp=t=>{let a=[];for(let i=0;i<t.values.length;i+=3)a.push(t.values[i]);return Math.max(...a)-Math.min(...a);};
  const origRoot=get(orig,'DEF-spine.quaternion'),newRoot=get(newClip,'DEF-spine.quaternion');
  const originalLeg=get(orig,'DEF-thighL.quaternion'),newLeg=get(newClip,'DEF-thighL.quaternion');
  return {clips:animations.length,originalDuration:orig?.duration,derivedDuration:newClip?.duration,
   originalTrackCount:orig?.tracks.length,derivedTrackCount:newClip?.tracks.length,
   rootOriginalX:xAmp(get(orig,'DEF-spine.position')),
   rootMaleX:xAmp(get(newClip,'DEF-spine.position')),
   rollOriginal:roll(origRoot),rollMale:roll(newRoot),
   legUnchanged:originalLeg.values.every((x,i)=>x===newLeg.values[i]),
   srcUnmodified:xAmp(get(orig,'DEF-spine.position'))>.05,
   tunedMetadata:newClip?.userData?.kidscadeMaleStraightWalk,
   originalName:orig.name,derivedName:newClip.name};
 },
 useClip(kind){
  activeAction?.stop();mixer.stopAllAction();
  const source=animations.find(c=>c.name==='anim_walk');
  const clip=kind==='source'?source:maleWalkClips.get(source.name);
  activeAction=mixer.clipAction(clip);activeAction.reset().setEffectiveWeight(1).play();
  activeClip='anim_walk';
 },
 pose(t){
  activeAction.paused=false;
  mixer.setTime(t);
  activeAction.paused=true;
  renderer.render(scene,camera);
  const b=uniqueBones().find(x=>x.name==='DEF-spine');
  const l=uniqueBones().find(x=>x.name==='DEF-spine001');
  return {t,pelvisX:b.position.x,pelvisRoll:b.rotation.z,waistRoll:l.rotation.z};
 },
 playback(){
  return {maleBody:getNode('kidscade_male_body')?.visible,activeClip,
    usesMaleClip:activeAction?.getClip()?.userData?.kidscadeMaleStraightWalk===true};
 }
};
`;
 await route.fulfill({response,body:(await response.text())+instrument});
});
await page.goto('http://127.0.0.1:4173/teacher/character-3d-studio.html',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>document.querySelector('#chibiAssetStatus')?.textContent?.includes('로드 완료'),{timeout:45000});
await page.click('[data-chibi-preset="male"]');
console.log('WALK_METRICS '+JSON.stringify(await page.evaluate(()=>window.__walkAudit.info())));
await page.click('[data-clip="anim_walk"]');
console.log('MALE_PLAYBACK '+JSON.stringify(await page.evaluate(()=>window.__walkAudit.playback())));
await page.click('[data-chibi-preset="hoodie"]');
console.log('FEMALE_PLAYBACK '+JSON.stringify(await page.evaluate(()=>window.__walkAudit.playback())));
await page.click('[data-chibi-preset="male"]');
console.log('MALE_RESTORED '+JSON.stringify(await page.evaluate(()=>window.__walkAudit.playback())));
await page.click('[data-view="front"]');
const photos=[];
for(const kind of ['source','male']){
 await page.evaluate(kind=>window.__walkAudit.useClip(kind),kind);
 for(let i=0;i<4;i++){
  const pos=[.10,.27,.44,.61][i];
  const data=await page.evaluate(t=>window.__walkAudit.pose(t),pos);
  console.log('WALK_POSE '+kind+' '+JSON.stringify(data));
  const png=await page.locator('#view').screenshot({type:'png'});
  const meta=await sharp(png).metadata();
  const crop=await sharp(png).extract({
    left:Math.round(meta.width*.20),top:Math.round(meta.height*.08),
    width:Math.round(meta.width*.60),height:Math.round(meta.height*.82)
  }).resize(260,330,{fit:'contain',background:'#202e39'}).webp({quality:48}).toBuffer();
  const label=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="25"><rect fill="#fff" width="260" height="25"/><text x="7" y="18" font-size="16" font-family="Arial">'+kind.toUpperCase()+' '+pos+'</text></svg>');
  const x=i*260,y=(kind==='source'?0:1)*355;
  photos.push({input:label,left:x,top:y},{input:crop,left:x,top:y+25});
 }
}
const sheet=await sharp({create:{width:1040,height:710,channels:4,background:'#1c2732'}}).composite(photos).webp({quality:46}).toBuffer();
console.log('WALK_SHEET_BEGIN');
const b64=sheet.toString('base64');for(let i=0;i<b64.length;i+=12000)console.log(b64.slice(i,i+12000));
console.log('WALK_SHEET_END');
await browser.close();
