const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const dir=path.join(root,'games','language_word_siege');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const runtime=fs.readFileSync(path.join(dir,'game.js'),'utf8');
const dataSource=fs.readFileSync(path.join(dir,'word-data.js'),'utf8');
const lexiconSource=fs.readFileSync(path.join(dir,'open-lexicon.js'),'utf8');
const stagesSource=fs.readFileSync(path.join(dir,'stages.js'),'utf8');
const visualsSource=fs.readFileSync(path.join(dir,'visuals.js'),'utf8');
function loadStages(){
  const sandbox={window:{}};
  vm.runInNewContext(stagesSource,sandbox,{filename:'stages.js'});
  return sandbox.window.WordSiegeStages;
}

function loadData(){
  const sandbox={window:{}};
  vm.runInNewContext(lexiconSource,sandbox,{filename:'open-lexicon.js'});
  vm.runInNewContext(dataSource,sandbox,{filename:'word-data.js'});
  return sandbox.window.WordSiegeData;
}

function canSpell(rack,word){
  const counts={};
  for(const c of rack)counts[c]=(counts[c]||0)+1;
  for(const c of word){if(!counts[c])return false;counts[c]--}
  return true;
}

test('Word Siege runtime parses and uses Kidscade shared storage',()=>{
  for(const file of ['game.js','word-data.js','open-lexicon.js','stages.js','visuals.js']){
    const src=fs.readFileSync(path.join(dir,file),'utf8');
    const parsed=spawnSync(process.execPath,['--check'],{input:src,encoding:'utf8'});
    assert.equal(parsed.status,0,parsed.stderr||parsed.stdout);
  }
  assert.ok(html.includes('../../kidscade-storage.js'));
  assert.ok(html.includes('stages.js'));
  assert.ok(html.includes('open-lexicon.js'));
  assert.ok(html.includes('id="freeWord"'));
  assert.ok(html.includes('visuals.js'));
  assert.ok(html.includes('id="stageList"'));
  assert.ok(html.includes('id="waveProgress"'));
  assert.ok(html.includes('data-game-id="language_word_siege"'));
  assert.ok(!runtime.includes('localStorage.getItem('));
  assert.ok(!runtime.includes('localStorage.setItem('));
});

test('Word Siege starts with a guaranteed economy and attack choice',()=>{
  const data=loadData();
  assert.equal(data.maxRack,12);
  assert.equal(data.startRack.length,12);
  assert.ok(canSpell(data.startRack,'MINER'));
  assert.ok(canSpell(data.startRack,'ARROW'));
  assert.equal(data.words.MINER.role,'resource');
  assert.equal(data.words.ARROW.role,'rapid');
  assert.equal(data.words.FIRE.role,'burn');
  assert.equal(data.words.ICE.role,'slow');
  assert.equal(data.words.FAST.role,'modifier');
  assert.ok(Object.keys(data.words).length>=400);
  assert.equal(data.wordList.length,4101);
  assert.ok(data.totalWords>=19000,'Expected a substantially expanded word dictionary');
  assert.ok(data.importedWords>=18000);
  assert.equal(data.words.COW.meaning,'소');
  assert.equal(data.words.COW.role,'rapid');
  assert.equal(data.words.FIGHT.meaning,'싸우다');
  assert.equal(data.words.FIGHT.role,'pierce');
  assert.ok(data.words.NUKE&&data.signatures.NUKE);
  assert.equal(data.combos.length,20);
  assert.ok(Object.keys(data.signatures).length>=60);
});

