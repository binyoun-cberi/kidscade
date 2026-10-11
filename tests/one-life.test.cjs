'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const game=path.join(root,'games','high_one_life');
const {Life,COUNTRIES,CHOICES,EVENTS,stages}=require(path.join(game,'engine.js'));
const read=name=>fs.readFileSync(path.join(game,name),'utf8');

test('One Life is a registered, playable upper-grade social simulation',()=>{
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','games.json'),'utf8'));
  const item=catalog.games.find(entry=>entry.id==='high_one_life');
  assert.ok(item);
  assert.equal(item.age,'high');
  assert.equal(item.subject,'social');
  assert.equal(item.genre,'simulation');
  assert.equal(item.href,'games/high_one_life/index.html');
  assert.ok(fs.existsSync(path.join(root,item.href.split('?')[0])));
});
test('screen includes drawing, choice, time and archive entry points for mobile',()=>{
  const html=read('index.html'),css=read('style.css'),controller=read('game.js');
  for(const id of ['intro','birth','play','end','drawBtn','lifeStartBtn','resumeBtn','decision','choiceOptions','timeline','endHighlights','pauseBtn','rulesBtn']) {
    assert.match(html,new RegExp('id="'+id+'"'),id);
  }
  assert.doesNotMatch(html,/data-speed=|data-duration=|speedText/);
  assert.match(html,/id="pauseBtn"/);
  assert.match(html,/viewport-fit=cover/);
  assert.match(html,/kidscade-game-sdk.js/);
  assert.match(html,/data-game-id="high_one_life"/);
  assert.match(html,/engine.js\?v=3/);
  assert.match(css,/@media\(max-width:780px\)/);
  assert.match(css,/@media\(max-width:440px\)/);
  assert.match(css,/prefers-reduced-motion/);
  assert.match(controller,/visibilitychange/);
  assert.match(controller,/pagehide/);
  assert.match(controller,/document\.createElement/);
  assert.doesNotThrow(()=>new Function(controller));
});
test('age landmarks offer three meaningful choices and vary by stage',()=>{
  assert.deepEqual(CHOICES.map(c=>c.age),[10,16,20,29,42,58,73]);
  for(const c of CHOICES) {
    assert.equal(c.options.length,3);
    assert.ok(c.options.every(o=>o.label&&o.text&&Object.keys(o.effects).length>0));
  }
  assert.equal(stages(2),'유년기');
  assert.equal(stages(20),'청년기');
  assert.equal(stages(73),'노년기');
  assert.ok(EVENTS.length>=20);
  assert.ok(COUNTRIES.length>=25);
});
test('choice pauses the simulation; snapshot retains decision and future RNG',()=>{
  const person=new Life(984157);
  for(let steps=0; person.alive && person.age<10 && steps<20; steps++){
    if(person.getReflection())person.reflect();else person.tick();
  }
  assert.ok(person.alive);
  assert.equal(person.pending,10);
  const pausedAge=person.age;
  assert.equal(person.tick(),false);
  assert.equal(person.age,pausedAge);
  assert.equal(person.choose(-1),false);
  const restored=Life.restore(JSON.parse(JSON.stringify(person.snapshot())));
  assert.equal(restored.pending,10);
  assert.deepEqual(restored.snapshot(),person.snapshot());
  assert.equal(restored.choose(1),true);
  assert.equal(person.choose(1),true);
  for(let i=0;i<10;i++) {
    assert.equal(restored.tick(),person.tick());
    if(restored.pending) {
      if(restored.getReflection()){restored.reflect();person.reflect();}
      else {restored.choose(0);person.choose(0);}
    }
  }
  assert.deepEqual(restored.snapshot(),person.snapshot());
});
test('300 full simulated lives terminate with bounded stats, honest summaries and diverse locations',()=>{
  const seen=new Set();
  let deaths=0,choices=0;
  for(let i=1;i<=300;i++) {
    const person=new Life(Math.imul(i,2654435761)>>>0);
    seen.add(person.country[0]);
    let steps=0;
    while(person.alive && steps<110) {
      if(person.getReflection()){assert.ok(person.reflect());continue;}
      if(person.pending){ assert.ok(person.choose(i%3)); choices++; continue; }
      person.tick(); steps++;
      for(const value of Object.values(person.stats)){
        assert.ok(Number.isInteger(value)&&value>=0&&value<=100, 'invalid stat '+value);
      }
      assert.equal(person.year,2026+person.age);
    }
    assert.ok(!person.alive,'life did not end for seed '+i);
    assert.ok(person.age<=108);
    assert.ok(person.log.at(-1).kind==='death');
    assert.ok(person.summary().story.includes('정해진 정답은 없다'));
    assert.equal(person.tick(),false);
    deaths++;
  }
  assert.equal(deaths,300);
  assert.ok(choices>600,'not enough narrative decisions');
  assert.ok(seen.size>=10,'birth lottery insufficiently varied');
});
test('save validation rejects malformed life data',()=>{
  assert.equal(Life.restore(null),null);
  assert.equal(Life.restore({version:1,age:-1}),null);
  assert.equal(Life.restore({version:1,age:999}),null);
  assert.equal(Life.restore({version:1,age:5,country:'없는 나라',stats:{},seen:[],log:[]}),null);
});

