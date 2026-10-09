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
  assert.equal(data.combos.length,25);
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
    KidscadeStorage:{getJson(){return []},setJson(){return true},getInt(key){return key==='kidscade_word_siege_stage_v1'?20:0},setRaw(){return true}},
    addEventListener(){},devicePixelRatio:1
  };
  const hooks=`window.__headless={restart,startWave,update,beginPlacement,buildTower,makeTowerStats,towerCost,availableWords,validPlacement,rolePlacementValid,applyLinks,effectiveStats,showHint,swapOne,rollWholeRack,rackRerollCost,selectStage,currentStage,createWave,tileWord,typedWord,attackEnemy,towerUpdate,shotUpdate,statusEffects,updateTraps,updateFields,spawnEnemy,updateComposer,inspectAt,upgradeInspectedTower,upgradeCost,moveEnemy,useWordRush,rushCost,getInput:()=>freeWord, get state(){return state}};resize();`;
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
    // Bots must field one real attack tower before launching, just like players.
    assert.ok(buildMatching(h,d,'ARROW'),'starter must afford an ARROW after MINER');
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

test('Word Siege campaign contains twenty genuinely distinct maps and resource layouts',()=>{
  const stages=loadStages();
  assert.equal(stages.length,20);
  assert.equal(new Set(stages.map(s=>s.name)).size,20);
  assert.equal(new Set(stages.map(s=>JSON.stringify(s.path))).size,20);
  assert.ok(new Set(stages.map(s=>s.focus)).size>=17);
  for(const s of stages){
    assert.equal(s.waves,8);
    assert.ok(s.path.length>=9,s.name+' has a short route');
    assert.ok(s.resources.length>=3,s.name+' has too few resource nodes');
    assert.ok(s.path[0][0]<=.03&&s.path.at(-1)[0]>=.95);
    assert.ok(s.resources.every(r=>r.x>.03&&r.x<.96&&r.y>.05&&r.y<.95));
    for(const pair of s.path)assert.ok(pair.every(v=>v>=0&&v<=1),s.name+' path out of bounds');
  }
});

