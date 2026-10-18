import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('./market-walk.js',import.meta.url),'utf8');
const a=source.indexOf('function retailSamples('),b=source.indexOf('\nfunction syncRetailProducts',a);
const samples=new Function(source.slice(a,b)+';return retailSamples')();
test('display facings stay inside shelf cells and preserve product proportions',()=>{
 for(const width of [.35,.47,.62])for(const depth of [.3,.5,.8])for(const count of [0,1,2,3,4,8,16]){
  const size=.275,slots=samples(count,width,depth,size);assert.equal(slots.length,Math.min(4,count));
  for(const s of slots){assert.ok(s.scale>0&&s.scale<=1);assert.ok(Math.abs(s.x)+size*s.scale/2<=width/2+.0001);assert.ok(Math.abs(s.z)+size*s.scale/2<=depth/2+.0001)}
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){const x=Math.abs(slots[i].x-slots[j].x),z=Math.abs(slots[i].z-slots[j].z);assert.ok(x>=size*slots[i].scale||z>=size*slots[i].scale)}
 }
});
test('one product remains centered instead of occupying a corner',()=>{assert.deepEqual(samples(1,.6,.6,.25),[{x:0,z:0,scale:1}])});