test('five reflection pauses support an optional note and survive resumption',()=>{
  const person=new Life(7723);
  const expected=[5,15,30,50,70],visited=[];
  for(let steps=0; person.alive && person.age<74 && steps<120; steps++){
    if(person.getReflection()){
      const age=person.getReflection();visited.push(age);
      const saved=Life.restore(JSON.parse(JSON.stringify(person.snapshot())));
      assert.equal(saved.getReflection(),age);
      assert.equal(saved.reflect('한 줄을 남깁니다'),true);
      assert.equal(saved.getReflection(),null);
      assert.equal(person.reflect('한 줄을 남깁니다'),true);
      continue;
    }
    if(person.pending){assert.equal(person.choose(0),true);continue;}
    person.tick();
  }
  assert.ok(visited.length>0);
  assert.deepEqual(visited,expected.filter(age=>age<=person.age));
});
test('life focus is persisted and changes yearly trajectories',()=>{
  const a=new Life(88125),b=new Life(88125);
  a.setFocus('learning');b.setFocus('health');
  for(let y=0;y<9;y++){
    if(a.pending){a.getReflection()?a.reflect():a.choose(0);b.getReflection()?b.reflect():b.choose(0)}
    a.tick();b.tick();
  }
  assert.ok(a.stats.knowledge>b.stats.knowledge);
  assert.ok(b.stats.health>=a.stats.health);
  assert.equal(Life.restore(a.snapshot()).focus,'learning');
});
test('life screen exposes fast autoplay, annual focus, four peers, timeline and age map',()=>{
  const html=read('index.html'),js=read('game.js');
  assert.doesNotMatch(html,/data-duration=|data-speed=/);
  for(const id of ['peers','ageMap']) assert.ok(html.includes('id="'+id+'"'));
  for(const focus of ['balance','learning','people','health','work'])assert.ok(html.includes('data-focus="'+focus+'"'));
  for(const feature of ['paintPeers','paintAgeMap','getReflection','reflect(','YEAR_MS','visibilitychange'])
    assert.ok(js.includes(feature),feature);
});

test('single fast autoplay uses fixed year duration and retains pause and save',()=>{
  const script=read('game.js');
  assert.match(script,/const YEAR_MS = 260/);
  assert.match(script,/const yearMs=YEAR_MS;/);
  assert.doesNotMatch(script,/updateSpeed|MINUTES_PER_LIFE|durationMinutes|data-speed/);
  assert.match(script,/function togglePause/);
  assert.match(script,/function save/);
});
