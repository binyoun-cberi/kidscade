#!/usr/bin/env node
'use strict';
// Manual, strictly localhost-only Ollama runner. No API keys, hosted calls,
// game modifications, deployments, auto PR creation or auto-merges.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const core=require('./local-ai-review-core.cjs');
const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,'.local-ai-reviews');
function usage(){
 return [
 '로컬 독립 다중 AI 검토기 (Ollama 실행 필요)',
 'node scripts/local-multi-ai-review.cjs --dry-run',
 'node scripts/local-multi-ai-review.cjs --focus "고려·조선 픽셀" --image screenshots/one-life.png',
 '--models developer=qwen2.5-coder:3b,gameplay=llama3.2:3b,pixel=gemma3:4b,qa=phi3.5:3.8b',
 '--rounds 1|2 (기본 2: 각각 독립 검토 후 상호 비판)',
 '--out .local-ai-reviews/one-life-review.md (해당 폴더만 허용)',
 'AI는 로컬 127.0.0.1:11434에서만 호출합니다. 모델 자동 다운로드는 하지 않습니다.'
 ].join('\n');
}
function options(args){
 const result={focus:'한 사람의 인생, 시대별 픽셀 및 선택 경험',images:[],
  models:{...core.MODELS},rounds:2,dryRun:false,
  out:'.local-ai-reviews/one-life-review.md'};
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--help'||arg==='-h'){result.help=true;continue;}
  if(arg==='--dry-run'){result.dryRun=true;continue;}
  if(!['--focus','--image','--models','--rounds','--out'].includes(arg))
   throw Error('알 수 없는 인수: '+arg);
  const value=args[++i];if(!value)throw Error(arg+' 에 값을 지정하세요.');
  if(arg==='--image'){result.images.push(value);continue;}
  if(arg==='--focus'){result.focus=value.slice(0,500);continue;}
  if(arg==='--rounds'){result.rounds=Number(value);continue;}
  if(arg==='--out'){result.out=value;continue;}
  for(const entry of value.split(',')){
   const pieces=entry.split('='),role=pieces[0],model=pieces[1];
   if(pieces.length!==2||!Object.hasOwn(core.ROLES,role)||!/^[a-z0-9./:_+-]+$/i.test(model||''))
    throw Error('유효하지 않은 모델 지정: '+entry);
   if(/cloud/i.test(model))throw Error('호스팅/클라우드 추론 모델은 사용할 수 없습니다: '+model);
   result.models[role]=model;
  }
 }
 if(![1,2].includes(result.rounds))throw Error('--rounds는 1 또는 2만 가능합니다.');
 if(Object.values(result.models).some(name=>/cloud/i.test(name)))
  throw Error('호스팅/클라우드 모델은 허용되지 않습니다.');
 if(new Set(Object.values(result.models)).size<2)
  throw Error('서로 다른 두 개 이상의 실제 모델을 지정해야 합니다.');
 if(result.images.length>3)throw Error('이미지는 최대 3장까지 지정할 수 있습니다.');
 return result;
}
function readImages(filenames){
 return filenames.map(filename=>{
  const full=path.resolve(filename),stat=fs.lstatSync(full);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>3*1024*1024)
   throw Error('이미지는 각 3MB 이하의 일반 PNG/JPEG 파일이어야 합니다.');
  const data=fs.readFileSync(full);
  const png=data.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  const jpg=data[0]===255&&data[1]===216;
  if(!png&&!jpg)throw Error('PNG 또는 JPEG 이미지가 아닙니다: '+filename);
  return {name:path.basename(filename),base64:data.toString('base64')};
 });
}
function request(method,route,payload){
 return new Promise((resolve,reject)=>{
  const json=payload?Buffer.from(JSON.stringify(payload)):null;
  const req=http.request({hostname:'127.0.0.1',port:11434,path:route,method,timeout:180000,
   headers:json?{'Content-Type':'application/json','Content-Length':json.length}:{}},res=>{
    let buffer='',bytes=0;
    res.on('data',chunk=>{
      bytes+=chunk.length;
      if(bytes>1024*1024){req.destroy(Error('응답 용량 초과'));return;}
      buffer+=chunk.toString('utf8');
    });
    res.on('end',()=>{
      if(res.statusCode<200||res.statusCode>=300)
       return reject(Error('Ollama HTTP '+res.statusCode+': '+buffer.slice(0,160)));
      try{resolve(JSON.parse(buffer));}catch(_){reject(Error('Ollama JSON 응답 오류'));}
    });
   });
  req.on('timeout',()=>req.destroy(Error('Ollama 응답 시간이 초과됐습니다.')));
  req.on('error',reject);req.end(json||undefined);
 });
}
async function availableModels(){
 const response=await request('GET','/api/tags');
 return new Set((response.models||[]).map(x=>x.name));
}
async function localChat(model,messages,images){
 const chat=messages.map((m,index)=>index===messages.length-1&&images.length?
  {...m,images:images.map(image=>image.base64)}:m);
 const data=await request('POST','/api/chat',{
  model,messages:chat,format:'json',stream:false,keep_alive:0,
  options:{temperature:0.2,num_ctx:8192,num_predict:900}
 });
 const response=data.message?.content;
 if(typeof response!=='string'||!response.trim())throw Error('모델 응답이 비었습니다: '+model);
 return response;
}
function save(report,filename){
 const target=path.resolve(ROOT,filename);
 if(!target.startsWith(DIR+path.sep))throw Error('출력은 .local-ai-reviews 폴더 안에만 허용됩니다.');
 fs.mkdirSync(path.dirname(target),{recursive:true});
 const stem=target.replace(/\.md$/i,'');
 fs.writeFileSync(stem+'.md',core.reportMd(report),'utf8');
 fs.writeFileSync(stem+'.json',JSON.stringify(report,null,2)+'\n','utf8');
 return stem+'.md';
}
async function main(args=process.argv.slice(2),dependencies={}){
 const opt=options(args);
 if(opt.help){console.log(usage());return;}
 const snapshot=core.sourceSnapshot(ROOT),images=readImages(opt.images);
 if(opt.dryRun){
  console.log('입력 구조 확인만 완료 — 실제 AI는 호출하지 않았습니다.');
  console.log('소스 '+snapshot.shown.size+'개, 스크린샷 '+images.length+'개, 설정 모델 '+JSON.stringify(opt.models));
  return;
 }
 let installed;
 try{installed=await (dependencies.models||availableModels)();}
 catch(e){throw Error('로컬 Ollama를 실행해 주세요 (127.0.0.1:11434): '+e.message);}
 for(const name of new Set(Object.values(opt.models))){
  if(!installed.has(name))throw Error('모델 미설치: '+name+' (ollama pull '+name+')');
 }
 const report=await core.review({root:ROOT,focus:opt.focus,models:opt.models,
  rounds:opt.rounds,images},dependencies.chat||localChat);
 const target=save(report,opt.out);
 console.log('실제 로컬 AI '+new Set(Object.values(opt.models)).size+'종 / 독립 역할 4개 / '+opt.rounds+'개 검토 단계');
 console.log('검토 보고서: '+target);
}
if(require.main===module)main().catch(e=>{console.error('[로컬 다중 AI]',e.message);process.exitCode=1;});
module.exports={options,readImages,availableModels,localChat,save,main,usage};