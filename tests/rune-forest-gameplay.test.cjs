'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.join(__dirname,'..','games','math_rune_forest');
const html=fs.readFileSync(path.join(dir,'넘버 시그널 (룬의 숲).html'),'utf8');
const combat=fs.readFileSync(path.join(dir,'rune-forest-combat.js'),'utf8');
const art=fs.readFileSync(path.join(dir,'rune-forest-art.js'),'utf8');
const balance=fs.readFileSync(path.join(dir,'rune-forest-balance.js'),'utf8');
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
const script=inline?.replace(/\}\)\(\);\s*$/, "window.__test={getScene:()=>s,getState:()=>state,start,spawn,strike,enterPhase,update,dash,kill,choose,refresh};})();");
function makeBrowser(width=390,height=844){
 const elements=new Map();let frame=null,drawCalls=0;
 const g={globalAlpha:1,drawImage(){drawCalls++}};
 for(const method of ['fillRect','strokeRect','save','restore','beginPath','ellipse','arc','stroke','moveTo',
  'lineTo','fill','strokeText','fillText','setLineDash','translate','rotate','scale'])g[method]=()=>{};
 function el(id){
  if(elements.has(id))return elements.get(id);
  const list=new Set(['menu']),e={id,style:{},children:[],disabled:false,value:id==='difficulty'?'easy':id==='runLength'?'quick':'',
   classList:{add(n){list.add(n)},remove(n){list.delete(n)},contains(n){return list.has(n)}},
   getContext(){return g},append(n){this.children.push(n)},setAttribute(){},setPointerCapture(){}};
  elements.set(id,e);return e;
 }
 let srcCount=0;
 class Image {constructor(){this.naturalWidth=49}set src(v){srcCount++;this.url=v;this.onload?.()}}
 const document={currentScript:{src:'https://example.com/games/math_rune_forest/rune-forest-art.js'},
  getElementById:el,createElement(tag){return el('created-'+elements.size+'-'+tag)},
  addEventListener(){}};
 const window={AudioContext:null},location={href:'https://example.com/games/math_rune_forest/index.html'};
 const store=new Map();
 const context=vm.createContext({window,document,location,URL,Image,Math,innerWidth:width,innerHeight:height,
  addEventListener(){},requestAnimationFrame(fn){frame=fn},
  localStorage:{getItem(k){return store.get(k)||null},setItem(k,v){store.set(k,v)}}});
 vm.runInContext(art,context);vm.runInContext(combat,context);vm.runInContext(balance,context);
 vm.runInContext(script,context);
 return {game:window.__test,combat:window.RuneForestCombat,el,frame:()=>frame,
  visuals:()=>({drawCalls,srcCount}),context};
}
test('combat, art and inline scripts are valid and appear in correct order',()=>{
 assert.ok(inline&&script);
 for(const [name,js] of [['art',art],['combat',combat],['balance',balance],['inline',inline]])assert.doesNotThrow(()=>new vm.Script(js,{filename:name}));
 assert.ok(html.indexOf('src="rune-forest-art.js"')<html.indexOf('src="rune-forest-combat.js"'));
 assert.ok(html.indexOf('src="rune-forest-combat.js"')<html.indexOf('const COMBAT='));
 for(const type of ['charger','splitter','thief','warden','blast','slime'])
  assert.match(combat,new RegExp(type));
});
test('six specialized enemy families are available in appropriate phases',()=>{
 const {game,combat:AI}=makeBrowser();
 game.start();
 for(const kind of ['stone','warden','blast']){
  const e=game.spawn(48,kind);
  assert.equal(e.factor,true);assert.equal(e.kind,kind);
 }
 const s=game.getScene();s.phase=1;
 for(const kind of ['slime','charger','splitter','thief']){
  const e=game.spawn(undefined,kind);assert.equal(e.factor,false);assert.equal(e.kind,kind);
 }
 const p0=AI.chooseKind(0,()=>.99);
 const p1=AI.chooseKind(1,()=>.99);
 const p5=AI.chooseKind(5,()=>.99);
 assert.equal(p0,'stone');assert.equal(p1,'charger');assert.equal(p5,'thief');
});
test('legal strikes preserve exact division; illegal strikes do not raise combo',()=>{
 const {game}=makeBrowser();game.start();
 const s=game.getScene(),e=game.spawn(48,'stone');s.enemies=[e];
 e.cd=0;s.factor=0;
 assert.equal(game.strike(e),true);
 assert.equal(e.n,24);assert.equal(s.divisions,1);assert.equal(s.combo,1);
 e.cd=0;s.factor=3;
 assert.equal(game.strike(e),false);
 assert.equal(e.n,24);assert.equal(s.divisions,1);assert.equal(s.combo,1);
});
test('split slime creates at most two children with compatible positive divisors',()=>{
 const {game}=makeBrowser();game.start();
 const s=game.getScene();s.phase=1;game.enterPhase();s.enemies=[];
 const e=game.spawn(undefined,'splitter');s.enemies=[e];e.n=3;e.original=3;e.cd=0;
 const before=s.bag[s.selected].value;
 assert.equal(game.strike(e),true);assert.equal(s.bag[s.selected].value,before/3);
 const babies=s.enemies.filter(x=>x.kind==='mini');
 assert.equal(babies.length,2);
 for(const baby of babies){
  assert.ok(baby.n>1&&Number.isInteger(baby.n));
  assert.ok(s.bag.some(b=>b.value%baby.n===0));
 }
 // Live cap prevents uncontrolled splitting in crowded waves.
 s.enemies=[];for(let i=0;i<11;i++)s.enemies.push({dead:false,kind:'slime'});
 const p=game.spawn(undefined,'splitter');s.enemies=s.enemies.filter(x=>x!==p);s.enemies.push(p);
 const current=s.enemies.length;s.phase=1;game.kill(p);
 assert.ok(s.enemies.filter(x=>!x.dead).length<=12);
 assert.ok(current>=12);
});
test('charger warns before rushing; blast warns before applying damage; thief slows runes',()=>{
 const {combat:AI}=makeBrowser();
 const scene={x:0,y:0,hp:100,inv:0,armor:1,combo:4,comboT:5,chainShots:1,
  orbitSlow:0,phase:3,easy:false,enemies:[],fx:[],id:0};
 const callbacks={fx(){},tone(){},hurtPlayer:amount=>AI.hurt(scene,amount)};
 const make=(kind,x,y)=>{
  const e=AI.decorate({x,y,n:3,r:11,speed:12,factor:false,cd:0,blocked:0,hit:0,wiggle:0,
   dead:false,chain:[3]},kind,()=>0);
  e.skillCD=0;scene.enemies=[e];return e;
 };
 const charge=make('charger',60,0);AI.step(charge,scene,.1,callbacks);
 assert.equal(charge.mode,'windup');const originalX=charge.x;
 for(let i=0;i<9;i++)AI.step(charge,scene,.1,callbacks);
 assert.equal(charge.mode,'rush');AI.step(charge,scene,.1,callbacks);
 assert.notEqual(charge.x,originalX);
 const blast=make('blast',50,0);AI.step(blast,scene,.1,callbacks);
 assert.equal(blast.mode,'windup');assert.equal(scene.hp,100);
 for(let i=0;i<12;i++)AI.step(blast,scene,.1,callbacks);
 assert.ok(scene.hp<100,'telegraphed blast should land');
 assert.equal(scene.combo,0,'damage interrupts streak');
 const thief=make('thief',50,0);scene.orbitSlow=0;AI.step(thief,scene,.1,callbacks);
 assert.ok(scene.orbitSlow>2.5);
});
test('combo thresholds, dash immunity and cooldown are meaningful',()=>{
 const {game,combat:AI,el}=makeBrowser();game.start();
 const s=game.getScene();
 for(let i=0;i<3;i++)AI.streak(s);
 assert.equal(s.combo,3);assert.ok(s.comboHaste>0);
 for(let i=0;i<2;i++)AI.streak(s);
 assert.equal(s.combo,5);assert.ok(s.burst>0);
 for(let i=0;i<5;i++)AI.streak(s);
 assert.equal(s.combo,10);assert.equal(s.chainShots,1);
 assert.equal(game.dash(),true);
 const startingY=s.y;
 assert.equal(game.dash(),false,'dash cannot be spammed');
 assert.ok(s.inv>0);
 assert.equal(AI.hurt(s,100),false,'dash immunity blocks damage');
 game.update(.035);
 assert.ok(s.y<startingY,'facing up dashes upward');
 assert.ok(s.dashCD>5);
 assert.equal(el('dash').disabled,true);
 assert.ok(s.bestCombo>=10);
});
test('mobile battle renders without crashing, including telegraphs and new HUD',()=>{
 const b=makeBrowser(),{game,el}=b;
 game.start();assert.ok(el('dash').classList.contains('hidden')===false);
 const s=game.getScene();s.hp=5000;
 for(let i=1;i<=440;i++){const fn=b.frame();assert.equal(typeof fn,'function');fn(i*16);s.hp=Math.max(s.hp,5000)}
 assert.ok(b.visuals().drawCalls>100);
 assert.ok(b.visuals().srcCount>=20);
 assert.match(el('phase').textContent,/약수의 밤/);
 assert.equal(typeof el('dash').onclick,'function');
});
test('all six phase transitions remain reachable without math-rule rewrites',()=>{
 const {game}=makeBrowser(1024,768);game.start();
 const s=game.getScene();s.hp=100000;s.xp=-999;
 // Reduced trial duration is simulated without manually changing the phase.
 for(let i=0;i<6;i++){
  s.phaseT=s.phaseLength-.02;
  game.update(.035);
  if(i<5)assert.equal(s.phase,i+1);
 }
 assert.equal(s.phase,5);assert.equal(s.ending,true);
});