test('Word Siege all twenty stages permit word tower building and start unique waves',()=>{
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
  assert.ok(focuses.size>=17);
  assert.ok(patterns.size>=15,'wave patterns should differ by stage');
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
  assert.ok(delayed&&delayed.delay>=1.75,'NUKE must visibly charge before impact');
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

test('Word Siege upgrading a tower strengthens its role while consuming INK',()=>{
  const {h,d}=headlessGame(),state=h.state;
  const word='ARROW',def=d.words[word],stats=h.makeTowerStats(word,def);
  const tower={id:state.uid++,x:.39,y:.55,word,def,stats,level:1,
    cool:0,harvestClock:0,pulse:0,links:[],combos:[]};
  state.towers.push(tower);h.applyLinks();
  state.ink=90;
  const before=h.effectiveStats(tower);
  const price1=h.upgradeCost(tower);
  h.inspectAt({x:tower.x,y:tower.y});
  h.upgradeInspectedTower();
  assert.equal(tower.level,2);
  assert.equal(state.ink,90-price1);
  const upgraded=h.effectiveStats(tower);
  assert.ok(upgraded.damage>before.damage);
  assert.ok(upgraded.rate>before.rate);
  assert.ok(upgraded.range>before.range);
  const price2=h.upgradeCost(tower),ink=state.ink;
  h.upgradeInspectedTower();
  assert.equal(tower.level,3);
  assert.equal(state.ink,ink-price2);
  const capped=state.ink;
  h.upgradeInspectedTower();
  assert.equal(tower.level,3);
  assert.equal(state.ink,capped);
  assert.equal(h.upgradeCost(tower),Infinity);
});

test('Word Siege upgrade control is accessible on touch and maintains visual state',()=>{
  assert.match(html,/\.tower-upgrade\{/);
  assert.match(runtime,/towerUpgradeBtn/);
  assert.match(visualsSource,/t\.level\|\|1/);
});

test('Word Siege playful signatures cover 19 familiar words and are valid for every dictionary entry',()=>{
  const {d,h}=headlessGame();
  const words=['MUSIC','RUBBER','BOUNCE','BUBBLE','MIRROR','GHOST','MAGIC','WIZARD',
    'RAINBOW','BOOMERANG','MUSHROOM','SLIME','VACUUM','MAGNET','DREAM','STAR','SNOW','RAIN','SUN'];
  const modes=new Set();
  for(const word of words){
    const def=d.words[word],behavior=d.behaviors[word];
    assert.ok(def,'unrecognized English word: '+word);
    assert.ok(behavior&&behavior.description.length>6,'missing amusing description: '+word);
    assert.equal(h.makeTowerStats(word,def).mode,behavior.mode);
    assert.ok(h.makeTowerStats(word,def).rate>0);
    modes.add(behavior.mode);
  }
  assert.equal(modes.size,18,'most towers should actually use a different mechanism');
  assert.match(visualsSource,/playfulSymbol/);
  assert.match(visualsSource,/function playfulTowerBody\(/);
  assert.match(visualsSource,/if\(playfulTowerBody\(c,t,r,animate\)\)/);
  assert.match(visualsSource,/s\.mode==='snowball'/);
});

test('Word Siege playful tower mechanics can fire at moving wave targets without exceptions',()=>{
  const {h,d}=headlessGame(),s=h.state;
  const names=['MUSIC','RUBBER','BOUNCE','BUBBLE','MIRROR','GHOST','MAGIC','WIZARD',
    'RAINBOW','BOOMERANG','MUSHROOM','SLIME','VACUUM','MAGNET','DREAM','STAR','SNOW','RAIN','SUN'];
  function enemy(x,y){
    return {id:s.uid++,x,y,type:'normal',hp:2500,maxHp:2500,
      shield:40,armor:.12,regen:0,burn:0,burnDps:0,
      poison:0,poisonDps:0,slow:1,pushBack:0,pathIndex:1,pathT:.4,dead:false,
      bubbleTime:0,danceTime:0,sleepTime:0,stunTime:0,freezeTime:0};
  }
  for(const word of names){
    s.towers=[];s.enemies=[];s.shots=[];s.fields=[];s.effects=[];
    const t={id:s.uid++,word,def:d.words[word],stats:h.makeTowerStats(word,d.words[word]),
      x:.3,y:.3,cool:0,harvestClock:0,pulse:0,links:[],combos:[]};
    s.towers.push(t);
    if(word==='MIRROR'){
      const ally={...t,id:s.uid++,word:'FIRE',def:d.words.FIRE,
        stats:h.makeTowerStats('FIRE',d.words.FIRE),x:.32,y:.33};
      s.towers.push(ally);
    }
    const targets=[enemy(.39,.30),enemy(.405,.31),enemy(.41,.305),enemy(.445,.30)];
    s.enemies.push(...targets);
    const before=targets.reduce((total,e)=>total+e.hp+e.shield,0);
    assert.doesNotThrow(()=>h.towerUpdate(t,.04),word+' should execute');
    for(let i=0;i<80;i++){
      for(const shot of s.shots)h.shotUpdate(shot,.05);
      s.shots=s.shots.filter(shot=>!shot.dead);
      h.updateFields(.05);
      for(const e of targets)if(!e.dead)h.statusEffects(e,.05);
    }
    const after=targets.reduce((total,e)=>total+e.hp+e.shield,0);
    assert.ok(after<before||s.fields.length>0,word+' must have an actual combat result');
  }
});

test('Word Siege BUBBLE traps before popping, MUSIC dances, and GHOST knocks enemies back',()=>{
  const {h,d}=headlessGame(),s=h.state;
  function place(word){
    const t={id:s.uid++,word,x:.3,y:.3,def:d.words[word],
      stats:h.makeTowerStats(word,d.words[word]),cool:0,pulse:0,links:[],combos:[]};
    s.towers.push(t);return t;
  }
  function target(){
    const e={id:s.uid++,x:.38,y:.30,type:'normal',hp:2000,maxHp:2000,
      shield:0,armor:0,burn:0,burnDps:0,poison:0,poisonDps:0,slow:1,
      pushBack:0,pathIndex:1,pathT:.5,dead:false};
    s.enemies.push(e);return e;
  }
  const bubble=place('BUBBLE'),b=target();h.towerUpdate(bubble,.04);
  assert.ok(b.bubbleTime>=1,'BUBBLE must actually encase the enemy');
  const hp=b.hp;
  for(let i=0;i<40;i++)h.statusEffects(b,.05);
  assert.ok(b.bubbleTime<=0,'bubble timer should expire');
  assert.ok(b.hp<hp,'bubble should pop and deal delayed damage');
  s.towers=[];s.enemies=[];
  const music=place('MUSIC'),m=target();h.towerUpdate(music,.04);
  assert.ok(m.danceTime>0&&m.stunTime>0,'MUSIC should cause visible dancing and a brief stop');
  s.towers=[];s.enemies=[];
  const ghost=place('GHOST'),g=target();h.towerUpdate(ghost,.04);
  assert.ok(g.pushBack>.02,'GHOST should make enemies run backwards');
});

test('Word Siege mirror copies nearby elements, rain creates fields and snowballs grow',()=>{
  const {h,d}=headlessGame(),s=h.state;
  function make(word,x=.30,y=.30){
    const t={id:s.uid++,word,x,y,def:d.words[word],
      stats:h.makeTowerStats(word,d.words[word]),cool:0,pulse:0,links:[],combos:[]};
    s.towers.push(t);return t;
  }
  function enemy(){
    const e={id:s.uid++,type:'normal',x:.40,y:.30,hp:2000,maxHp:2000,
      shield:0,armor:0,burn:0,burnDps:0,poison:0,poisonDps:0,
      slow:1,pushBack:0,pathIndex:0,pathT:0,dead:false};
    s.enemies.push(e);return e;
  }
  make('FIRE',.32,.34);
  const mirror=make('MIRROR'),victim=enemy();
  h.towerUpdate(mirror,.04);
  assert.ok(victim.hp<2000&&victim.burn>0,'MIRROR should borrow nearby FIRE element');
  s.towers=[];s.enemies=[];
  const rain=make('RAIN');enemy();
  h.towerUpdate(rain,.04);
  assert.ok(s.fields.some(f=>f.kind==='slow'),'RAIN should leave a slowing rain cloud');
  s.towers=[];s.enemies=[];s.fields=[];s.shots=[];
  const snow=make('SNOW');enemy();
  h.towerUpdate(snow,.04);
  const shot=s.shots.find(shot=>shot.mode==='snowball');
  assert.ok(shot,'SNOW should launch a projectile');
  const initial=shot.area;
  h.shotUpdate(shot,.12);
  assert.ok(shot.area>=initial,'snowball area should grow during flight');
  assert.match(runtime,/s\.travel=\(s\.travel\|\|0\)\+mv/);
});

test('Word Siege funny pair bonuses change actual enemy states, not only text labels',()=>{
  const {h,d}=headlessGame(),s=h.state;
  const tower=(word,x,y)=>({
    id:s.uid++,word,def:d.words[word],stats:h.makeTowerStats(word,d.words[word]),
    x,y,cool:0,harvestClock:0,pulse:0,links:[],combos:[]
  });
  const enemy=(x=.38,y=.3)=>({
    id:s.uid++,x,y,type:'normal',hp:2000,maxHp:2000,shield:0,armor:0,
    burn:0,burnDps:0,poison:0,poisonDps:0,slow:1,pushBack:0,pathIndex:1,pathT:.2,dead:false
  });
  const music=tower('MUSIC',.3,.3),rainbow=tower('RAINBOW',.37,.34);
  s.towers.push(music,rainbow);
  h.applyLinks();
  assert.ok(music.combos.some(c=>c.name==='무지개 디스코'));
  let victim=enemy();s.enemies.push(victim);
  h.towerUpdate(music,.04);
  assert.ok(victim.danceTime>0&&victim.burn>0,'disco should dance AND burn with rainbow bonus');
  s.towers=[];s.enemies=[];s.effects=[];
  const bubble=tower('BUBBLE',.3,.3),bounce=tower('BOUNCE',.36,.31);
  s.towers.push(bubble,bounce);h.applyLinks();
  victim=enemy();s.enemies.push(victim);
  h.towerUpdate(bubble,.04);
  assert.ok(victim.bubbleTime>0&&victim.bubbleCombo,'combo should mark a bouncy bubble');
  for(let i=0;i<50;i++)h.statusEffects(victim,.05);
  assert.ok(victim.pushBack>.02,'trampoline POP should push enemies back');
  s.towers=[];s.enemies=[];s.effects=[];
  const ghost=tower('GHOST',.3,.3),dream=tower('DREAM',.36,.31);
  s.towers.push(ghost,dream);h.applyLinks();
  victim=enemy();s.enemies.push(victim);
  h.towerUpdate(ghost,.04);
  assert.ok(victim.stunTime>=.8&&victim.sleepTime>0,'nightmare should really scare enemies to sleep');
});

test('Word Siege new funny combinations are all discoverable by valid existing words',()=>{
  const d=loadData();
  const discovered=new Set(['거품 트램펄린','무지개 디스코','매직 미러','유령의 악몽','별똥별 핀볼']);
  assert.equal(discovered.size,5);
  for(const c of d.combos.filter(x=>discovered.has(x.name))){
    assert.ok(d.words[c.a]&&d.words[c.b],c.name+' requires two real dictionary words');
    assert.ok(c.bonus.damage||c.bonus.rate||c.bonus.range,c.name+' must reward player strategy');
    discovered.delete(c.name);
  }
  assert.equal(discovered.size,0,'every funny combo must actually exist');
});

test('Word Siege assigns non-generic, explainable powers to all imported rapid words',()=>{
  const d=loadData(),counts=new Map();
  const rapid=Object.values(d.words).filter(w=>w.role==='rapid');
  assert.ok(rapid.length>19000);
  for(const word of rapid){
    const behavior=d.behaviorFor(word.word);
    assert.ok(behavior&&behavior.mode,'missing tower action: '+word.word);
    assert.ok(behavior.description.length>7,'missing ability explanation: '+word.word);
    assert.notEqual(d.displayRole(word.word,word),'빠른 공격','generic tower role: '+word.word);
    counts.set(behavior.mode,(counts.get(behavior.mode)||0)+1);
  }
  assert.ok(counts.size>=10,'lexicon should contain multiple distinguishable strategies');
  assert.equal(d.behaviorFor('BOOK').mode,'pinball');
  assert.equal(d.behaviorFor('RUNNING').mode,'spring');
  assert.equal(d.behaviorFor('APPLE').mode,'splat');
  assert.equal(d.behaviorFor('CONVERSATION').mode,'rainbow');
  assert.equal(d.behaviorFor('FIREWORK').mode,'firework');
  assert.equal(d.behaviorFor('MUSIC').mode,'disco','existing signature must win');
});

test('Word Siege attacks actually differ across semantic and spelling-generated styles',()=>{
  const {h,d}=headlessGame(),s=h.state;
  const used=['BOOK','RUNNING','APPLE','CONVERSATION','FIREWORK','ECHO','SNOWFLAKE',
    'DART','CANNON','TRIDENT','SCHOOL','PIZZA','HELLO','GREAT','NETWORK'];
  const projectileRoles=new Set(['rapid','pierce','burst','explosive','beam','burn','slow','poison','push','gravity','special']);
  for(const word of used){
    const def=d.words[word];assert.ok(def,'missing example word '+word);
    const mode=d.behaviorFor(word)?.mode||'';
    const s0=h.makeTowerStats(word,def);
    assert.equal(s0.mode,mode,'wrong mode '+word);
    if(!projectileRoles.has(def.role))continue;
    s.towers.length=0;s.enemies.length=0;s.shots.length=0;s.effects.length=0;s.fields.length=0;
    const tower={id:s.uid++,word,x:.3,y:.3,def,stats:s0,cool:0,harvestClock:0,pulse:0,links:[],combos:[]};
    s.towers.push(tower);
    const targets=Array.from({length:5},(_,i)=>({
      id:s.uid++,x:.37+i*.012,y:.3+(i%2)*.008,type:'normal',
      hp:3000,maxHp:3000,shield:0,armor:0,pathIndex:1,pathT:i*.05,
      burn:0,burnDps:0,poison:0,poisonDps:0,slow:1,pushBack:0,dead:false
    }));
    s.enemies.push(...targets);
    const before=targets.reduce((a,e)=>a+e.hp,0);
    assert.doesNotThrow(()=>h.towerUpdate(tower,.04),word+' attack');
    for(let k=0;k<40;k++){
      for(const shot of s.shots)h.shotUpdate(shot,.05);
      s.shots=s.shots.filter(x=>!x.dead);
      h.updateFields(.05);
      for(const e of targets)if(!e.dead)h.statusEffects(e,.05);
    }
    assert.ok(targets.reduce((a,e)=>a+e.hp,0)<before,word+' must truly affect enemies');
  }
});

test('Word Siege new SPLAT, FIREWORK, SNAP, ECHO and HAILSTORM are tangible abilities',()=>{
  const {h,d}=headlessGame(),s=h.state;
  for(const [word,mode] of [['APPLE','splat'],['FIREWORK','firework'],
    ['THORN','snap'],['ECHO','echo'],['HAIL','hailstorm']]){
    const def=d.words[word],stats=h.makeTowerStats(word,def);
    assert.equal(stats.mode,mode,word);
    s.towers=[];s.enemies=[];s.shots=[];s.fields=[];s.effects=[];
    const tower={id:s.uid++,word,x:.3,y:.3,def,stats,cool:0,harvestClock:0,pulse:0,links:[],combos:[]};
    s.towers.push(tower);
    const targets=[0,1,2,3].map(i=>({id:s.uid++,x:.38+i*.014,y:.3,
      hp:1500,maxHp:1500,shield:0,armor:0,slow:1,pushBack:0,dead:false,
      burn:0,burnDps:0,poison:0,poisonDps:0,pathIndex:1,pathT:0,type:'normal'}));
    s.enemies.push(...targets);
    h.towerUpdate(tower,.04);
    assert.ok(s.effects.length>0,word+' should show a distinct effect');
    if(mode==='splat')assert.ok(targets.some(e=>e.slow<1));
    if(mode==='firework')assert.ok(targets.filter(e=>e.hp<1500).length>1);
    if(mode==='snap')assert.ok(targets.some(e=>e.stunTime>0));
    if(mode==='echo'){
      assert.ok(s.fields.some(f=>f.echo),'ECHO needs delayed field');
      const hp=targets[0].hp;
      for(let i=0;i<10;i++)h.updateFields(.05);
      assert.ok(targets[0].hp<hp,'returning echo must deal extra damage');
    }
    if(mode==='hailstorm')assert.ok(targets.some(e=>e.freezeTime>0));
  }
  assert.match(visualsSource,/mode==='firework'/);
  assert.match(visualsSource,/mode==='hailstorm'/);
});

test('Word Siege visible word and dictionary labels match the real generated power',()=>{
  const {h,d}=headlessGame();
  h.state.ink=100;
  const input=h.getInput();
  input.value='BOOK';
  h.updateComposer();
  assert.notEqual(d.displayRole('BOOK',d.words.BOOK),'빠른 공격');
  assert.match(runtime,/D\.displayRole\(w,def\)/);
  assert.match(runtime,/D\.behaviorFor\(w\)/);
  assert.match(runtime,/D\.displayRole\(w,d\)/);
});

test('Word Siege boss resolves repeated crowd control into a counterattack and vulnerability',()=>{
  const {h,d}=headlessGame(),s=h.state;
  s.wave=8;h.spawnEnemy('boss');
  const boss=s.enemies.at(-1);
  assert.ok(boss.boss);
  let brokeFree=false;
  let furthest=0;
  for(let i=0;i<250;i++){
    // Simulate a stall-heavy lineup attempting permanent knockback and freeze.
    boss.slow=.44;boss.freezeTime=.3;boss.stunTime=.25;boss.pushBack=.028;
    h.moveEnemy(boss,.04);
    brokeFree ||= boss.unstoppableTime>0;
    furthest=Math.max(furthest,boss.pathIndex+boss.pathT);
  }
  assert.ok(brokeFree,'boss must break out of repeated snares');
  assert.ok(furthest>.1,'boss must advance instead of endlessly walking backwards');
  assert.ok(boss.pathIndex+boss.pathT>=0);
  const arrow={id:s.uid++,word:'ARROW',def:d.words.ARROW,stats:h.makeTowerStats('ARROW',d.words.ARROW),
    x:.3,y:.3,level:1,links:[],combos:[]};
  s.towers.push(arrow);
  boss.shield=0;boss.armor=0;boss.exposedTime=2;boss.hp=5000;
  h.attackEnemy(arrow,boss,100);
  assert.ok(boss.hp<=4862,'boss break window should reward damage rather than permanent immobilization');
});

test('Word Siege foundation towers scale through wave mastery and invested levels',()=>{
  const {h,d}=headlessGame(),s=h.state;
  const make=word=>({id:s.uid++,word,def:d.words[word],stats:h.makeTowerStats(word,d.words[word]),
    x:.3,y:.4,level:1,cool:0,links:[],combos:[],harvestClock:0});
  const arrow=make('ARROW'),book=make('BOOK'),rail=make('RAILGUN');
  s.towers.push(arrow,book,rail);
  s.wave=1;const early=h.effectiveStats(arrow);
  const bookEarly=h.effectiveStats(book);
  const railEarly=h.effectiveStats(rail);
  s.wave=7;
  const matured=h.effectiveStats(arrow),bookMatured=h.effectiveStats(book);
  const railMatured=h.effectiveStats(rail);
  assert.ok(matured.damage>early.damage*1.30);
  assert.ok(matured.rate>early.rate*1.12);
  assert.ok(bookMatured.damage>bookEarly.damage*1.30);
  assert.ok(Math.abs(railMatured.damage-railEarly.damage)<.001,
    'legendary piercing tower should not inherit free starter growth');
  arrow.level=3;s.towerRevision++;
  const upgraded=h.effectiveStats(arrow);
  assert.ok(upgraded.damage>matured.damage*1.70);
  assert.ok(upgraded.rate>matured.rate*1.30);
});

test('Word Siege WORD RUSH costs INK, powers basic towers and respects cooldown/limits',()=>{
  const {h,d}=headlessGame(),s=h.state;
  const make=word=>({id:s.uid++,word,def:d.words[word],stats:h.makeTowerStats(word,d.words[word]),
    x:.4,y:.4,level:1,links:[],combos:[],cool:0,harvestClock:0});
  const arrow=make('ARROW'),rail=make('RAILGUN');
  s.towers.push(arrow,rail);s.wave=5;s.inWave=true;s.ink=180;
  s.spawnQueue=[{delay:1000,type:'normal'}];s.totalSpawns=1;
  const price=h.rushCost(),baseline=h.effectiveStats(arrow);
  h.useWordRush();
  assert.equal(s.ink,180-price);
  assert.equal(s.rushUses,1);
  assert.ok(s.rushTime>8);
  const boosted=h.effectiveStats(arrow);
  assert.ok(boosted.damage>baseline.damage*1.38);
  assert.ok(boosted.rate>baseline.rate*1.29);
  const railStats=h.effectiveStats(rail);
  assert.ok(railStats.damage>rail.stats.damage);
  h.useWordRush();assert.equal(s.rushUses,1,'cannot stack a second rush while active');
  for(let i=0;i<245;i++)h.update(.04);
  assert.equal(s.rushTime,0);
  assert.ok(h.effectiveStats(arrow).damage<boosted.damage);
  h.useWordRush();assert.equal(s.rushUses,1,'must wait through cooldown');
  for(let i=0;i<390;i++)h.update(.04);
  assert.equal(s.rushCooldown,0);
  h.useWordRush();assert.equal(s.rushUses,2);
  for(let i=0;i<800;i++)h.update(.04);
  h.useWordRush();
  assert.equal(s.rushUses,2,'at most two WORD RUSH actions each wave');
  assert.match(html,/id="rushBtn"/);
  assert.match(html,/\.rush-btn\.active/);
});

test('Word Siege exposes boss resolve and timing choices to players',()=>{
  assert.match(runtime,/RESOLVE /);
  assert.match(runtime,/BREAK! \+38%/);
  assert.match(runtime,/function useWordRush/);
  assert.match(runtime,/FOUNDATION_WORDS/);
});

test('Word Siege stages 11–20 preserve eight waves and add deliberate attack patterns',()=>{
  const {h}=headlessGame(),maps=loadStages();
  assert.equal(maps.length,20);
  const signatures=new Set(),wave8BossCounts=[];
  for(let i=10;i<20;i++){
    assert.ok(h.selectStage(i),'new stage '+(i+1)+' must be selectable when unlocked');
    h.restart();
    const stage=maps[i];
    assert.equal(stage.number,i+1);
    assert.equal(stage.waves,8);
    assert.equal(stage.resources.length,4);
    assert.ok(stage.path.length>=12);
    assert.ok(stage.multiplier>maps[i-1].multiplier-.05);
    assert.ok(stage.description.includes('세요')||stage.description.includes('합니다'));
    const wave=h.createWave(4);
    assert.ok(wave.length>=25,'new mid-wave must have attackers');
    assert.ok(wave.every((x,j)=>j===0||x.delay>=wave[j-1].delay),'spawn queue must remain ordered');
    signatures.add(wave.map(x=>x.type).join(','));
    const wave8=h.createWave(8);
    wave8BossCounts.push(wave8.filter(x=>x.type==='boss').length);
    assert.equal(wave8.filter(x=>x.type==='boss').length,i===19?2:1);
  }
  assert.ok(signatures.size>=8,'new stage encounters should have distinct compositions');
  assert.deepEqual(wave8BossCounts,[1,1,1,1,1,1,1,1,1,2]);
  assert.ok(maps[17].focus==='echo');
  const burst=h.selectStage(17);
  assert.ok(burst);
  h.restart();
  const arrivals=h.createWave(4).slice(0,11).map(x=>x.delay);
  assert.ok(arrivals[5]-arrivals[4]>.1,'echo waves should pause between enemy packs');
});

test('Word Siege campaign selector shows two parts, can access stage 20 and retains older save keys',()=>{
  const {h}=headlessGame();
  assert.ok(h.selectStage(19));
  h.restart();
  assert.equal(h.currentStage().name,'WORD APOCALYPSE');
  assert.match(runtime,/PART II · 단어 전술 원정/);
  assert.match(html,/\.stage-chapter/);
  assert.match(html,/1 \/ 20 해금/);
  assert.match(runtime,/STORAGE_STAGE='kidscade_word_siege_stage_v1'/);
});

test('Word Siege full rack reroll costs INK and renews all twelve tiles',()=>{
  const {h,d}=headlessGame(),state=h.state;
  assert.equal(state.ink,20);
  assert.equal(h.rackRerollCost(),6);
  const original=state.rack.join('');
  state.selected=[0,1,2];
  h.getInput().value='FIRE';
  assert.equal(h.rollWholeRack(),true);
  assert.equal(state.ink,14);
  assert.equal(state.rack.length,d.maxRack);
  assert.notEqual(state.rack.join(''),original);
  assert.equal(state.selected.length,0);
  assert.equal(h.getInput().value,'FIRE','free typing should not be destroyed by rack reroll');
  assert.equal(state.rackRerolls,1);
  assert.equal(h.rackRerollCost(),8);
  assert.ok(['ARROW','FIRE','BOOK','ICE','COW','BALL','APPLE','BOMB','WALL','MUSIC']
    .some(word=>d.words[word]&&canSpell(state.rack,word)&&h.towerCost(d.words[word],word,false)<=state.ink),
    'when affordable, the rack should contain at least one usable English tower');
});

test('Word Siege full rack reroll prevents free rerolls and resets cost each wave',()=>{
  const {h}=headlessGame(),state=h.state;
  state.ink=100;
  const costs=[];
  for(let i=0;i<5;i++){
    const cost=h.rackRerollCost(),before=state.ink,old=state.rack.join('');
    assert.equal(h.rollWholeRack(),true);
    costs.push(cost);
    assert.equal(state.ink,before-cost);
    assert.notEqual(state.rack.join(''),old);
    assert.equal(state.rack.length,12);
  }
  assert.deepEqual(costs,[6,8,10,12,12]);
  const previous=state.rack.join('');
  state.ink=4;
  assert.equal(h.rollWholeRack(),false,'cannot reroll without enough INK');
  assert.equal(state.rack.join(''),previous);
  assert.equal(state.ink,4);
  state.ink=60;
  state.placing={word:'ARROW'};
  assert.equal(h.rollWholeRack(),false,'cannot reroll during placement');
  assert.equal(state.ink,60);
  state.placing=null;
  state.towers.push({stats:{damage:4}});
  h.startWave();
  assert.equal(state.wave,1);
  assert.equal(state.rackRerolls,0);
  assert.equal(h.rackRerollCost(),6);
  state.ended=true;
  assert.equal(h.rollWholeRack(),false,'result state should not spend INK');
});

test('Word Siege rack refresh is exposed on responsive controls, with clear price and animation',()=>{
  assert.match(html,/id="rerollBtn"/);
  assert.match(html,/전체 새로고침 -6/);
  assert.match(html,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(html,/@keyframes rack-reroll-reveal/);
  assert.match(runtime,/rerollBtn\.addEventListener\('click',rollWholeRack\)/);
  assert.match(runtime,/function rackRerollCost\(/);
});
