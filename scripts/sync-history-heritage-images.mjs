#!/usr/bin/env node
// Build a reviewable, rights-filtered image index from the Korea Heritage Service.
// This maintenance script runs on demand, never during a student's quiz.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,rename,rm,access} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CORE_HISTORY_FACTS} from '../data/history-live-question-bank.mjs';

const exec=promisify(execFile);
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const catalogPath=join(root,'data/history-heritage-images.json');
const assetsDir=join(root,'games/high_history_timebattle/heritage-images');
const dryRun=process.argv.includes('--dry-run');
const preview=process.argv.includes('--preview');
const download=process.argv.includes('--download');
const terms=[...new Set(CORE_HISTORY_FACTS.filter(f=>['유물','문화유산','역사서','법전','지도','과학'].includes(f.type)).map(f=>f.term))];
const overrides={
  '다보탑':'경주 불국사 다보탑',
  '석가탑':'경주 불국사 삼층석탑',
  '팔만대장경':'합천 해인사 대장경판',
  '고려청자':'청자 상감운학문 매병',
  '신라 금관':'경주 금관총 금관 및 금제 관식',
  '앙부일구':'앙부일구',
  '초조대장경':'초조본 대반야바라밀다경',
  '경복궁':'경복궁',
  '직지':'백운화상초록불조직지심체요절',
  '무령왕릉':'공주 무령왕릉과 왕릉원',
  '천마도':'경주 천마총 장니 천마도',
  '천마총':'경주 천마총',
  '훈민정음 해례본':'훈민정음',
  '금동미륵보살반가사유상':'금동미륵보살반가사유상',
  '대동여지도':'대동여지도',
  '백자 달항아리':'백자 달항아리',
};
// Checked against the registered heritage names and the API image captions.
// A broad keyword match alone is not sufficient: e.g. the first "불국사"
// result is a photograph of Dabotap, not the temple grounds.
const matchingPhotos=new Set([
  '고인돌','백제 금동대향로','첨성대','석굴암','팔만대장경','직지','삼국사기','삼국유사',
  '경복궁','종묘','측우기','자격루','앙부일구','경국대전','독립문','농경문 청동기',
  '청동 방울','충주 고구려비','서산 용현리 마애여래삼존상','공주 공산성',
  '무령왕릉 지석','천마도','분황사 모전석탑','김해 대성동 고분군',
  '성덕대왕신종','다보탑','감은사지 동·서 삼층석탑','법주사 쌍사자 석등',
  '화엄사 사사자 삼층석탑','수덕사 대웅전','월정사 팔각 구층석탑',
  '관촉사 석조미륵보살입상','초조대장경','숭례문','한양도성','창경궁',
  '사직단','삼강행실도','조선왕조실록','천상열차분야지도','화성행궁',
  '승정원일기','일성록','인왕제색도','세한도','우정총국','환구단','명동성당'
]);
const normalize=s=>String(s).normalize('NFKC').replace(/[^가-힣a-zA-Z0-9]/g,'').toLowerCase();
const decode=s=>String(s??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
function tag(xml,name){return decode(xml.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1]);}
function list(xml){return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m=>({
  name:tag(m[1],'ccbaMnm1'),category:tag(m[1],'ccmaName'),kdcd:tag(m[1],'ccbaKdcd'),asno:tag(m[1],'ccbaAsno'),ctcd:tag(m[1],'ccbaCtcd')
})).filter(x=>x.name&&x.kdcd&&x.asno&&x.ctcd);}
function images(xml){return [...xml.matchAll(/<imageNuri>([^<]*)<\/imageNuri>[\s\S]*?<imageUrl>([^<]*)<\/imageUrl>[\s\S]*?<ccimDesc>([^<]*)<\/ccimDesc>/g)].map(m=>({
  rights:m[1].trim(),url:decode(m[2]),caption:decode(m[3])
})).filter(x=>/^https?:\/\/www\.khs\.go\.kr\/unisearch\/images\//.test(x.url));}
async function curl(url,{binary=false}={}){
  const args=['--location','--fail','--silent','--show-error','--compressed','--retry','2','--max-time','25',url];
  // Binary is only fetched to an explicit validated output under our image directory.
  const {stdout}=await exec('curl',args,{maxBuffer:8*1024*1024,encoding:binary?'buffer':'utf8',timeout:33000});
  return stdout;
}
async function findCandidate(term){
  const target=overrides[term]||term;
  const base='https://www.khs.go.kr/cha/SearchKindOpenapiList.do?ccbaMnm1='+encodeURIComponent(target)+'&pageUnit=100';
  let items=list(await curl(base));
  if(!items.length&&target!==term)items=list(await curl(base.replace(encodeURIComponent(target),encodeURIComponent(term))));
  const key=normalize(target),original=normalize(term);
  const scored=items.map(item=>{
    const name=normalize(item.name);
    const exact=name===key;
    const contains=name.includes(key)&&key.length>=3;
    const prefix=key.includes(name)&&name.length>=4;
    const fallback=name.includes(original)&&original.length>=3;
    return {...item,score:exact?100:contains?80:prefix?65:fallback?55:0};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||((a.category==='국보')?-1:0)-((b.category==='국보')?-1:0)||a.name.length-b.name.length);
  const best=scored[0];
  return best&&best.score>=55?{...best,alternatives:scored.length}:null;
}
async function matchOne(term){
  try{
    const candidate=await findCandidate(term);
    if(!candidate)return {term,status:'unmatched'};
    const imageApi='https://www.khs.go.kr/cha/SearchImageOpenapi.do?ccbaKdcd='+encodeURIComponent(candidate.kdcd)+'&ccbaCtcd='+encodeURIComponent(candidate.ctcd)+'&ccbaAsno='+encodeURIComponent(candidate.asno);
    const photos=images(await curl(imageApi));
    // Only the A marker is eligible for the automatic shortlist. A human must
    // still verify the displayed KOGL type before republishing downloaded media.
    const eligible=photos.filter(p=>p.rights==='A'&&p.url.toLowerCase().endsWith('.jpg'));
    if(!eligible.length)return {term,status:'no-permissive-image',candidate:candidate.name,rights:[...new Set(photos.map(p=>p.rights))]};
    const generic=eligible.find(p=>normalize(p.caption)===normalize(candidate.name));
    const image=generic||eligible[0];
    const id=createHash('sha256').update(term).digest('hex').slice(0,16);
    return {term,status:'candidate',id,candidate:candidate.name,category:candidate.category,score:candidate.score,alternatives:candidate.alternatives,
      rightsCode:image.rights,sourceUrl:image.url.replace(/^http:/,'https:'),sourceApi:imageApi,caption:image.caption};
  }catch(error){return {term,status:'error',error:String(error.message).slice(0,130)};}
}
async function allTerms(){
  const results=Array(terms.length);let next=0,done=0;
  async function worker(){
    while(next<terms.length){
      const i=next++;
      results[i]=await matchOne(terms[i]);done++;
      if(done%10===0||done===terms.length)console.log(`Checked ${done}/${terms.length} · candidates ${results.filter(x=>x?.status==='candidate').length}`);
    }
  }
  await Promise.all(Array.from({length:3},worker));
  return results;
}
async function main(){
  if(download){
    const report=JSON.parse(await readFile(catalogPath,'utf8'));
    const selected=report.records.filter(x=>x.status==='candidate'&&matchingPhotos.has(x.term)&&x.rightsCode==='A');
    await mkdir(assetsDir,{recursive:true});
    const media={};let done=0;
    for(const item of selected){
      const dest=join(assetsDir,item.id+'.webp');
      const temp=join(assetsDir,item.id+'.download');
      const converted=join(assetsDir,item.id+'.tmp.webp');
      try{
        if(!/^https:\/\/www\.khs\.go\.kr\/unisearch\/images\/[a-z_]+\/[a-zA-Z0-9_-]+\.jpg$/i.test(item.sourceUrl))throw new Error('Unexpected image URL');
        const exists=await access(dest).then(()=>true,()=>false);
        if(!exists){
          await exec('curl',['--fail','--location','--silent','--show-error','--retry','2','--max-time','30','--output',temp,item.sourceUrl],{timeout:40000});
          await exec('convert',[temp,'-auto-orient','-resize','600x600>','-strip','-quality','68',converted],{timeout:35000});
          await rename(converted,dest);
        }
        media[item.term]={src:'/games/high_history_timebattle/heritage-images/'+item.id+'.webp',credit:'사진: 국가유산청',sourceUrl:item.sourceApi};
        done++;
      }catch(error){console.error('Skipped '+item.term+': '+error.message)}
      finally{await Promise.all([rm(temp,{force:true}),rm(converted,{force:true})]);}
    }
    const manifestPath=join(root,'data/history-heritage-media.mjs');
    await writeFile(manifestPath,'// Cached images selected from the KHS image API; see history-heritage-images.json for provenance.\n// imageNuri A is a source rights marker; confirm the applicable reuse terms before redistribution.\nexport const HERITAGE_MEDIA = Object.freeze('+JSON.stringify(media,null,2)+');\n');
    console.log(`Cached ${done}/${selected.length} heritage photos; wrote ${manifestPath}`);
    return;
  }
  let result;
  if(preview)result=JSON.parse(await readFile(catalogPath,'utf8')).records;
  else result=await allTerms();
  const accepted=result.filter(x=>x.status==='candidate');
  const excluded=result.filter(x=>x.status!=='candidate');
  if(dryRun){
    console.log(JSON.stringify({accepted:accepted.length,excluded},null,2));
    return;
  }
  // Image downloads happen only after the human review step with --preview.
  // The metadata is still useful as a reproducible candidate report.
  await mkdir(dirname(catalogPath),{recursive:true});
  await writeFile(catalogPath,JSON.stringify({source:'국가유산청 Open API',licenseReview:'pending',checkedAt:new Date().toISOString(),records:result},null,2)+'\n');
  console.log(`Saved ${accepted.length} review candidates to ${catalogPath}`);
}
main().catch(error=>{console.error(error);process.exitCode=1});
