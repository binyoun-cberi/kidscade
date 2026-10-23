'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../games/high_one_life');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('index.html'),css=read('pixel-home-v1.css'),art=read('pixel-home-v1.js'),ui=read('game.js');
test('homepage replaces decorative circles with four historically distinct hand-drawn pixel portraits',()=>{
 assert.ok(!html.includes('class="hero-art"'));
 assert.ok(!html.includes('class="orbit'));
 assert.ok(!html.includes('class="globe"'));
 assert.match(html,/class="home-gallery"/);
 assert.match(html,/pixel-home-v1\.css\?v=1/);
 assert.match(html,/pixel-home-v1\.js\?v=1/);
 for(const scene of ['goryeo','joseon','colonial','modern']){
  assert.equal(html.split('data-home-scene="'+scene+'"').length-1,1,scene);
 }
 assert.equal((html.match(/class="home-era-card"/g)||[]).length,4);
 assert.equal((html.match(/data-era-year="(?:1270|1740|1919|2026)" aria-pressed=/g)||[]).length,4);
 assert.ok(css.includes('image-rendering:pixelated'));
});
test('each character vignette paints distinct scenery and two figures without loading external pictures',()=>{
 const draws=[];
 const canvases=['goryeo','joseon','colonial','modern'].map(id=>{
  const calls=[],ctx={imageSmoothingEnabled:true,fillStyle:'',fillRect(...args){calls.push({color:this.fillStyle,args});},
    clearRect(){calls.length=0;}};
  return {dataset:{homeScene:id},getContext(type){assert.equal(type,'2d');return ctx;},calls};
 });
 const window={document:{querySelectorAll(selector){assert.equal(selector,'canvas[data-home-scene]');return canvases;}}};
 const context=vm.createContext({window,Math,Object});
 vm.runInContext(art,context,{filename:'pixel-home-v1.js'});
 const paint=window.OneLifePixelHome;
 assert.ok(paint);
 assert.equal(paint.paintAll(window.document),4);
 const firstColors=[];
 for(const canvas of canvases){
  assert.ok(canvas.calls.length>100,canvas.dataset.homeScene+' should be drawn in actual pixels');
  firstColors.push(canvas.calls[0].color);
  assert.ok(canvas.calls.some(x=>x.args[0]>=0&&x.args[1]>90));
 }
 assert.equal(new Set(firstColors).size,4,'each period needs its own color palette');
 assert.equal(paint.paint(null,'modern'),false);
 assert.ok(!/fetch\(|https?:\/\/|new Image\(/.test(art),'pixel art should work offline');
});
test('existing start, resume and all customizable birth inputs retain unique IDs',()=>{
 const ids=['drawBtn','resumeBtn','openBirthOptions','birthOptionsDetails','birthYearInput','birthCountryInput',
  'birthNameInput','birthGenderInput','birthOriginInput','birthFamilyInput',
  'homeRecentLives','homeLifeCount','birth','play','end'];
 for(const id of ids)assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.ok(ui.includes("addEventListener('click',draw)"));
 assert.ok(ui.includes("addEventListener('click',()=>{")&&ui.includes('startLife(true)'));
 assert.ok(ui.includes('refreshHomeArchive'));
 assert.ok(ui.includes('birthOptionsDetails'));
 assert.ok(ui.includes("Number(button.dataset.eraYear)===year"));
 assert.ok(ui.includes('document.createElement(\'article\')'));
 assert.ok(ui.includes('detail.textContent'));
});
test('responsive gallery, keyboard navigation and reduced-motion support',()=>{
 assert.ok(css.includes('@media(max-width:780px)'));
 assert.ok(css.includes('@media(max-width:480px)'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes(':focus-visible'));
 assert.equal((html.match(/<button type="button" class="home-era-card"/g)||[]).length,4);
 assert.ok(html.includes('role="group" aria-label="시대별 픽셀 인물'));
 assert.ok(html.includes('aria-live="polite"'));
 assert.ok(css.includes('.home-recent-lives'));
});
