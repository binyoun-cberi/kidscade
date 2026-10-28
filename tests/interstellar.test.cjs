const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const base='../games/science_cosmic_growth/';
const rules=()=>import(base+'interstellar-core.mjs');
test('upgrade dependencies, funds and maximum levels are enforced',async()=>{const c=await rules(),s=c.fresh();assert.equal(c.buy(s,'damage'),false);s.money=1e20;assert.equal(c.buy(s,'star'),false);assert.equal(c.buy(s,'damage'),true);assert.equal(c.cost(s,c.UPGRADES[0]),33);for(let i=0;i<30;i++)c.buy(s,'damage');assert.equal(c.level(s,'damage'),16);assert.equal(c.buy(s,'damage'),false)});
test('mass offers a tradeoff and stacked buffs respect their cap',async()=>{const c=await rules(),s=c.fresh(),before=c.bodyStats(s,0);s.levels.mass=1;const after=c.bodyStats(s,0);assert.equal(after.hp/before.hp,1.6);assert.equal(after.value/before.value,2.5);assert.deepEqual(c.stats(s,100,true),c.stats(s,1,true));assert.ok(c.stats(s,1,true).interval<c.stats(s).interval);assert.equal(c.stats(s,0,true).reward,4);s.levels.time=2;assert.equal(c.stats(s).duration,30)});
test('corrupt or future saves cannot inject invalid currency or levels',async()=>{const c=await rules();const s=c.sanitize({money:Infinity,total:-1,levels:{damage:999,speed:NaN,moonCap:-9,nova:Infinity}});assert.equal(s.money,0);assert.equal(s.total,0);assert.equal(s.levels.damage,16);assert.equal(s.levels.speed,0);assert.equal(s.levels.nova,0);assert.equal(s.levels.moonCap,0);assert.notEqual(c.SAVE_KEY,'kidscade_game_v1:science_cosmic_growth:save')});
test('all upgrade branches remain reachable and numeric scale reaches Q',async()=>{const c=await rules(),s=c.fresh();s.money=1e30;for(let pass=0;pass<10;pass++)for(const u of c.UPGRADES)c.buy(s,u.id);assert.ok(c.UPGRADES.every(u=>c.level(s,u.id)>0));assert.equal(c.sizeFor(1e15),20);assert.equal(c.format(1e15),'1.00Q')});
async function harness(saved){const c=await rules(),elements=new Map(),events={};const make=()=>({hidden:false,textContent:'',innerHTML:'',disabled:false,style:{},classList:{add(){},remove(){}},setAttribute(){},replaceChildren(){},append(){},addEventListener(n,f){this[n]=f},setPointerCapture(){}});const ctx=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id)};get('universe').getContext=()=>ctx;const store=saved?{[c.SAVE_KEY]:saved}:{};let now=0;const box={...c,document:{getElementById:get,createElement:make,createElementNS:make,body:make(),addEventListener:(n,f)=>events[n]=f},window:{},localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},matchMedia:()=>({matches:false}),innerWidth:1024,innerHeight:768,devicePixelRatio:1,performance:{now:()=>now},requestAnimationFrame(){},addEventListener:(n,f)=>events[n]=f,setTimeout:()=>1,clearTimeout(){},HTMLButtonElement:class{},HTMLInputElement:class{},console};vm.createContext(box);const src=fs.readFileSync(require.resolve(base+'interstellar.js'),'utf8').replace(/^import .*;\n/,'');vm.runInContext(src,box);return {get,store,events,run:code=>vm.runInContext(code,box),step:n=>{for(let i=0;i<n;i++){now+=50;vm.runInContext(`frame(${now})`,box)}}}}
test('full session awards once, pauses time, purchases and restores separate save',async()=>{const h=await harness();h.get('start').onclick();h.run('pointer.active=true;pointer.x=bodies[0].x;pointer.y=bodies[0].y');h.step(1);assert.ok(h.run('earned')>=1);const money=h.run('state.money');h.get('pause').onclick();const t=h.run('time');h.step(30);assert.equal(h.run('time'),t);h.get('resume').onclick();h.step(510);assert.equal(h.run('phase'),'summary');assert.equal(h.run('state.rounds'),1);h.get('end').onclick();assert.equal(h.run('state.rounds'),1);assert.ok(h.run('state.money')>=money);assert.ok(Object.keys(h.store).every(k=>k.endsWith(':interstellar')));h.run("state.money=100;selected='damage'");h.get('purchase').onclick();assert.equal(h.run('state.levels.damage'),1);assert.equal(h.run('state.money'),88);assert.equal(JSON.parse(Object.values(h.store)[0]).levels.damage,1);const restored=await harness(Object.values(h.store)[0]);assert.equal(restored.run('state.money'),88);assert.equal(restored.run('state.levels.damage'),1)});
test('moon, comet, chain lightning, lasers and novas work without recursive explosions',async()=>{const h=await harness();h.get('start').onclick();h.run("for(const u of UPGRADES)state.levels[u.id]=u.max; bodies=[]; const b=spawn();b.hp=1;b.type='moon';damage(b,1);damage(b,1)");assert.equal(h.run('moonTimers.length'),1);assert.equal(h.run('destroyed'),1);h.run("const comet=spawn();comet.hp=1;comet.type='comet';damage(comet,1)");assert.equal(h.run('rainbow'),8);h.run("bodies=Array.from({length:100},(_,i)=>({...spawn(),hp:1,x:400+i,y:400,type:['lightning','laser','nova'][i%3]}));damage(bodies[0],1e100);specials()");assert.ok(h.run('destroyed')>10);assert.equal(h.run('pending.length'),0);assert.ok(Number.isFinite(h.run('state.money')));assert.ok(h.run('fx.length')<=240)});
test('cancelled touch and hidden documents stop attacks and pause the session',async()=>{const h=await harness();h.get('start').onclick();h.run('pointer.active=true');h.get('universe').pointercancel();assert.equal(h.run('pointer.active'),false);h.run('document.hidden=true');h.events.visibilitychange();assert.equal(h.run('phase'),'paused')});

