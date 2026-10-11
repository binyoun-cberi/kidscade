'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const X=require('../games/high_ota_typographic_horror/corrector.js');
const C3=require('../games/high_ota_typographic_horror/chapter3.js');
const R=require('../games/high_ota_typographic_horror/rules.js');
const game=path.join(__dirname,'../games/high_ota_typographic_horror');
const passable=(x,z)=>x>=-15&&x<=3&&z>=-65.5&&z<=-38;

test('corrector remains harmless during introduction and respects the archive sanctuary',()=>{
 const s=X.create(),p={x:0,z:-43.5};
 s.x=0;s.z=-48;s.heading=0;
 const opts={stage:'explore',passable,moving:true,running:true,safe:false};
 for(let i=0;i<10;i++){
  const result=X.step(s,.1,p,opts);
  assert.equal(result.caught,false);
 }
 assert.ok(s.grace>0);
 s.grace=0;
 X.step(s,.1,p,{...opts,safe:true});
 assert.notEqual(s.phase,'chase','the separate watcher encounter is protected');
 assert.ok(s.x<=3.03);
});

test('sound and sight trigger pursuit, a lost target becomes a search',()=>{
 const s=X.create();s.x=0;s.z=-49;s.heading=0;s.grace=0;
 const p={x:0,z:-43};
 const report=X.step(s,.1,p,{stage:'explore',passable,moving:true,running:true,safe:false});
 assert.equal(report.phase,'chase');
 assert.ok(s.z>-49);
 const lost=X.step(s,.1,{x:0,z:-42},{stage:'explore',passable,moving:false,running:false,safe:true});
 assert.equal(lost.phase,'search');
 s.search=.1;
 X.step(s,.1,{x:0,z:-42},{stage:'explore',passable,moving:false,running:false,safe:true});
 assert.equal(s.phase,'patrol');
});

test('path planner cannot cross the sealed office wall before repair',()=>{
 const s=R.initialState(),walk=(x,z)=>x<=3.03&&C3.canMove(s,x,z);
 const a={x:-9.5,z:-48.6},b={x:-12.4,z:-48.6};
 assert.equal(X.lineClear(a,b,walk),false);
 assert.equal(X.route(a,b,walk).length,0);
 C3.ensure(s).officeFixed=true;
 const fixed=X.route(a,b,walk);
 assert.ok(fixed.length>0,'repaired wall must allow approach');
 assert.ok(fixed.every(p=>walk(p.x,p.z)));
});

test('the hiding place and final sequence provide counterplay',()=>{
 const s=X.create(),p={...X.SHELTER};
 s.phase='patrol';
 assert.equal(X.enter(s,p),true);
 assert.equal(s.hidden,true);
 assert.equal(X.leave(s),true);
 s.phase='chase';s.x=p.x+.5;s.z=p.z;
 assert.equal(X.enter(s,p),false,'cannot vanish directly in front of monster');
 X.beginFinal(s);
 assert.equal(s.phase,'final');
 assert.equal(X.enter(s,p),false,'no shelter in final escape');
 const report=X.step(s,.1,{x:0,z:-60},{stage:'final',passable,moving:true,running:true,safe:false});
 assert.equal(report.caught,false,'players get a short warning before final pursuit');
});

test('game loads the new predator and retains older encounter mechanics',()=>{
 const html=fs.readFileSync(path.join(game,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(game,'game.js'),'utf8');
 assert.match(html,/<script src="corrector.js"><\/script>/);
 assert.match(html,/id="correctorWarning"/);
 assert.match(js,/X\.step\(corrector/);
 assert.match(js,/R\.stepEnemy\(state/);
 assert.match(js,/R\.stepEcho\(state/);
 assert.match(js,/C3\.stepWatcher\(state/);
 assert.match(js,/X\.beginFinal\(corrector\)/);
 assert.match(js,/\['무언가','#f06478'/);
});
