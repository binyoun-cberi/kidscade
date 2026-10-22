'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(root,'engine.js'));
const auto=require(path.join(root,'auto-choice-v1.js'));
const file=n=>fs.readFileSync(path.join(root,n),'utf8');
test('world births actually vary in country, family and gender; historical Korean birth stays Korean',()=>{
 assert.ok(Sim.COUNTRIES.length>70,'supported countries should be more than a short curated list');
 const all=new Set(),homes=new Set(),genders=new Set(),families=new Set();
 for(let i=1;i<=180;i++){
  const l=new Sim.Life(Math.imul(i,2654435761)>>>0,{birthYear:2026});
  all.add(l.country[0]);homes.add(l.country[1]);genders.add(l.gender);families.add(l.familyLevel);
 }
 assert.ok(all.size>=8,'actual weighted global lottery should yield multiple nationalities');
 assert.equal(genders.size,2);assert.ok(families.size>=2);
 for(const year of [1210,1350,1480,1580,1880]){
  for(const countryName of ['미국','일본','대한민국']){
   const l=new Sim.Life(3245,{birthYear:year,countryName});
   assert.equal(l.country[0],'대한민국');
  }
 }
});
test('modern lives experience different years, paths and outcomes under automated replay',()=>{
 const outcomes=new Set(),deaths=new Set(),countries=new Set();
 for(let i=1;i<=36;i++){
  const l=new Sim.Life((i*17171)>>>0,{birthYear:2026});
  let guard=0;
  while(l.alive&&l.age<100&&guard++<180){
   if(l.pending){if(!auto.tick(l))break;}
   else l.tick();
  }
  countries.add(l.country[0]);deaths.add(l.deathReason);
  outcomes.add([l.country[0],l.gender,l.familyLevel,l.career,l.age,l.deathReason].join('|'));
 }
 assert.ok(countries.size>=5,'different countries must remain reachable');
 assert.ok(outcomes.size>=18,'many seeds should lead to different lived paths');
 assert.ok(Sim.CHOICES.length>=5,'repeated age-specific decisions still exist');
});
test('player can choose a modern birthplace or leave it to chance; peers keep the same country',()=>{
 const html=file('index.html'),game=file('game.js');
 assert.match(html,/id="birthCountryInput"/);
 assert.match(html,/value="">세상 어디든/);
 assert.match(game,/birthYear<1900\?'대한민국':\$\('birthCountryInput'\)\.value\|\|undefined/);
 assert.match(game,/const peer=new Sim\.Life\([^\n]+countryName:life\.country\[0\]/);
 assert.match(game,/return restored\|\|null/,'saved overseas lives should remain resumable');
 assert.match(game,/Sim\.COUNTRIES\.map\(country=>\[country\[0\],country\[1\]\]\)/);
});