test('refund conserves research currency across purchases, reloads and repeated resets',async()=>{
 const c=await rules(),s=c.fresh();s.money=1000;
 for(const id of ['damage','speed','lightning','radius','moon'])assert.ok(c.buy(s,id));
 const spent=1000-s.money;assert.equal(s.investment,spent);
 const restored=c.sanitize(JSON.parse(JSON.stringify(s)));
 assert.equal(c.refund(restored),spent);assert.equal(restored.money,1000);assert.equal(c.refund(restored),0);
 assert.equal(c.level(restored,'lightning'),0);assert.equal(c.buy(restored,'lightning'),false);
 const legacy=c.sanitize({levels:{damage:1,lightning:1,moon:1},money:4,total:90,version:1});
 assert.equal(c.refund(legacy),12+180+250);assert.equal(legacy.total,90);
});
test('loadout bonuses and tier mixtures change strategy while keeping starter rocks',async()=>{
 const c=await rules(),s=c.fresh();s.levels.planet=1;s.levels.star=1;
 const count=()=>Array.from({length:100},(_,i)=>c.tierFor(s,(i+.5)/100)).reduce((a,t)=>(a[t]++,a),[0,0,0]);
 s.mix='rocks';const rocks=count();s.mix='stars';const stars=count();assert.ok(rocks[0]>stars[0]);assert.ok(stars[2]>rocks[2]);assert.ok(stars[0]>=30);
 s.focus='moon';assert.equal(c.stats(s).moonCap,2);s.focus='gold';assert.ok(c.stats(s).crit>.1);
 const before=c.breakSeconds(s,1);s.levels.damage=3;assert.ok(c.breakSeconds(s,1)<before);
});
test('first-session samples and newly unlocked specials cannot be missed by spawn randomness',async()=>{
 const h=await harness();h.get('start').onclick();assert.equal(h.run("bodies.filter(b=>b.intro&&b.type==='lightning').length"),1);assert.equal(h.run("bodies.filter(b=>b.intro&&b.type==='moon').length"),1);
 h.run("state.rounds=10;state.seen=['lightning','moon'];state.levels.laser=1;begin()");
 assert.equal(h.run("bodies.filter(b=>b.intro&&b.type==='laser').length"),1);
 h.run("damage(bodies.find(b=>b.intro&&b.type==='laser'),1e100)");assert.ok(h.run("state.seen.includes('laser')"));
});
test('time distortion, wormhole travel and accretion charge have bounded lifetimes',async()=>{
 const h=await harness();h.get('start').onclick();h.run('elapsed=7.99');h.step(1);assert.ok(h.run('warp')>0);
 const time=h.run('time');h.step(10);assert.ok(time-h.run('time')<.25);
 h.get('pause').onclick();const warp=h.run('warp');h.step(20);assert.equal(h.run('warp'),warp);h.get('resume').onclick();
 h.run('elapsed=13.99');h.step(1);assert.equal(h.run('eventStage'),2);assert.ok(h.run('wormhole')>0);
 assert.ok(h.run('bodies.every(b=>b.x>=b.r&&b.x<=w-b.r&&b.y>=170)'));
 h.run('charge=18;overloadCooldown=0');h.step(1);assert.ok(h.run('overloadCooldown')>0);assert.ok(h.run('pulse')>0);
});
test('orbital fragments pulse on arrival and touch cursor stays above the finger',async()=>{
 const h=await harness();h.get('start').onclick();h.run("fx=[];const rock={x:300,y:300,type:'planet',tier:1};feedFragments(rock);updateEffects(.65)");
 assert.ok(h.run("fx.filter(e=>e.kind==='feed').length")>=3);
 assert.ok(h.run("fx.filter(e=>e.kind==='feed').every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y))"));
 h.run('updateEffects(.5)');assert.ok(h.run('pulse')>0);
 h.get('universe').pointerdown({pointerId:1,clientX:300,clientY:400,pointerType:'touch',buttons:1});assert.equal(h.run('pointer.y'),354);
});
test('singularity finale completes once and the completion survives reload',async()=>{
 const h=await harness();h.get('start').onclick();h.run('state.total=1e12;destroyed=12');h.get('end').onclick();
 assert.equal(h.run('phase'),'finale');assert.equal(h.run('state.rounds'),1);assert.equal(h.run('state.cleared'),true);
 h.get('end').onclick();assert.equal(h.run('state.rounds'),1);h.step(60);assert.equal(h.run('phase'),'summary');
 const restored=await harness(Object.values(h.store)[0]);assert.equal(restored.run('state.cleared'),true);
});
test('UI free reallocation preserves records, and selecting a build is saved',async()=>{
 const h=await harness();h.run("state.money=100;buy(state,'damage');state.total=321;state.best=50;show('tree')");
 h.get('focus').value='burst';h.get('focus').onchange();assert.equal(h.run('state.focus'),'burst');
 h.get('refund').onclick();assert.equal(h.run('state.money'),100);assert.equal(h.run('state.total'),321);assert.equal(h.run('state.best'),50);assert.equal(h.run('state.investment'),0);
});