test('quick and long exploration keep six phases but have different pacing',()=>{
 const quick=makeBrowser(),gq=quick.game;gq.start();
 const s=gq.getScene();
 assert.equal(s.phaseLength,45);assert.equal(s.enemyCap,4);
 s.phase=1;gq.enterPhase();assert.equal(s.enemyCap,12);
 s.phase=3;gq.enterPhase();assert.equal(s.enemyCap,18);
 s.phase=5;gq.enterPhase();assert.equal(s.enemyCap,22);
 const normal=makeBrowser(),gn=normal.game;
 normal.el('difficulty').value='normal';normal.el('runLength').value='long';
 gn.start();const sn=gn.getScene();
 assert.equal(sn.phaseLength,75);assert.equal(sn.enemyCap,5);
 sn.phase=1;gn.enterPhase();assert.equal(sn.enemyCap,18);
 sn.phase=3;gn.enterPhase();assert.equal(sn.enemyCap,27);
 sn.phase=5;gn.enterPhase();assert.equal(sn.enemyCap,34);
});

test('final seal completes in 25 seconds even if monsters remain and win is explicit',()=>{
 const {game,el}=makeBrowser();game.start();
 const s=game.getScene();s.phase=5;game.enterPhase();s.xp=-999;
 s.enemies=[];const monster=game.spawn(undefined,'slime');
 monster.x=s.x+500;monster.y=s.y+500;monster.speed=0;s.enemies=[monster];
 s.phaseT=s.phaseLength-.01;game.update(.035);
 assert.equal(s.ending,true);assert.ok(s.sealLeft>24);
 assert.equal(s.nextSpawn,Infinity);assert.match(el('phase').textContent,/정화/);
 assert.ok(!el('sealBar').classList.contains('hidden'));
 let n=0;
 while(game.getState()==='play'&&n++<1000){game.update(.035);}
 assert.equal(game.getState(),'end');assert.equal(s.sealCleared,1);
 assert.equal(s.sealLeft,0);assert.equal(s.enemies.length,0);
});

