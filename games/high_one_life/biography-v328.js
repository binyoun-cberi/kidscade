/* Ending selections use actual records from every installed story module. */
(function(root,factory){
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeBiography328=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const isChoice=e=>!!e&&(e.kind==='decision'||/(?:-|:)choice$/.test(e.kind||''));
 const remembered=e=>!!e&&typeof e.text==='string'&&e.text.trim()&&
  (isChoice(e)||['birth','death','milestone','history','event','profession','family','relationship','chain','world','safety'].includes(e.kind)||
   /(?:family|memory|followup|life|career|return|fact|depart|daily|work|captivity|generations)(?:\d+)?$/.test(e.kind||''));
 function highlights(life,limit=16){
  const items=(life.log||[]).filter(remembered).filter((e,i,a)=>a.findIndex(x=>x.age===e.age&&x.text===e.text)===i);
  if(items.length<=limit)return items;
  // Preserve childhood, middle age and the ending rather than only the last screenful.
  return Array.from({length:limit},(_,i)=>items[Math.round(i*(items.length-1)/(limit-1))]);
 }
 function recap(life){
  const items=(life.log||[]).filter(remembered).filter(e=>!['birth','death'].includes(e.kind));
  if(!items.length)return '이 생애의 중간 기록이 남아 있지 않아 자세한 일상을 되짚을 수 없다.';
  const selected=highlights({log:items},Math.min(3,items.length));
  return selected.map(e=>e.age+'세에는 '+e.text).join(' ');
 }
 // Editorial composition, never an extra simulation: no RNG, fabricated dialogue,
 // final-state backdating, or implied success for a merely intended action.
 const clean=x=>typeof x==='string'?x.trim().replace(/\s+/g,' '):'';
 const sentence=x=>/[.!?。…]$/.test(x)?x:x+'.';
 function subject(name){
  const last=name.charCodeAt(name.length-1),final=last>=0xac00&&last<=0xd7a3?(last-0xac00)%28:0;
  return name+(final?'이':'가');
 }
 function copula(word){
  const last=word.charCodeAt(word.length-1);
  return word+(last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28?'이었다.':'였다.');
 }
 const intentions=[
  ['알아본다','알아보기로 했다'],['돌본다','돌보기로 했다'],['이어 간다','이어 가기로 했다'],
  ['도와준다','도와주기로 했다'],['들려준다','들려주기로 했다'],['나눈다','나누기로 했다'],
  ['배운다','배우기로 했다'],['모은다','모으기로 했다'],['버틴다','버티기로 했다'],
  ['지킨다','지키기로 했다'],['남긴다','남기기로 했다'],['보낸다','보내기로 했다'],
  ['고른다','고르기로 했다'],['구한다','구하기로 했다'],['정한다','정하기로 했다'],
  ['받는다','받기로 했다'],['맡는다','맡기로 했다'],['듣는다','듣기로 했다'],
  ['묻는다','묻기로 했다'],['돕는다','돕기로 했다'],['쓴다','쓰기로 했다'],
  ['튼다','트기로 했다'],['쉰다','쉬기로 했다'],['즐긴다','즐기기로 했다'],['판다','팔기로 했다'],
  ['산다','살기로 했다'],['된다','되기로 했다'],['간다','가기로 했다'],['찾는다','찾기로 했다'],
  ['세운다','세우기로 했다'],['한다','하기로 했다']
 ];
 function intention(text){
  const bare=text.replace(/[.!?]+$/,'');
  if(bare.endsWith('기로 한다'))return bare.slice(0,-5)+'기로 했다.';
  const ending=intentions.find(([from])=>bare.endsWith(from));
  return ending?bare.slice(0,-ending[0].length)+ending[1]+'.':'';
 }
 function proseText(e){
  let text=clean(e.text).replace(/^\d{1,2}월\s*·\s*/,'');
  if(/성장하며 .*생활을 경험했다|당시에 .*경험이 지금의 삶|오랜 시간이 지나고 삶의 속도|스스로의 방향을 생각하기|같은 일을 다시 적었다/.test(text))return '';
  // Older historical choices store a headline followed by the selected action.
  if(isChoice(e))text=text.replace(/^\d{4}년 [^.]+\.\s*/,'');
  // A selection records intent. It is not proof that the action succeeded.
  if(isChoice(e)&&text.includes(' — ')){
   text=intention(text.slice(text.indexOf(' — ')+3));
   if(!text)return '';
  }else if(isChoice(e)){
   text=text.split(/(?<=[.!?])\s+/).map(part=>intention(part)||part).join(' ');
  }
  if(text.includes(' — ')||/\b(?:undefined|null|NaN)\b|\[object Object\]|아직 정해지지 않음|작은 흔적|다른 계절에도 이어|그때 겪은|플레이스홀더/.test(text))return '';
  if(/(?:한다|살핀다|돌본다|알아본다|될 것이다)[.!?]?\s*$/.test(text))return '';
  // Numerical HUD deltas and recurring ledger totals belong in the detailed log.
  if(e.kind==='decision-effect'||/곡식을 \d+만큼 마련|배운 방법을 확인하고 경험을 쌓았다/.test(text))return '';
  text=text.replace(/^올해(?=\s)/,'그해').replace(/^지난해(?=\s)/,'그 전해').replace(/^오늘은 /,'그날은 ')
   .replace(/우리 집/g,'자신의 집').replace(/아버지이 /g,'아버지가 ').replace(/어머니이 /g,'어머니가 ')
   .replace(/ 함께했던 기억이 마음에 오래 남았다\./g,'').replace(/ 집안에 빈자리가 생겼다\./g,'')
   .replace(/ 함께 꾸리던 살림의 빈자리가 남았다\./g,'')
   .replace(/^(.+)에 흥미를 붙였다\.$/,'$1에 마음이 기울었다.');
  return text?sentence(text):'';
 }
 function category(e){
  if(/세상을 떠났|세상을 떠나|목숨을 잃/.test(e.prose))return 'loss';
  if(/포로|피란|피난|붙잡|전쟁|전란|귀환|돌아왔|떠났|이주|유배|석방|면천|도망/.test(e.prose))return 'turn';
  if(/혼인|결혼|배우자|아이가 태어|자녀|식구|어머니|아버지|동생|동무|친구|이웃/.test(e.prose))return 'people';
  if(/배웠|배우기|글공부|장부|서책|학교|시험|급제|익혔/.test(e.prose))return 'learning';
  if(/일터|일자리|일하|생업|장터|장사|거래|농사|기술|공방|짜는|품일/.test(e.prose))return 'work';
  return 'daily';
 }
 function weight(e){
  return (isChoice(e)?5:0)+(/followup|return|captivity|profession|family/.test(e.kind)?5:0)+
   (/혼인|결혼|아이가 태어|급제|포로|귀환|피란|석방|면천/.test(e.prose)?10:0)+
   (/그림|삼베|모시|곡식|씨앗|편지|옷감|장부|도구|책|물꼬/.test(e.prose)?3:0);
 }
 function evidence(life){
  const log=Array.isArray(life.log)?life.log:[],seen=new Set();
  const finalAge=Number.isFinite(life.age)?life.age:Math.max(0,...log.map(e=>Number.isFinite(e?.age)?e.age:0));
  return log.map((e,index)=>e&&({...e,index,prose:proseText(e)})).filter(e=>{
   if(!e||!Number.isFinite(e.age)||e.age<0||e.age>finalAge||!e.prose)return false;
   if(['birth','death','history','era-context'].includes(e.kind)||/(?:-|:)fact$/.test(e.kind||''))return false;
   if(!(remembered(e)||['life9','care13','household342','memory'].includes(e.kind)||/(?:-|:)(?:result|depart)$/.test(e.kind||'')))return false;
   if(e.age===0&&/태어났다/.test(e.prose))return false;
   // Repeated annual prose must not displace distinct events elsewhere in a life.
   if(seen.has(e.prose))return false;seen.add(e.prose);return true;
  }).sort((a,b)=>a.age-b.age||a.index-b.index);
 }
 function selectScenes(events){
  const chosen=[];let losses=0;
  for(const [lo,hi] of [[0,13],[13,27],[27,45],[45,65],[65,Infinity]]){
   const pool=events.filter(e=>e.age>=lo&&e.age<hi),used=new Set();
   for(const e of [...pool].sort((a,b)=>weight(b)-weight(a)||a.index-b.index)){
    const type=category(e);
    const inPassage=chosen.filter(x=>x.age>=lo&&x.age<hi);
    if((used.has(type)&&!(type==='turn'&&inPassage.filter(x=>category(x)==='turn').length<2))||(type==='loss'&&losses>=1)||inPassage.length>=3)continue;
    chosen.push(e);used.add(type);if(type==='loss')losses++;
   }
  }
  // Include the actual earlier decision when a selected outcome has explicit
  // provenance. Never attach another choice just because it occurred that year.
  for(const e of [...chosen]){
   if(!e.causeId||isChoice(e)||!/followup|result|return/.test(e.kind))continue;
   const cause=events.find(x=>isChoice(x)&&x.causeId===e.causeId&&x.index<e.index);
   if(cause&&!chosen.includes(cause))chosen.push(cause);
  }
  for(const e of [...chosen]){
   if(!e.causeId||!isChoice(e))continue;
   const outcome=events.find(x=>x.causeId===e.causeId&&x.index>e.index&&/followup|result/.test(x.kind));
   if(outcome&&!chosen.includes(outcome))chosen.push(outcome);
  }
  return chosen.sort((a,b)=>a.age-b.age||a.index-b.index);
 }
 function portrait(life,{place='',origin=''}={}){
  life=life||{};
  const name=clean(life.profile?.name)||clean(life.birthSetup?.name),birth=Number.isFinite(life.birthYear)?life.birthYear:null;
  const age=Number.isFinite(life.age)?Math.max(0,life.age):null;
  const opening=(birth===null?'':birth+'년, ')+(clean(place)?clean(place)+'에서 ':'')+(name?subject(name):'한 아이가')+' 태어났다.';
  const birthOrigin=clean(life.birthSetup?.origin)||clean(origin);
  const paragraphs=[opening+(birthOrigin?' 태어난 집안은 '+copula(birthOrigin):'')];
  const scenes=selectScenes(evidence(life));
  // Build paragraphs around several moments, not one bullet per year. Dates
  // establish distance; only explicit cause IDs justify causal interpretation.
  let group=[],previous=null,passage=0;
  const flush=()=>{if(group.length)paragraphs.push(group.join(' '));group=[];};
  const phase=x=>x<13?0:x<27?1:x<45?2:x<65?3:4;
  for(const e of scenes){
   if(previous&&(group.length>=3||phase(e.age)!==phase(previous.age)))flush();
   const year=birth===null?'':(birth+e.age)+'년';
   let lead;
   if(!group.length){
    // Vary sentence structure, rather than repeating a date stamp on every line.
    if(e.prose.endsWith('기로 했다.')){
     group.push(e.prose.slice(0,-6)+'기로 한 것은 '+e.age+'세'+(year?'가 되던 '+year+'이었다.':' 때였다.'));
     passage++;previous=e;continue;
    }
    if(passage%2===1){
     group.push(e.prose+' '+(year?year+', ':'')+e.age+'세 때의 일이었다.');
     passage++;previous=e;continue;
    }
    passage++;lead=e.age+'세'+(year?'가 되던 '+year:' 때')+', ';
   }
   else if(previous.causeId&&previous.causeId===e.causeId&&isChoice(previous)&&/followup|result/.test(e.kind))lead=e.age===previous.age?'그 선택 뒤, ': '그 선택으로부터 '+(e.age-previous.age)+'년 뒤, ';
   else if(e.age===previous.age)lead='같은 해, ';
   else if(e.age===previous.age+1)lead='이듬해, ';
   else lead='그로부터 '+(e.age-previous.age)+'년 뒤, ';
   group.push(lead+e.prose);previous=e;
  }
  flush();
  const death=clean(life.deathReason)||clean((Array.isArray(life.log)?life.log:[]).find(e=>e?.kind==='death')?.text);
  if(life.alive===false||death){
   const year=Number.isFinite(life.year)?life.year:(birth!==null&&age!==null?birth+age:null);
   let last=age===0?'태어난 해에 삶이 끝났다.':(year!==null?year+'년, ':'')+(age!==null?age+'세.':'삶의 마지막 해였다.');
   if(death)last+=' '+sentence(death);
   else last+=' 구체적인 사망 원인은 전해지지 않는다.';
   paragraphs.push(last);
  }
  if(!scenes.length&&age!==0)paragraphs.splice(1,0,'중간 기록이 남아 있지 않아 그동안의 일을 자세히 되짚을 수 없다.');
  return {title:name?name+'의 생애':'한 사람의 생애',paragraphs,scenes:scenes.map(e=>({age:e.age,kind:e.kind,index:e.index,causeId:e.causeId||null,text:e.text}))};
 }
 function chapters(life,options){return portrait(life,options).paragraphs;}
 return Object.freeze({isChoice,highlights,recap,chapters,portrait});
});
