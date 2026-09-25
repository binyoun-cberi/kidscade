const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');

test('Rule Lab files are present and scripts parse',()=>{
  for(const rel of [
    'games/high_rule_lab/index.html',
    'games/high_rule_lab/style.css',
    'games/high_rule_lab/levels.js',
    'games/high_rule_lab/game.js'
  ]) assert.ok(fs.existsSync(path.join(ROOT,rel)),rel);
  new vm.Script(read('games/high_rule_lab/levels.js'));
  new vm.Script(read('games/high_rule_lab/game.js'));
});

test('Rule Lab uses the Kidscade game SDK and safe game folder entrypoint',()=>{
  const html=read('games/high_rule_lab/index.html');
  assert.match(html,/kidscade-game-sdk\.js/);
  assert.match(html,/data-game-id="high_rule_lab"/);
  assert.match(html,/levels\.js/);
  assert.match(html,/game\.js/);
});

test('Rule Lab is registered as a featured thinking puzzle',()=>{
  const catalog=JSON.parse(read('data/games.json'));
  const game=catalog.games.find(g=>g.id==='high_rule_lab');
  assert.ok(game);
  assert.equal(game.href,'games/high_rule_lab/index.html?v=4');
  assert.equal(game.title,'내 말 좀 들어');
  assert.equal(game.subject,'thinking');
  assert.equal(game.genre,'puzzle');
  assert.equal(game.qualityStatus,'featured');
  assert.deepEqual(game.input,['touch','keyboard']);
});

test('Rule Lab contains 60 authored stages and the full v2 rule vocabulary',()=>{
  const source=read('games/high_rule_lab/levels.js');
  const sandbox={};sandbox.window=sandbox;
  vm.runInNewContext(source,sandbox);
  assert.equal(sandbox.RuleLabData.levels.length,60);
  for(const token of ['YOU','STOP','PUSH','WIN','DEFEAT','SINK','HOT','MELT','OPEN','SHUT','MOVE','WEAK']){
    assert.ok(Object.hasOwn(sandbox.RuleLabData.P,token),token);
  }
});

test('Rule Lab shared sprite paths point to existing Kidscade assets',()=>{
  for(const rel of [
    'assets/game/characters/people/kenney-platformer-characters/player/poses/player-stand.png',
    'assets/game/2d/racing/kenney-racing-pack/objects/rock3.png',
    'assets/game/2d/platformer-art/base/tiles/brick-wall.png',
    'assets/game/2d/platformer-art/base/tiles/liquid-water-top-mid.png'
  ]) assert.ok(fs.existsSync(path.join(ROOT,rel)),rel);
});


test('Rule Lab v2 has the planned chapter counts and no initial cell overlaps',()=>{
  const sandbox={};sandbox.window=sandbox;
  vm.runInNewContext(read('games/high_rule_lab/levels.js'),sandbox);
  const levels=sandbox.RuleLabData.levels;
  const counts={};
  levels.forEach((lv,index)=>{
    counts[lv.chapter]=(counts[lv.chapter]||0)+1;
    const cells=new Map();
    for(const e of [...lv.objects,...lv.words]){
      const key=e.x+','+e.y;
      const list=cells.get(key)||[];
      list.push(e.kind==='word'?e.token:e.type);
      cells.set(key,list);
      assert.ok(e.x>=0&&e.y>=0&&e.x<lv.w&&e.y<lv.h,'out of bounds stage '+(index+1)+' '+key);
    }
    for(const [key,list] of cells)assert.equal(list.length,1,'overlap stage '+(index+1)+' '+key+' '+list.join('/'));
  });
  assert.deepEqual(counts,{
    '규칙의 문':6,
    '법칙을 깨라':10,
    '나는 누구?':10,
    '세상을 바꿔라':10,
    '두 법칙':10,
    '규칙 연구소':9,
    '금지된 실험':5
  });
});

