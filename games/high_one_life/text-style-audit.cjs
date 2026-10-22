'use strict';
// Review assistant: reports suspicious stock phrases and overly repeated copy.
// Does not rewrite historical sources, change game data, or call any network API.
const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
// Historical-resource quantities should never use the deprecated invented UI unit.
const REVIEW_PHRASES=[String.fromCharCode(0xBAAB),
  '그때는 무엇이 달라질지 몰랐다',
  '그날의 일은 마음 한편에 남았다',
  '세월이 지나며 이야기들이 남습니다',
  '식구들과 고을의 하루를 보냈다',
  '당장은 눈에 띄는 변화가 없었다',
  '작은 흔적을 남겼다',
  '삶의 한 페이지를 장식했다',
  '새로운 가능성이 펼쳐졌다',
  '인연을 맺었다'
];
function analyze(source,filename=''){
 const findings=[];
 for(const phrase of REVIEW_PHRASES){
  let from=0,at;
  while((at=source.indexOf(phrase,from))>=0){
   const line=source.slice(0,at).split('\n').length;
   findings.push({file:filename,line,phrase,review:'맥락·사실·인과관계 확인'});
   from=at+phrase.length;
  }
 }
 return findings;
}
function files(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  if(entry.name.startsWith('.')||entry.name==='node_modules'||entry.name==='text-style-audit.cjs')return [];
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?files(full):/\.(?:js|mjs|html)$/.test(entry.name)?[full]:[];
 });
}
function scan(){
 return files(root).flatMap(file=>analyze(fs.readFileSync(file,'utf8'),path.relative(root,file).replace(/\\/g,'/')))
   .sort((a,b)=>a.file.localeCompare(b.file)||a.line-b.line);
}
if(require.main===module){
 const findings=scan();
 console.log('# 단 하나의 인생 문장 검수 후보 ('+findings.length+'건)');
 console.log('기계식 탐지는 검토 후보이며 모두 오류라는 뜻이 아닙니다.');
 for(const row of findings.slice(0,100))console.log(row.file+':'+row.line+' · '+row.phrase);
 if(findings.length>100)console.log('추가 '+(findings.length-100)+'건은 출력 생략');
}
module.exports={REVIEW_PHRASES,analyze,scan};
