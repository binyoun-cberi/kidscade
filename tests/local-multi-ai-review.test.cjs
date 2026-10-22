'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const core=require('../scripts/local-ai-review-core.cjs');
const cli=require('../scripts/local-multi-ai-review.cjs');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'kidscade-local-agents-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const file of core.FILES.slice(0,4)){
  const dest=path.join(root,file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,'// mock code for tests\nfunction pixel(){return 1;}\n');
 }
 return root;
}
test('default multi-AI workflow requires different real local models',()=>{
 const options=cli.options([]);
 assert.equal(Object.keys(options.models).length,4);
 assert.ok(new Set(Object.values(options.models)).size>=2);
 assert.equal(options.rounds,2);
 assert.throws(()=>cli.options(['--models','developer=same,gameplay=same,pixel=same,qa=same']),/서로 다른/);
 assert.throws(()=>cli.options(['--models','hacker=unknown']),/유효하지 않은/);
 assert.throws(()=>cli.options(['--rounds','3']),/rounds/);
 assert.throws(()=>cli.options(['--image','a','--image','b','--image','c','--image','d']),/최대 3장/);
});
test('actual source is limited to exact allowlisted game and test files',t=>{
 const root=fixture(t),source=core.sourceSnapshot(root);
 assert.equal(source.shown.size,4);
 assert.ok(source.text.includes('L2 function pixel()'));
 assert.ok(!source.text.includes('secret'));
 assert.throws(()=>core.sourceSnapshot(path.join(root,'missing')),/not found/);
});
test('four independent first reviews precede cross-review; screenshot goes only to pixel',async t=>{
 const root=fixture(t),seen=[];
 const call=async(model,messages,images)=>{
  seen.push({model,messages,images:images.map(x=>x.name)});
  return JSON.stringify({summary:'검토 의견',
   findings:[{severity:'major',file:core.FILES[0],line:2,
     claim:'검증할 장면',evidence:'코드의 해당 줄',fix:'독립 재검토'}]});
 };
 const data=await core.review({root,focus:'선택 결과',models:{...core.MODELS},
  rounds:2,images:[{name:'scene.png',base64:'FAKE_TEST_IMAGE'}]},call);
 assert.equal(seen.length,8);
 assert.equal(Object.keys(data.first).length,4);
 assert.equal(Object.keys(data.second).length,4);
 assert.ok(seen.slice(0,4).every(x=>!x.messages[1].content.includes('다른 AI들의 의견')));
 assert.ok(seen.slice(4).every(x=>x.messages[1].content.includes('다른 AI들의 의견')));
 assert.deepEqual(seen.slice(0,4).map(x=>x.images.length),[0,0,1,0]);
 assert.ok(seen.slice(4).every(x=>x.images.length===0));
 assert.ok(Object.values(data.first).every(x=>x.findings[0].locationVerified));
 assert.match(core.reportMd(data),/독립 다중 AI 검토/);
 assert.match(core.reportMd(data),/다른 AI 의견에 대한 반박/);
});
test('hallucinated code locations are flagged rather than verified',()=>{
 const result=core.parseReview(JSON.stringify({summary:'확인',
  findings:[{file:'games/high_one_life/missing.js',line:9999,
  severity:'blocker',claim:'없는 파일',evidence:'없음',fix:'검증'}]}),
  'qa',new Map());
 assert.equal(result.findings[0].locationVerified,false);
 assert.match(core.reportMd({focus:'test',models:{qa:'test'},rounds:1,
  screenshots:[],first:{qa:result},second:{}}),/근거 행 미확인/);
});
test('no hosted inference, credentials, deployment or auto merge is used',()=>{
 const code=fs.readFileSync(require.resolve('../scripts/local-multi-ai-review.cjs'),'utf8');
 assert.match(code,/hostname:'127\.0\.0\.1'/);
 assert.doesNotMatch(code,/https:\/\/|GITHUB_TOKEN|OPENAI_API_KEY|CLOUDFLARE_API_TOKEN|pull_request_target/);
 assert.doesNotMatch(code,/child_process|execSync|spawnSync|gh pr merge|wrangler deploy/);
 assert.match(cli.usage(),/Ollama/);
});