test('Rule Lab v2 engine implements MOVE and WEAK behavior hooks',()=>{
  const runtime=read('games/high_rule_lab/game.js');
  assert.match(runtime,/hasProp\(e\.type,'MOVE'/);
  assert.match(runtime,/hasProp\(e\.type,'WEAK'/);
  assert.match(runtime,/progress_v2/);
  assert.match(runtime,/chapter-row/);
});


test('내 말 좀 들어 loads the SDK after the body content so startup cannot mount into a missing body',()=>{
  const html=read('games/high_rule_lab/index.html');
  const bodyIndex=html.indexOf('<body>');
  const sdkIndex=html.indexOf('kidscade-game-sdk.js');
  const gameIndex=html.indexOf('./game.js?v=4');
  assert.ok(bodyIndex>=0);
  assert.ok(sdkIndex>bodyIndex,'SDK must load after <body>');
  assert.ok(gameIndex>sdkIndex,'game runtime must load after SDK');
  assert.match(html,/<title>내 말 좀 들어 \| Kidscade<\/title>/);
  assert.match(html,/data-title="내 말 좀 들어"/);
});


test('내 말 좀 들어 does not regress into mostly walk-straight-to-goal stages',()=>{
  const sandbox={};sandbox.window=sandbox;
  vm.runInNewContext(read('games/high_rule_lab/levels.js'),sandbox);
  const levels=sandbox.RuleLabData.levels;

  function startProps(lv){
    const words=new Map(lv.words.map(e=>[e.x+','+e.y,e]));
    const props={};
    for(const a of lv.words){
      if(!String(a.token||'').startsWith('N:')) continue;
      const subject=a.token.slice(2);
      for(const [dx,dy] of [[1,0],[0,1]]){
        const b=words.get((a.x+dx)+','+(a.y+dy));
        const c=words.get((a.x+dx*2)+','+(a.y+dy*2));
        if(b?.token==='EQ'&&String(c?.token||'').startsWith('P:')){
          (props[subject]||(props[subject]=new Set())).add(c.token.slice(2));
        }
      }
    }
    return props;
  }

  function directHeroWalk(lv){
    const props=startProps(lv);
    const has=(type,prop)=>Boolean(props[type]?.has(prop));
    const hero=lv.objects.find(e=>e.type==='hero'&&has('hero','YOU'));
    const wins=lv.objects.filter(e=>has(e.type,'WIN'));
    if(!hero||!wins.length) return false;
    const blocked=new Set(lv.words.map(e=>e.x+','+e.y));
    const fatal=new Set();
    for(const e of lv.objects){
      if(has(e.type,'STOP')||has(e.type,'PUSH')) blocked.add(e.x+','+e.y);
      if(has(e.type,'DEFEAT')||has(e.type,'SINK')) fatal.add(e.x+','+e.y);
    }
    const targets=new Set(wins.map(e=>e.x+','+e.y));
    const q=[[hero.x,hero.y]],seen=new Set([hero.x+','+hero.y]);
    for(let head=0;head<q.length;head++){
      const [x,y]=q[head];
      if(targets.has(x+','+y)) return true;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,key=nx+','+ny;
        if(nx<0||ny<0||nx>=lv.w||ny>=lv.h||seen.has(key)||blocked.has(key)||fatal.has(key)) continue;
        seen.add(key);q.push([nx,ny]);
      }
    }
    return false;
  }

  const direct=levels.map((lv,i)=>directHeroWalk(lv)?i+1:null).filter(Boolean);
  assert.ok(direct.length<=5,'too many direct-walk stages: '+direct.join(','));
  assert.equal(direct.includes(2),false,'stage 2 must require pushing the rock');
  for(const stage of [4,5,6,8,9,10,12,13,14,15,16,18,20,22,24,25,28,29,30,31,32,33,35,45,46,50,51,52,54,56,57,58,59,60]){
    assert.equal(direct.includes(stage),false,'stage '+stage+' must require its intended mechanic');
  }
});

test('내 말 좀 들어 keeps the two multi-step regression solutions reachable',()=>{
  const source=read('games/high_rule_lab/levels.js');
  assert.match(source,/"title": "두 법칙을 고쳐라"/);
  assert.match(source,/"title": "마지막 법칙"/);
  assert.match(source,/"token": "N:rock",[\s\S]{0,180}"token": "EQ",[\s\S]{0,180}"token": "N:water"/);
  assert.match(source,/"token": "N:water",[\s\S]{0,180}"token": "EQ",[\s\S]{0,180}"token": "P:WIN"/);
});