test('Word Siege contains the intended tower-defense and anti-stall loop',()=>{
  assert.match(runtime,/const MAX_WAVES=8|state\.wave>=8|WAVE.*8/);
  assert.match(runtime,/function availableWords\(/);
  assert.match(runtime,/function showHint\(/);
  assert.match(runtime,/function ensurePlayableRack\(/);
  assert.match(runtime,/def\.role==='resource'/);
  assert.match(runtime,/function applyLinks\(/);
  assert.match(runtime,/Math\.max\(\.65,Math\.pow\(\.93,duplicates\)\)/);
  assert.match(runtime,/function startWave\(/);
  assert.match(runtime,/function endGame\(/);
});

test('Word Siege storage keys are registered',()=>{
  const storage=fs.readFileSync(path.join(root,'kidscade-storage.js'),'utf8');
  assert.match(storage,/wordSiegeDictionary:\s*'kidscade_word_siege_discovered_v1'/);
  assert.match(storage,/wordSiegeBest:\s*'kidscade_word_siege_best_v1'/);
  assert.match(storage,/wordSiegeStages:\s*'kidscade_word_siege_stage_v1'/);
});

test('Word Siege is registered as a language strategy game',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const game=catalog.games.find(g=>g.id==='language_word_siege');
  assert.ok(game);
  assert.equal(game.title,'워드 시즈');
  assert.equal(game.subject,'language');
  assert.equal(game.genre,'strategy');
  assert.deepEqual(game.ages,['low','high']);
  assert.equal(game.scoreKey,'kidscade_word_siege_best_v1');
});


test('Word Siege word semantics and combos are internally consistent',()=>{
  const d=loadData();
  for(const [word,entry] of Object.entries(d.words)){
    assert.match(word,/^[A-Z]+$/);
    assert.ok(word.length<=d.maxRack,'unspellable entry: '+word);
    assert.ok(entry.meaning&&!entry.meaning.startsWith('빠른 공격'),'missing meaning: '+word);
    assert.ok(d.roleStats[entry.role],'unknown role: '+word);
    assert.ok(entry.difficulty>=1&&entry.difficulty<=9);
  }
  for(const pair of d.combos){
    assert.ok(d.words[pair.a]&&d.words[pair.b],'missing combo word '+pair.name);
    assert.ok(pair.name);
  }
  assert.equal(d.signatures.THUNDERBOLT.chain,4);
  assert.equal(d.signatures.SHOCKWAVE.element,'push');
});

function headlessGame(){
  const d=loadData(), elements=new Map();
  class Element{
    constructor(){
      this.innerHTML='';this.textContent='';this.value='';this.disabled=false;this.style={setProperty(){}};this.dataset={};
      this.classList={add(){},remove(){}};
    }
    addEventListener(){}
    appendChild(){}
    getBoundingClientRect(){return {left:0,top:0,width:1000,height:600}}
    getContext(){return {setTransform(){}}}
  }
  const document={
    getElementById(id){if(!elements.has(id))elements.set(id,new Element());return elements.get(id)},
    createElement(){return new Element()}
  };
  const window={
    WordSiegeData:d,WordSiegeStages:loadStages(),
    KidscadeStorage:{getJson(){return []},setJson(){return true},getInt(key){return key==='kidscade_word_siege_stage_v1'?10:0},setRaw(){return true}},
    addEventListener(){},devicePixelRatio:1
  };
  const hooks=`window.__headless={restart,startWave,update,beginPlacement,buildTower,makeTowerStats,towerCost,availableWords,validPlacement,rolePlacementValid,applyLinks,effectiveStats,showHint,swapOne,selectStage,currentStage,createWave,tileWord,typedWord,attackEnemy,towerUpdate,shotUpdate,updateTraps,updateFields,spawnEnemy,getInput:()=>freeWord, get state(){return state}};resize();`;
  const patched=runtime.replace('resize();requestAnimationFrame(loop);',hooks);
  assert.notEqual(patched,runtime,'headless hooks are missing');
  const ctx={window,document,performance:{now:()=>0},setTimeout(){return 0},clearTimeout(){},requestAnimationFrame(){}};
  vm.runInNewContext(patched,ctx,{filename:'game.js',timeout:3000});
  window.__headless.restart();
  return {h:window.__headless,d,window};
}
function spell(state,word){
  const used=new Set(),chosen=[];
  for(const letter of word){
    const index=state.rack.findIndex((ch,i)=>ch===letter&&!used.has(i));
    if(index<0)return false;
    chosen.push(index);used.add(index);
  }
  state.selected=chosen;return true;
}
function buildMatching(h,d,word){
  if(!spell(h.state,word))return false;
  if(h.state.ink<h.towerCost(d.words[word]))return false;
  h.beginPlacement();
  if(!h.state.placing)return false;
  const spots=[];
  for(let y=.075;y<.94;y+=.045)for(let x=.07;x<.95;x+=.045){
    const p={x:+x.toFixed(4),y:+y.toFixed(4)};
    if(h.validPlacement(p)&&h.rolePlacementValid(p,d.words[word],word))spots.push(p);
  }
  if(!spots.length){h.state.placing=null;h.state.selected=[];return false}
  // Keep production near its ore and attack towers around the bends in the path.
  spots.sort((a,b)=>Math.abs(a.x-.50)+Math.abs(a.y-.44)-Math.abs(b.x-.50)-Math.abs(b.y-.44));
  h.buildTower(spots[0]);return !h.state.placing;
}

test('Word Siege headless construction spends INK and prevents free idle mining',()=>{
  const {h,d}=headlessGame();
  assert.equal(h.state.ink,20);
  assert.ok(buildMatching(h,d,'MINER'));
  const afterMine=h.state.ink;
  assert.ok(afterMine<20,'construction should cost INK');
  assert.ok(buildMatching(h,d,'ARROW'));
  const afterBoth=h.state.ink;
  assert.ok(afterBoth>=0,'starter economy must allow MINER + ARROW');
  h.update(12);
  assert.equal(h.state.ink,afterBoth,'mining while paused would trivialize INK');
  h.startWave();
  for(let i=0;i<200;i++)h.update(.04);
  assert.ok(h.state.ink>afterBoth,'the miner should generate INK in combat');
  assert.ok(h.state.towers.length===2);
  assert.ok(h.makeTowerStats('THUNDERBOLT',d.words.THUNDERBOLT).chain===4);
  assert.ok(h.makeTowerStats('GLACIER',d.words.GLACIER).slow<h.makeTowerStats('ICE',d.words.ICE).slow);
});

test('Word Siege meaningful pairs activate only when towers are neighbors',()=>{
  const {h,d}=headlessGame(),s=h.state;
  const wordTower=(word,x,y)=>({
    id:s.uid++,word,def:d.words[word],stats:h.makeTowerStats(word,d.words[word]),
    x,y,cool:0,harvestClock:0,pulse:0,links:[],combos:[]
  });
  const a=wordTower('FIRE',.25,.15),b=wordTower('WIND',.37,.15);
  s.towers.push(a,b);
  h.applyLinks();
  assert.ok(s.discoveredCombos.has('화염폭풍'));
  assert.ok(h.effectiveStats(a).damage>a.stats.damage);
  b.x=.9;b.y=.9;h.applyLinks();
  assert.equal(a.combos.length,0);
});

test('Word Siege full-wave bot simulations terminate without runtime errors', {timeout:60000},()=>{
  const styles=[
    {name:'beginner',build:1,maxLen:5},
    {name:'mixed',build:2,maxLen:8},
    {name:'advanced',build:3,maxLen:12},
    {name:'hint-user',build:2,maxLen:7,hint:true}
  ];
  const results=[];
  for(const style of styles){
    const {h,d}=headlessGame();
    if(style.name!=='beginner')buildMatching(h,d,'MINER');
    else buildMatching(h,d,'ARROW');
    let rounds=0;
    for(let wave=1;wave<=8&&!h.state.ended;wave++){
      for(let j=0;j<style.build;j++){
        let available=h.availableWords().filter(w=>w.length<=style.maxLen&&h.state.ink>=h.towerCost(d.words[w]));
        available=available.filter(w=>d.words[w].role!=='repair'&&d.words[w].role!=='modifier');
        available.sort((a,b)=>{
          const score=w=>(d.words[w].role==='resource'?(h.state.towers.some(t=>t.def.role==='resource')?-10:6):10)
            +(d.words[w].difficulty*.4)+((d.signatures[w]||{}).damage||1);
          return score(b)-score(a);
        });
        if(style.hint&&h.state.ink>5)h.showHint();
        if(!available.length){if(h.state.ink>=2)h.swapOne();continue}
        if(!buildMatching(h,d,available[0]))continue;
      }
      h.startWave();
      let steps=0;
      while(h.state.inWave&&!h.state.ended&&steps++<2800)h.update(.04);
      assert.ok(steps<2800,'stuck wave '+wave+' for '+style.name);
      rounds=h.state.wave;
    }
    assert.ok(h.state.ended,'simulation should reach victory or defeat: '+style.name);
    results.push({name:style.name,waves:rounds,core:Math.ceil(h.state.core),towers:h.state.towers.length,unique:h.state.unique.size,combos:h.state.discoveredCombos.size});
  }
  console.log('WORD_SIEGE_SIMULATION '+JSON.stringify(results));
  assert.equal(results.length,4);
});

test('Word Siege campaign contains ten genuinely distinct maps and resource layouts',()=>{
  const stages=loadStages();
  assert.equal(stages.length,10);
  assert.equal(new Set(stages.map(s=>s.name)).size,10);
  assert.equal(new Set(stages.map(s=>JSON.stringify(s.path))).size,10);
  assert.equal(new Set(stages.map(s=>s.focus)).size>=7,true);
  for(const s of stages){
    assert.equal(s.waves,8);
    assert.ok(s.path.length>=9,s.name+' has a short route');
    assert.ok(s.resources.length>=3,s.name+' has too few resource nodes');
    assert.ok(s.path[0][0]<=.03&&s.path.at(-1)[0]>=.95);
    assert.ok(s.resources.every(r=>r.x>.03&&r.x<.96&&r.y>.05&&r.y<.95));
    for(const pair of s.path)assert.ok(pair.every(v=>v>=0&&v<=1),s.name+' path out of bounds');
  }
});

test('Word Siege all ten stages permit word tower building and start unique waves',()=>{
  const {h,d}=headlessGame(),stages=loadStages();
  const focuses=new Set(),patterns=new Set();
  for(let i=0;i<stages.length;i++){
    assert.ok(h.selectStage(i),'cannot select stage '+(i+1));
    h.restart();
    assert.equal(h.currentStage().id,stages[i].id);
    assert.equal(h.state.resources.length,stages[i].resources.length);
    const places=[];
    for(let y=.075;y<.94;y+=.045){
      for(let x=.07;x<.95;x+=.045){
        const p={x:+x.toFixed(4),y:+y.toFixed(4)};
        if(h.validPlacement(p)&&h.rolePlacementValid(p,d.words.ARROW,'ARROW'))places.push(p);
      }
    }
    assert.ok(places.length>=3,'stage '+(i+1)+' lacks attacking positions');
    // A miner should have a legal node-adjacent position, not on the path.
    let miners=0;
    for(let y=.075;y<.94;y+=.045)for(let x=.07;x<.95;x+=.045){
      const p={x:+x.toFixed(4),y:+y.toFixed(4)};
      if(h.validPlacement(p)&&h.rolePlacementValid(p,d.words.MINER,'MINER'))miners++;
    }
    assert.ok(miners>=2,'stage '+(i+1)+' lacks mine locations');
    assert.ok(buildMatching(h,d,'ARROW'),'stage '+(i+1)+' could not build ARROW');
    h.startWave();assert.equal(h.state.wave,1);
    const queue=h.createWave(8);
    assert.ok(queue.length>=40);
    focuses.add(stages[i].focus);patterns.add(queue.map(x=>x.type).join(','));
    for(let j=0;j<100;j++)h.update(.04);
    assert.ok(h.state.wave<=1||h.state.ended);
  }
  assert.ok(focuses.size>=7);
  assert.ok(patterns.size>=7,'wave patterns should differ by stage');
});

test('Word Siege dictionary rejects gibberish and supports example words',()=>{
  const d=loadData();
  for(const w of ['COW','FIGHT','NUKE','DOG','HORSE','COMPUTER','HAPPY','RIVER','EAGLE','BANANA']){
    assert.ok(d.words[w],'missing playable word '+w);
    assert.ok(d.words[w].meaning.length>0);
  }
  for(const w of ['ASDFGH','QWERTYUIOP','ZZZZQQQ','FUCK','SHIT']){
    assert.ok(!d.words[w],'unwanted word accepted '+w);
  }
  assert.equal(new Set(d.allWordList).size,d.allWordList.length,'duplicate word entries');
  assert.equal(d.allWordList.length,d.totalWords);
});

test('Word Siege free typing costs INK but does not consume rack letters',()=>{
  const {h,d}=headlessGame();
  const input=h.getInput();
  const firstRack=h.state.rack.join('');
  input.value='COW';
  assert.equal(h.tileWord(),'COW');
  const c=h.towerCost(d.words.COW,'COW',true);
  assert.ok(c>h.towerCost(d.words.COW));
  assert.ok(h.state.ink>=c);
  h.beginPlacement();
  assert.ok(h.state.placing?.fromTyping);
  assert.equal(h.state.placing.cost,c);
  const p={x:.39,y:.55};
  assert.ok(h.validPlacement(p)&&h.rolePlacementValid(p,d.words.COW,'COW'));
  h.buildTower(p);
  assert.ok(h.state.towers.some(t=>t.word==='COW'));
  assert.equal(h.state.rack.join(''),firstRack);
  assert.equal(input.value,'');
  input.value='NUKE';
  assert.ok(h.towerCost(d.words.NUKE,'NUKE',true)>20,'legendary tower must not be cheap');
  h.beginPlacement();
  assert.ok(!h.state.placing,'cannot place unaffordable NUKE');
});

test('Word Siege words have genuinely distinct weapon modes and descriptions',()=>{
  const {h,d}=headlessGame();
  assert.ok(Object.keys(d.behaviors).length>=35);
  for(const [word,b] of Object.entries(d.behaviors)){
    assert.ok(d.words[word],'behavior word missing from dictionary: '+word);
    assert.ok(b.description,'missing readable behavior: '+word);
    assert.equal(h.makeTowerStats(word,d.words[word]).mode,b.mode);
  }
  assert.equal(h.makeTowerStats('RAILGUN',d.words.RAILGUN).mode,'rail');
  assert.equal(h.makeTowerStats('SHOTGUN',d.words.SHOTGUN).mode,'shotgun');
  assert.equal(h.makeTowerStats('GATLING',d.words.GATLING).area,0);
  const nuke=h.makeTowerStats('NUKE',d.words.NUKE);
  assert.ok(nuke.damage>=200&&nuke.damage<500,'NUKE should be strong without double scaling');
  assert.ok(nuke.rate<.2&&nuke.area>=.22);
});

test('Word Siege applies fire and ice together and spider really slows targets',()=>{
  const {h,d}=headlessGame(),s=h.state;
  const make=(word)=>({
    id:s.uid++,word,def:d.words[word],stats:h.makeTowerStats(word,d.words[word]),
    x:.4,y:.4,cool:0,harvestClock:0,pulse:0,links:[],combos:[]
  });
  const enemy=()=>({
    id:s.uid++,hp:300,maxHp:300,x:.45,y:.4,armor:.3,shield:0,
    poison:0,poisonDps:0,burn:0,burnDps:0,slow:1,pushBack:0,dead:false
  });
  const fire=make('FIRE'),ice=make('ICE'),spider=make('SPIDER');
  fire.links=[ice];s.towers.push(fire,ice,spider);
  const a=enemy();s.enemies.push(a);
  h.attackEnemy(fire,a,10);
  assert.ok(a.burn>0,'FIRE should apply burning');
  assert.ok(a.slow<1,'linked ICE should still apply slowing');
  const b=enemy();s.enemies.push(b);
  h.attackEnemy(spider,b,10);
  assert.ok(b.poison>0&&b.slow<1,'SPIDER must inflict both poison and web slow');
});

test('Word Siege railgun, shotgun, mines and falling nukes use different attack paths',()=>{
  const {h,d}=headlessGame(),s=h.state;
  function tower(word,x=.35,y=.3){
    const t={id:s.uid++,word,x,y,def:d.words[word],stats:h.makeTowerStats(word,d.words[word]),
      cool:0,harvestClock:0,pulse:0,links:[],combos:[]};
    s.towers.push(t);return t;
  }
  function enemy(x,y,hp=1000){
    const e={id:s.uid++,type:'normal',x,y,hp,maxHp:hp,shield:0,armor:0,
      burn:0,burnDps:0,poison:0,poisonDps:0,slow:1,pushBack:0,
      pathIndex:0,pathT:0,dead:false};
    s.enemies.push(e);return e;
  }
  const rail=tower('RAILGUN'),e1=enemy(.42,.3),e2=enemy(.48,.3);
  h.towerUpdate(rail,.1);
  assert.ok(e1.hp<1000&&e2.hp<1000,'RAILGUN must penetrate aligned enemies');
  s.enemies.length=0;s.towers.length=0;s.shots.length=0;
  const gun=tower('SHOTGUN'),e3=enemy(.39,.30),e4=enemy(.40,.315);
  h.towerUpdate(gun,.1);
  assert.ok(e3.hp<1000&&e4.hp<1000,'SHOTGUN must hit multiple cone targets without projectiles');
  s.enemies.length=0;s.towers.length=0;
  const mine=tower('LANDMINE',.20,.28);s.inWave=true;
  h.towerUpdate(mine,.1);
  assert.ok(s.traps.length>0,'LANDMINE must deploy a physical trap on the path');
  const trap=s.traps[0],victim=enemy(trap.x,trap.y);
  h.updateTraps(.04);
  assert.ok(victim.hp<1000&&s.traps.length===0,'LANDMINE must detonate on contact');
  s.enemies.length=0;s.towers.length=0;
  const nuke=tower('NUKE',.28,.28),boss=enemy(.35,.28);
  h.towerUpdate(nuke,.1);
  const delayed=s.shots.find(shot=>shot.mode==='nuke');
  assert.ok(delayed&&delayed.delay>=2,'NUKE must visibly charge before impact');
  h.shotUpdate(delayed,2.5);
  assert.ok(boss.hp<1000,'NUKE must deal large area damage after countdown');
});

test('Word Siege wave pressure ramps gradually, rather than crushing the opening',()=>{
  const {h,d}=headlessGame();
  assert.ok(d.waveBalance.hpQuadratic<.08);
  assert.ok(d.waveBalance.openingPressure<=.30);
  h.selectStage(9);h.restart();
  const stage=h.currentStage();
  assert.ok(stage.multiplier<1.6);
  h.state.wave=1;
  h.spawnEnemy('normal');
  const opening=h.state.enemies.at(-1).hp;
  assert.ok(opening>52&&opening<70,'final stage opening should teach counters before full HP multiplier');
  h.state.wave=8;
  h.spawnEnemy('normal');
  assert.ok(h.state.enemies.at(-1).hp>opening*3,'final waves must still be harder than opening');
  assert.match(runtime,/FOCUS_TIPS/);
});

test('Word Siege economy prevents runaway banking and rewards spending',()=>{
  const {h,d}=headlessGame(),s=h.state;
  const make=(word,x=.22,y=.18)=>({
    id:s.uid++,word,x,y,def:d.words[word],stats:h.makeTowerStats(word,d.words[word]),
    cool:0,harvestClock:0,links:[],combos:[],pulse:0
  });
  s.wave=1;s.inWave=true;
  const miner=make('MINER');s.towers.push(miner);
  const before=s.ink;h.towerUpdate(miner,3.3);
  assert.ok(s.ink>before&&s.ink-before<=3,'early mining needs meaningful but restrained output');
  const bank=make('BANK');s.towers.push(bank);
  const after=s.ink;h.towerUpdate(bank,4);
  assert.equal(s.ink,after,'BANK should not generate INK every frame');
  assert.match(runtime,/Math\.min\(10,Math\.floor\(state\.ink\*\.025/);
  assert.ok(h.towerCost(d.words.RAILGUN)>h.towerCost(d.words.ARROW));
  assert.ok(h.towerCost(d.words.NUKE)>h.towerCost(d.words.FIREBALL));
});

test('Word Siege NUKE is a real legendary choice without stacking damage twice',()=>{
  const {h,d}=headlessGame();
  const stats=h.makeTowerStats('NUKE',d.words.NUKE);
  assert.ok(stats.damage>=350&&stats.damage<600);
  assert.ok(stats.rate>=.13&&stats.rate<=.15);
  assert.ok(stats.area>=.25);
  assert.match(runtime,/mode==='nuke'\?1\.8:1\.05/);
});

test('Word Siege tactical and visual feedback stay present in mobile UI',()=>{
  assert.match(runtime,/const FOCUS_TIPS=/);
  assert.match(runtime,/e\.poison>0\?'#98d65d'/);
  assert.match(runtime,/e\.freezeTime>0/);
  assert.match(html,/line-clamp:2/);
  assert.match(html,/\.wave-btn\{max-width:47%/);
});
