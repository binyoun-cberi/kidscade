const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const dir=path.join(ROOT,'games','science_cosmic_growth');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const css=fs.readFileSync(path.join(dir,'style.css'),'utf8');
const js=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'data','games.json'),'utf8'));

test('cosmic growth game shell is wired to local Three and Kidscade SDK',()=>{
  assert.match(html,/<title>먼지에서 블랙홀까지<\/title>/);
  assert.match(html,/data-game-id="science_cosmic_growth"/);
  assert.match(html,/assets\/vendor\/three-r160\/three\.module\.js/);
  assert.match(html,/game\.js\?v=4/);
  assert.match(html,/id="tapLayer"/);
  assert.match(html,/id="codex"/);
  assert.match(html,/id="scaleCompare"/);
  assert.match(html,/style\.css\?v=3/);
});

test('cosmic growth module has valid JS after module imports are stripped',()=>{
  const body=js.replace(/^import .*$/mg,'');
  assert.doesNotThrow(()=>new Function(body));
});

test('cosmic growth spans dust through quasar and reuses existing assets',()=>{
  for(const id of ['dust','asteroid','rocky_planet','star','supernova','stellar_black_hole','supermassive_black_hole','quasar']){
    assert.match(js,new RegExp("id:'"+id+"'"));
  }
  assert.match(js,/space\/planets\/planet/);
  assert.match(js,/3d\/nature\/kenney-nature-kit\/rock-/);
  assert.match(js,/effects\/particles\/kenney-particle-pack\/flare-01\.png/);
  assert.match(js,/effects\/particles\/kenney-particle-pack\/twirl-02\.png/);
  assert.match(js,/LOW_POWER/);
});

test('cosmic growth keeps neighbouring celestial scenery visible across scales',()=>{
  for(const fn of ['addDustNeighborhood','addAsteroidNeighborhood','addDistantWorlds','addNeighborStars','addCompanionGalaxies','addDeepField']){
    assert.ok(js.includes('function '+fn+'('),fn);
  }
  assert.match(js,/if\(i<=1\)addDustNeighborhood/);
  assert.match(js,/if\(i>=6&&i<=8\).*addDistantWorlds/);
  assert.match(js,/if\(i>=9&&i<=10\).*addNeighborStars/);
  assert.match(js,/if\(i>=16&&i<=17\).*addCompanionGalaxies/);
  assert.doesNotMatch(js,/if\(i>=16\)return;/);
});