test('correct divisions speed up sealing but illegal hits cannot',()=>{
 const {game}=makeBrowser();game.start();
 const s=game.getScene();s.phase=5;game.enterPhase();s.ending=true;
 s.sealLeft=25;s.sealBonus=0;
 const target=game.spawn(undefined,'slime');s.enemies=[target];
 const n=target.n;
 const valid=s.bag.findIndex(b=>b.value%n===0);
 assert.ok(valid>=0);
 game.choose(valid);
 assert.equal(game.strike(target),true);
 assert.ok(s.sealLeft<25&&s.sealBonus>0);
 assert.ok(s.sealBonus<=10);
 s.phase=4;game.enterPhase();s.ending=true;s.sealLeft=25;s.sealBonus=0;
 const stone=game.spawn(48,'stone');s.enemies=[stone];stone.cd=0;
 s.factor=3;
 assert.equal(game.strike(stone),false);
 assert.equal(s.sealLeft,25);
});

test('sealing shockwaves buy breathing room without changing monster numbers',()=>{
 const {combat:AI}=makeBrowser();
 const scene={x:0,y:0,maxHp:100,hp:50,enemies:[],burst:0};
 const e=AI.decorate({x:50,y:0,n:48,original:48,stun:0,dead:false},'stone');
 scene.enemies=[e];
 const seal=makeBrowser().context.window.RuneForestBalance;
 seal.beginSeal(scene);
 assert.equal(scene.hp,68);assert.equal(scene.sealLeft,25);
 seal.stepSeal(scene,5.05);
 assert.equal(scene.sealPulses,1);
 assert.ok(e.stun>=1.25);
 assert.equal(e.n,48,'visual protection cannot bypass mathematics');
 seal.stepSeal(scene,7.05);
 assert.equal(scene.sealPulses,2);
 seal.stepSeal(scene,7.05);
 assert.equal(scene.sealPulses,3);
 assert.equal(scene.enemies.length,1);
});

test('combo is capped at level 20 with one-time milestone rewards',()=>{
 const {combat:AI}=makeBrowser();
 const scene={x:0,y:0,combo:0,comboT:0,bestCombo:0,comboHaste:0,
  chainShots:0,burst:0,enemies:[]};
 const tags=[];
 for(let i=0;i<45;i++)AI.streak(scene,{fx:(x,y,label)=>tags.push(label)});
 assert.equal(scene.combo,20);assert.equal(scene.bestCombo,20);
 assert.equal(tags.filter(v=>v.startsWith('20연속')).length,1);
 assert.equal(scene.chainShots,2);
 assert.equal(scene.comboT,4.8);
});

test('new encounter rates slow the opening and limit later crowding',()=>{
 const {context}=makeBrowser();
 const p=context.window.RuneForestBalance;
 assert.ok(p.spawnDelay(1,true)>p.spawnDelay(5,true));
 assert.ok(p.spawnDelay(1,false)>p.spawnDelay(5,false));
 assert.ok(p.enemyCap(1,false)<p.enemyCap(5,false));
 assert.equal(p.duration('quick')*6+25,295);
 assert.equal(p.duration('long')*6+25,475);
});
