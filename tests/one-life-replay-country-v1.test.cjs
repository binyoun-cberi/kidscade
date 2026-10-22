'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../games/high_one_life');
const {Life,COUNTRIES}=require(path.join(root,'engine.js'));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('same-birth replay preserves a non-Korean modern birthplace',()=>{
 const foreign=COUNTRIES.find(c=>c[0]==='미국')||COUNTRIES.find(c=>c[0]!=='대한민국');
 assert.ok(foreign,'a second country must exist');
 const base=new Life(20261022,{birthYear:2006,countryName:foreign[0]});
 assert.equal(base.country[0],foreign[0]);
 const again=new Life(base.seed,{birthYear:base.birthYear,countryName:base.country[0],birthSetup:base.birthSetup});
 assert.equal(again.country[0],base.country[0]);
 assert.equal(again.birthYear,base.birthYear);
 assert.equal(again.seed,base.seed);
 assert.equal(again.gender,base.gender);
 assert.equal(again.familyLevel,base.familyLevel);
});
test('existing Korean and historical birth constraints remain unchanged',()=>{
 const korean=new Life(11,{birthYear:1991,countryName:'대한민국'});
 assert.equal(korean.country[0],'대한민국');
 const historical=new Life(11,{birthYear:1381,countryName:'미국'});
 assert.equal(historical.country[0],'대한민국','historic Korean campaigns cannot become US lives');
 const bad=new Life(11,{birthYear:2006,countryName:'없는 나라'});
 const random=new Life(11,{birthYear:2006});
 assert.equal(bad.country[0],random.country[0],'unknown country must not invent a new country');
});
test('same-birth button now passes the captured country, without altering save format',()=>{
 const code=read('game.js');
 assert.match(code,/life=new Sim\.Life\(snapshot\.seed,\{birthYear:snapshot\.birthYear,countryName:snapshot\.country,birthSetup:life\.birthSetup\}\)/);
 assert.doesNotMatch(code,/countryName:'대한민국',birthSetup:life\.birthSetup/);
 const engine=read('engine.js');
 assert.match(engine,/const requestedCountry=COUNTRIES\.find\(c=>c\[0\]===options\?\.countryName\)/);
 assert.match(engine,/else if\(requestedCountry\)this\.country=requestedCountry/);
});