test('cosmic growth shows named real-universe scale references and persistent lensing around black holes',()=>{
  for(const name of ['이토카와','베스타','세레스','지구','목성','태양','백조자리 X-1','궁수자리 A*','M87*','우리 은하','라니아케아 초은하단']){
    assert.ok(js.includes(name),name);
  }
  for(const fn of ['scaleReference','comparisonText','makeLabelSprite','addScaleReference','addBlackHoleLensing']){
    assert.ok(js.includes('function '+fn+'('),fn);
  }
  assert.match(js,/state\.stage<12\|\|state\.stage>15/);
  assert.match(js,/RingGeometry\(r,r\+\.035,128\)/);
  assert.match(css,/\.scaleCompare\{/);
  assert.match(css,/\.scaleCompare\{left:7px;top:126px/);
});

test('science facts and observation events are part of actual progression',()=>{
  for(const id of ['fusion','aurora','supernova','event_horizon','lensing','spaghettification','gravity_wave','jet']){
    assert.match(js,new RegExp("id:'"+id+"'"));
  }
  assert.match(js,/function discover\(/);
  assert.match(js,/function observeEvent\(/);
  assert.match(js,/science_cosmic_growth\.'\+slot/);
  assert.match(js,/reportAchievement\('black_hole'/);
  assert.match(js,/reportAchievement\('discoveries_12'/);
});

test('cosmic growth is registered as an all-grade science simulation',()=>{
  const game=catalog.games.find(x=>x.id==='science_cosmic_growth');
  assert.ok(game);
  assert.equal(game.title,'먼지에서 블랙홀까지');
  assert.equal(game.subject,'science');
  assert.equal(game.genre,'simulation');
  assert.equal(game.age,'low');
  assert.deepEqual(game.ages,['low','high']);
  assert.deepEqual(game.input,['touch','keyboard']);
  assert.equal(game.href,'games/science_cosmic_growth/index.html');
});

test('mobile layout keeps the upgrade strip compact',()=>{
  assert.match(css,/@media\(max-width:680px\)/);
  assert.match(css,/\.upgradeList\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
const vm=require('node:vm');
function progression(){
 const head=js.slice(js.indexOf('const EARTH='),js.indexOf('const ui='));
 const rates=js.slice(js.indexOf('function tapPower()'),js.indexOf('function save()'));
 const box={};vm.createContext(box);vm.runInContext(head+";let state={stage:0,research:0,upgrades:{}};"+rates+";this.api={STAGES,DISCOVERIES,UPGRADES,tapPower,autoRate,setState:s=>state=s};",box);return box.api;
}
test('all 24 stages have valid discoveries and growing thresholds',()=>{
 const {STAGES,DISCOVERIES}=progression();assert.equal(STAGES.length,24);
 for(const [i,s] of STAGES.entries()){
  assert.ok(Number.isFinite(s.need)&&s.need>0);assert.ok(s.m0>0&&s.m1>0);
  for(const id of s.discover)assert.ok(DISCOVERIES.some(d=>d.id===id&&d.min<=i),id);
  if(i>0&&!s.auto&&!STAGES[i-1].auto)assert.ok(s.need>STAGES[i-1].need);
 }
 assert.equal(STAGES.at(-1).id,'cosmic_web');
});
test('even maximum research and upgrades cannot skip late structures in seconds',()=>{
 const api=progression();const upgrades=Object.fromEntries(api.UPGRADES.map(u=>[u.id,true]));
 for(let stage=12;stage<24;stage++){
  api.setState({stage,research:10,upgrades:Object.fromEntries(api.UPGRADES.filter(u=>u.min<=stage).map(u=>[u.id,true]))});
  const seconds=api.STAGES[stage].need/(api.tapPower()*3);
  assert.ok(seconds>30,api.STAGES[stage].id+' '+seconds);
 }
});
test('active progression simulation keeps black hole and cosmic web as long term goals',()=>{
 const api=progression();let state={stage:0,research:0,upgrades:{}},progress=0,insight=2,taps=0,elapsed=0,blackHole=0;
 const found=new Set(['cosmic_dust','micro_scale']);
 while(state.stage<23&&elapsed<30000){
  for(const u of api.UPGRADES)if(u.min<=state.stage&&!state.upgrades[u.id]&&insight>=u.cost){insight-=u.cost;state.upgrades[u.id]=true}
  const cost=3+state.research*2;if(state.research<10&&insight>=cost){insight-=cost;state.research++}
  api.setState(state);elapsed++;taps+=2;if(taps%250===0)insight++;
  if(elapsed%25===0)insight++; // successful repeat observation
  progress+=api.tapPower()*2;
  const current=api.STAGES[state.stage];
  if(progress>=current.need){progress=current.auto?0:Math.min(progress-current.need,api.STAGES[state.stage+1].need*.1);state.stage++;insight+=2;
   for(const id of api.STAGES[state.stage].discover)if(!found.has(id)){found.add(id);insight++}
   if(state.stage===12)blackHole=elapsed;
  }
 }
 console.log('active simulation: black hole',Math.round(blackHole/60),'min; cosmic web',Math.round(elapsed/60),'min');
 assert.ok(blackHole>600&&blackHole<5400);assert.ok(elapsed>3600&&elapsed<20000);assert.equal(state.stage,23);
});

test('holding Space never generates extra growth and focused controls are excluded',()=>{
 const line=js.split('\n').find(l=>l.startsWith("addEventListener('keydown'"));
 let callback,count=0;const box={addEventListener:(type,fn)=>callback=fn,running:true,modalOpen:false,innerWidth:800,innerHeight:600,document:{activeElement:{tagName:'BODY'}},onTap:()=>count++};
 vm.runInNewContext(line,box);
 callback({code:'Space',repeat:false,preventDefault(){}});
 for(let i=0;i<30;i++)callback({code:'Space',repeat:true,preventDefault(){}});
 assert.equal(count,1);
 callback({code:'Space',repeat:false,preventDefault(){}});assert.equal(count,2);
 box.document.activeElement.tagName='BUTTON';callback({code:'Space',repeat:false,preventDefault(){}});assert.equal(count,2);
});

test('idle animation does not add growth and upgrades improve deliberate taps',()=>{
 const animate=js.slice(js.indexOf('function animate('),js.indexOf("$('tapLayer').addEventListener"));
 assert.doesNotMatch(animate,/addGrowth\(|advanceStage\(|state\.progress\s*=/);
 const api=progression();api.setState({stage:7,research:0,upgrades:{}});const base=api.tapPower();
 api.setState({stage:7,research:0,upgrades:{gas_accretion:true}});assert.ok(api.tapPower()>base);
});
