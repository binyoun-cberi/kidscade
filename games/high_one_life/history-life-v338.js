/* Public chronology -> conditional fictional household choices.
 * Existing war, famine and levy modules remain the owners of their shocks.
 * Amounts, odds and individual encounters below are game mechanics.
 */
(function(root,factory){const api=factory(root);if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.OneLifeHistoryLife338=api;})(typeof window!=='undefined'?window:null,function(root){
'use strict';
const J=root?.OneLifeJoseon,V2=root?.OneLifeJoseon2,V4=root?.OneLifeJoseon4,V5=root?.OneLifeJoseon5,
 B=root?.OneLifeJoseonBranches325||root?.OneLifeJoseon325,War=root?.OneLifeJoseon13,Cal=root?.OneLifeCalendar337,P=root?.OneLifeJoseonPolicy;
const clip=(n,a,b)=>Math.max(a,Math.min(b,n));
const roll=(l,key)=>{let h=l.seed>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h/4294967296;};
const valid=l=>!!l&&l.alive&&J?.isJoseon(l)&&l.year<=1905&&!l.travel22?.residence?.abroad&&l.joseon14?.captivity?.status!=='held'&&(!l.joseon325||l.joseon325.law.kind==='free');
const job=l=>J.ensure(l).occupation+' '+V5.ensure(l).role;
const farmer=l=>J.ensure(l).land>0&&/농사|농가|소작|화전/.test(job(l)+' '+V5.ensure(l).origin);
const independent=l=>l.year>=1894||V5.ensure(l).freed||!['사노비','공노비'].includes(V5.ensure(l).origin);
const trader=l=>/상인|장사|보부상|운송|짐꾼|수레|뱃사공/.test(job(l));
const access=l=>J.ensure(l).region==='한양'||J.ensure(l).literacy>0||V4.ensure(l).people.some(p=>p.alive&&p.birthYear<=l.year&&p.learning>0);
const tied=l=>!!l.joseon325?.politics?.faction&&['petition','fallout','trial'].includes(l.joseon325.politics.stage);
function ensure(l){if(!J?.isJoseon(l))return null;return l.historyLife338||(l.historyLife338={version:1,processedYear:l.year-1,seen:[],queue:[],active:null,followups:[],decisions:[],hangul:0,proof:0,routes:[]});}
const portFact=l=>{const r=J.ensure(l).region;return r==='경상도'&&l.year>=1880?source(1876,'강화도 조약'):r==='함경도'&&l.year>=1880?source(1880,'원산 개항'):['한양','경기도'].includes(r)&&l.year>=1883?source(1883,'인천 개항'):null;};
const experience=l=>ensure(l).routes?.some(r=>r.region===J.ensure(l).region&&r.year<l.year);
const titles={port:'개항장으로 이어지는 거래',map:'지도에서 고을과 나루를 짚다',news:'신문의 글을 함께 읽다',letter:'인편에 맡길 안부를 적다',court:'임금이 바뀐 뒤 관청에서',purge:'정국이 뒤집힌 뒤 돌아온 문서',tax:'달라진 납부 장부를 받아 들고',hangul:'언문을 읽고 쓰는 연습',farmbook:'농서의 방법을 작은 밭에 써 보다',medicine:'의서의 처방을 옮겨 적다',crop:'고구마 씨줄기를 구할 기회',coin:'장터에서 동전으로 값을 치르다',rail:'철길 곁에서 달라진 일감'};
function eligibility(l,key){
 if(!valid(l)||l.age<8||l.age>78)return false;const j=J.ensure(l),s=V5.ensure(l);
 if(key==='port')return l.year<=1898&&l.age>=16&&independent(l)&&trader(l)&&!!portFact(l);
 if(key==='map')return l.year>=1861&&l.age>=16&&independent(l)&&trader(l)&&access(l);
 if(key==='news')return l.year>=1896&&l.year<=1898&&l.age>=12&&J.ensure(l).region==='한양';
 if(key==='letter')return l.year>=1446&&(ensure(l).hangul>0)&&V4.ensure(l).people.some(p=>p.alive&&p.birthYear<=l.year&&p.atHome===false);
 if(key==='court')return l.age>=20&&independent(l)&&j.office&&l.gender==='남자';
 if(key==='purge')return l.age>=20&&independent(l)&&l.gender==='남자'&&(tied(l)||(j.office&&s.rank>=1));
 if(key==='tax')return l.age>=16&&independent(l);
 if(key==='hangul')return l.year>=1446&&access(l);
 if(key==='farmbook')return l.year>=1429&&l.age>=16&&independent(l)&&farmer(l)&&access(l);
 if(key==='medicine')return l.year>=1613&&l.age>=16&&/의관|의술|의원|약재/.test(job(l));
 if(key==='crop')return l.year>=1765&&l.age>=16&&j.region==='경상도'&&independent(l)&&farmer(l);
 if(key==='coin')return l.year>=1678&&l.age>=16&&independent(l)&&trader(l);
 if(key==='rail')return l.year>=1899&&l.age>=16&&['한양','경기도'].includes(j.region)&&independent(l)&&trader(l);
 return false;
}
function source(year,title){return Cal.forYear(year).find(e=>e.title===title);}
function opportunities(l){
 const out=[],year=l.year,j=J.ensure(l);
 if(eligibility(l,'port'))out.push({key:'port',fact:portFact(l)});
 if(eligibility(l,'news'))out.push({key:'news',fact:source(1896,'독립신문 창간')});
 if(eligibility(l,'map'))out.push({key:'map',fact:source(1861,'대동여지도 간행')});
 if(eligibility(l,'letter'))out.push({key:'letter',fact:source(1446,'훈민정음 반포')});
 for(const e of Cal.forYear(year)){
  if(/사화|반정|계유정난/.test(e.title))out.push({key:'purge',fact:e});
  else if(e.category==='royal'&&year<1894)out.push({key:'court',fact:e});
 }
 const levy=P.tribute(year,j.region),military=P.military(year,V5.ensure(l).origin,l.gender);
 if(levy.kind==='daedong'&&levy.start===year)out.push({key:'tax',fact:{year,title:j.region+' 대동법 시행',source:levy.source}});
 if(year===1750&&military.kind==='gyunyeok'&&military.eligible)out.push({key:'tax',fact:source(1750,'균역법 시행')});
 const windows=[['hangul',1446,1893,1446,'훈민정음 반포'],['farmbook',1430,1893,1429,'농사직설 편찬'],['medicine',1613,1893,1613,'동의보감 간행'],['crop',1765,1893,1763,'조엄의 고구마 종자 전래'],['coin',1678,1893,1678,'상평통보 유통 확대'],['rail',1899,1905,1899,'경인선 일부 개통']];
 for(const [key,start,end,factYear,title] of windows)if(year>=start&&year<=end)out.push({key,fact:source(factYear,title)});
 return out.filter(x=>x.fact&&eligibility(l,x.key));
}
const opt=(label,note,action)=>({label,note,action});
function prompt(l){
 const q=ensure(l)?.active;if(!q||!eligibility(l,q.key))return null;
 const j=J.ensure(l),food=V2.ensure(l).grain,seeded=food>=2,paid=j.capital>=2;
 const descriptions={
  port:'개항장으로 물건을 보내는 거래를 소개받았다. 항구까지 드는 운반비와 낯선 거래처의 값을 먼저 알아봐야 한다. 물건을 받을 사람과 값을 치를 때도 미리 정해 두려 한다.',
  map:'대동여지도를 가진 사람과 고을과 나루가 표시된 부분을 함께 펼쳤다. 지도 속 길이 실제로 다닐 만한지는 그 길을 오가는 사람에게 물어야 한다.',
  news:ensure(l).hangul>0?'전에 익힌 언문으로 독립신문의 짧은 기사를 더듬어 읽어 본다. 모르는 말은 곁에 있는 사람에게 묻는다.':'독립신문을 읽는 사람 곁에서 기사를 듣는다. 글자를 아직 익히지 못해 혼자 읽기는 어렵다.',
  letter:'글자를 익힌 뒤, 다른 고을에 사는 '+(V4.ensure(l).people.find(p=>p.alive&&p.birthYear<=l.year&&p.atHome===false)?.name||'식구')+'에게 인편으로 보낼 안부를 직접 적어 보려 한다.',
  court:q.title+' 뒤 소속 관청에서 지난 업무와 납부 문서를 다시 정리하고 있다. 맡은 장부를 살펴 달라는 말을 들었다.',
  purge:q.title+' 뒤 조정의 인사와 상소 문서가 다시 거론된다. '+(tied(l)?'전에 함께 의견을 냈던 사람들의 이름이 있어 내 문서도 살펴야 한다.':'관직에서 맡았던 업무의 근거를 정리할 필요가 있다.'),
  tax:q.title+'에 따라 우리 집이 내야 할 몫이 적힌 장부를 살핀다. 밭의 크기와 납부 내역을 확인해야 한다.',
  hangul:'언문으로 말을 적는 사람에게서 글자 모양과 소리를 배우게 되었다. 일을 마친 뒤에도 연습할 시간을 내야 한다.',
  farmbook:'농서의 내용을 아는 사람에게 씨앗을 뿌리고 밭을 돌보는 방법을 들었다. 집안의 밭 한쪽에서 익숙한 방법과 비교해 볼 수 있다.',
  medicine:'함께 의술을 익히는 사람이 동의보감에 실린 처방을 보여 주었다. 약재와 쓰는 법을 대조하며 읽을 시간이 필요하다.',
  crop:'장터에서 고구마 씨줄기와 재배법을 구할 기회가 생겼다. 추위와 물 빠짐에 따라 작황이 달라질 수 있어 밭 전체를 바꾸기는 망설여진다.',
  coin:'물건 값을 동전으로 주겠다는 손님을 만났다. 곡식과 동전의 값을 맞추고, 받은 돈을 어디에 쓸지도 살펴야 한다.',
  rail:'철도와 전차가 다니면서 서울과 인천을 오가는 짐의 길이 바뀌고 있다. 역까지 물건을 나르는 일과 기존 운송 일을 두고 고민한다.'
 };
 if(q.key==='rail'&&experience(l))descriptions.rail+=' 전에 이 고을의 운송 일을 알아본 경험이 있어 길과 비용을 짚어 볼 수 있다.';
 let options;
 if(q.key==='map')options=[opt(paid?'지도와 실제 길을 대조해 적어 둔다':'여비가 부족해 지도에서 길부터 묻는다','이웃 고을까지 다녀오는 여비와 품이 든다. 길을 확인한 뒤에야 운송에 쓸 수 있다.',paid?'survey':'observe'),opt('지도를 가진 사람에게 고을 이름을 묻는다','당장 새 길로 물건을 보내지는 않는다.','inquire'),opt('익숙한 길로 계속 다닌다','지도를 살펴보는 일은 미룬다.','keep')];
 else if(q.key==='news')options=[opt(ensure(l).hangul>0?'전에 익힌 글자로 짧은 기사를 읽는다':'기사를 읽어 주는 사람에게 뜻을 묻는다','읽거나 들은 내용을 나중에 다시 확인한다.',ensure(l).hangul>0?'read':'listen'),opt('기사에 나온 소식을 이웃과 대조한다','들은 말을 모두 사실로 여기지 않고 서로 아는 일을 묻는다.','listen'),opt('일을 마치러 돌아간다','신문을 읽는 일은 다음으로 미룬다.','keep')];
 else if(q.key==='letter')options=[opt('안부를 직접 적어 인편에 맡긴다','종이와 전달할 품을 들인다. 답장이 올 때까지는 시간이 걸린다.','letter'),opt('전할 말을 인편에 부탁한다','직접 편지를 쓰지는 않고 식구의 안부를 묻는다.','message'),opt('이번에는 소식을 보내지 않는다','당장 맡은 일을 이어 간다.','keep')];
 else if(q.key==='court'||q.key==='purge')options=[opt('맡았던 장부와 문서의 근거를 정리한다','베껴 적고 대조하는 데 시간과 품이 든다.','proof'),opt('맡은 일의 사정을 글로 밝혀 낸다','관직에서 한 일에 근거를 붙인다. 정치적 연루가 있으면 조사를 받을 수도 있다.','petition'),opt('관직을 내려놓고 고향으로 돌아간다','벼슬의 수입과 관직을 잃고 생업을 다시 꾸려야 한다.','retire')];
 else if(q.key==='tax')options=[opt('지난 납부 내역과 새 장부를 대조한다','장부를 확인해도 세금이 자동으로 줄거나 빚이 사라지지는 않는다.','proof'),opt(seeded?'곡식 두 몫을 따로 두어 납부를 준비한다':'따로 둘 곡식이 없어 납부 시기를 물어본다','지금 쓸 수 있는 곡식이 줄어든다. 나중에 실제 납부할 몫에 보탠다.',seeded?'reserve':'ask'),opt('밭일을 이어 가며 정해진 몫을 마련한다','일손을 더 들이지만 당장 세금이 면제되는 것은 아니다.','work')];
 else if(q.key==='hangul')options=[opt('하루 일을 마친 뒤 글자 소리를 익힌다','일을 마친 뒤에도 글자를 읽고 쓰는 연습을 이어 간다.','learn'),opt('아는 글자를 따라 적으며 천천히 익힌다','여러 번 적어 보고 나중에 다시 읽어 본다.','copy'),opt('당장은 생업을 이어 간다','배우는 시간을 내지 못한다.','keep')];
 else if(q.key==='farmbook'||q.key==='crop')options=[opt(paid&&seeded?'밭 한쪽에만 시험해 본다':'씨앗과 여비가 부족해 재배하는 모습을 살핀다','시험에는 돈과 씨앗이 필요하다. 수확은 나중에 확인한다.',paid&&seeded?'plant':'observe'),opt('이웃의 재배법을 보고 물길부터 손본다','품이 들지만 새 종자를 얻거나 수확한 것은 아니다.','observe'),opt('올해는 익숙한 작물을 지킨다','기존 농사를 이어 간다.','keep')];
 else if(q.key==='medicine')options=[opt('처방과 약재를 대조하며 옮겨 적는다','읽고 익히는 데 품이 든다. 책을 읽었다고 병이 곧 낫지는 않는다.','learn'),opt('쓰는 약재를 선배와 함께 살핀다','약재의 이름과 쓰임을 확인한다.','copy'),opt('지금 맡은 돌봄과 일을 이어 간다','새 처방 공부는 미룬다.','keep')];
 else options=[opt(paid?'비용을 들여 새 거래 길을 시험한다':'여비가 부족해 거래 방법부터 알아본다','들인 비용을 되찾을지는 거래 결과에 달려 있다.',paid?'trade':'observe'),opt('기존 거래처와 운송 일을 이어 간다','변화한 길과 값을 살피며 하던 일을 한다.','keep'),opt('짐을 나르는 일손을 보탠다','몸을 쓰는 일을 마치고 품삯을 받는다.','labor')];
 return {title:titles[q.key],description:descriptions[q.key],options,source:q.source};
}
function log(l,q,text,kind='choice'){
 l.logEvent(text,'joseon338-'+kind);l.log.at(-1).causeId='joseon338:'+q.id;
}
function cash(l,n){const j=J.ensure(l),before=j.capital;j.capital=clip(before+n,-120,600);if(l.money)l.money.netWorth=j.capital*100;return j.capital-before;}
function choose(l,index){
 const s=ensure(l),q=s?.active,p=prompt(l);if(!p||!Number.isInteger(index)||index<0||index>=p.options.length)return false;
 const action=p.options[index].action,j=J.ensure(l),v=V2.ensure(l);let text='',follow=null;
 if(action==='survey'){cash(l,-2);l.change({health:-2});text='지도에 표시된 나루와 고갯길을 찾아가 오가는 사람에게 길 사정을 물었다. 다녀온 곳을 종이에 적었다.';follow={type:'route',due:l.year+1,region:j.region};}
 if(action==='inquire'){l.change({knowledge:1});text='지도에서 고을 이름과 나루의 위치를 물었다. 직접 다녀온 길은 아니어서 운송을 맡기지는 않았다.';}
 if(action==='read'||action==='listen'){l.change({health:-1});text=action==='read'?'전에 배운 글자를 짚으며 신문의 짧은 기사를 읽었다. 뜻이 막히는 곳은 읽는 사람에게 물었다.':'신문을 읽어 주는 사람의 말을 듣고 기사에 나온 소식을 물었다.';follow={type:'news',due:l.year+1,topic:action};}
 if(action==='proof'){l.change({knowledge:2,health:-1});s.proof++;if(l.joseon325&&tied(l))l.joseon325.politics.risk=Math.max(0,l.joseon325.politics.risk-1);text='맡은 문서를 펼쳐 서로 다른 항목과 그 근거를 적어 두었다.';follow={type:'proof',due:l.year+1};}
 if(action==='petition'){l.change({knowledge:1,health:-1});text='맡은 일의 경위와 문서의 근거를 적어 관청에 냈다.';follow={type:'petition',due:l.year+1,risk:q.key==='purge'&&(tied(l)||V5.ensure(l).rank>=2)};}
 if(action==='letter'||action==='message'){const relative=V4.ensure(l).people.find(p=>p.alive&&p.birthYear<=l.year&&p.atHome===false);if(!relative)return false;cash(l,-Math.min(1,Math.max(0,j.capital)));l.change({health:-1});text=action==='letter'?relative.name+'에게 보낼 안부를 적어 인편에 맡겼다.':relative.name+'에게 전할 안부를 인편에 부탁했다.';follow={type:'letter',due:l.year+1,relativeId:relative.id};}
 if(action==='retire'){j.office=false;V5.ensure(l).rank=0;j.occupation='고향에서 생업을 꾸리는 전직 관리';V5.ensure(l).role=j.occupation;l.career=j.occupation;cash(l,-Math.min(3,Math.max(0,j.capital)));if(l.joseon325)l.joseon325.politics.stage='retired';text='관직을 내려놓고 고향으로 돌아갔다. 맡던 벼슬과 그 수입이 끊겼다.';}
 if(action==='reserve'){v.grain-=2;text='곡식 두 몫을 납부할 몫으로 따로 묶어 두었다. 끼니에 쓸 곳간의 곡식은 그만큼 줄었다.';follow={type:'reserve',due:l.year+1,amount:2,region:j.region};}
 if(action==='ask'){l.change({health:-1});text='따로 둘 곡식이 없어 관아에 납부 시기를 물었다. 내야 할 몫은 그대로 남았다.';}
 if(action==='work'){l.change({health:-2});text='밭에서 일하는 시간을 늘렸다. 정해진 납부 부담은 그대로였다.';}
 if(action==='learn'||action==='copy'){l.change({health:-1});text=q.key==='hangul'?'글자를 따라 적고 소리 내어 읽으며 저녁 시간을 보냈다.':'의서의 처방과 약재 이름을 대조해 종이에 옮겨 적었다.';follow={type:'study',due:l.year+2,topic:q.key};}
 if(action==='plant'){cash(l,-2);v.grain-=2;l.change({health:-2});text=q.key==='crop'?'씨줄기를 구해 밭 한쪽에 심었다. 여비와 씨앗 몫을 쓰고 물 빠짐을 살폈다.':'씨앗과 품을 들여 밭 한쪽에 배운 농법을 시험했다.';follow={type:'harvest',due:l.year+1,region:j.region,topic:q.key};}
 if(action==='observe'){l.change({knowledge:1,health:-1});text=q.key==='map'?'지도를 가진 사람에게 고을과 나루의 위치를 물었다. 직접 길을 확인하러 떠나지는 않았다.':q.key==='rail'||q.key==='coin'||q.key==='port'?'거래하는 곳을 찾아가 길과 값을 물었다. 거래에 돈을 넣지는 않았다.':'이웃이 밭을 돌보는 모습을 보고 물길과 흙을 살폈다. 새 작물을 심지는 않았다.';}
 if(action==='trade'){cash(l,-2);l.change({health:-1});text=q.key==='port'?'운반비를 들여 개항장으로 보내는 물건을 맡았다. 받을 값과 인도할 곳을 적어 두었다.':q.key==='rail'?'여비와 운반 비용을 들여 역까지 물건을 실어 나르는 거래를 맡았다.':'비용을 들여 동전으로 값을 받는 거래를 맡고 받을 몫을 적었다.';follow={type:'trade',due:l.year+1,region:j.region,topic:q.key};}
 if(action==='labor'){l.change({health:-2});const earned=cash(l,2);text='짐을 나르는 일을 마치고 품삯을 받았다. 무거운 짐을 지고 오가느라 어깨가 뻐근했다.';}
 if(action==='keep')text=({map:'지도를 살피는 일은 미루고 익숙한 길을 따라 물건을 날랐다.',news:'신문을 읽던 자리를 떠나 마치지 못한 일을 하러 돌아갔다.',port:'개항장으로 보내는 거래는 맡지 않고 기존 거래처와 일을 이어 갔다.',letter:'안부를 전하는 일은 미루고 맡은 생업을 이어 갔다.',hangul:'글 배우는 일은 미루고 당장 맡은 생업을 이어 갔다.',medicine:'새 처방을 옮겨 적는 일은 미루고 맡은 돌봄을 이어 갔다.',crop:'고구마 씨줄기를 사지 않고 익숙한 작물을 돌봤다.',farmbook:'새 농법을 시험하지 않고 하던 방식으로 밭을 돌봤다.',rail:'새 노선의 거래는 맡지 않고 기존의 운송 일을 이어 갔다.',coin:'동전으로 받는 새 거래는 맡지 않고 익숙한 거래처와 일을 이어 갔다.'})[q.key];
 log(l,q,text);s.decisions.push({...q,action,result:text,year:l.year});s.decisions=s.decisions.slice(-60);
 if(follow)s.followups.push({amount:0,risk:false,region:null,relativeId:null,topic:null,...follow,id:q.id,key:q.key,source:q.source,title:q.title});
 s.active=null;l.pending=null;open(l);return true;
}
function settle(l,s){
 if(!l.alive)return;
 const due=s.followups.filter(f=>f.due<=l.year);s.followups=s.followups.filter(f=>f.due>l.year);
 for(const f of due){const j=J.ensure(l),v=V2.ensure(l);let text;
  if(!valid(l)){
   if(f.type==='reserve')v.grain=clip(v.grain+f.amount,0,200);
   log(l,f,'거처와 처지가 달라져 전에 준비하던 일을 이어 가지 못했다.','followup');continue;
  }
  if(f.type==='route'){if(j.region!==f.region||!trader(l))text='고을이나 생업이 바뀌어 적어 둔 운송 길을 다시 확인하지 못했다.';else {s.routes=s.routes||[];s.routes.push({region:j.region,year:l.year,kind:'map'});s.routes=s.routes.slice(-8);l.change({knowledge:2});text='전에 적어 둔 길을 다시 다녀와 나루와 고갯길의 사정을 고쳤다. 이 고을에서 짐을 나를 때 참고할 만한 기록이 남았다.';}}
  if(f.type==='news'){l.change({knowledge:f.topic==='read'?2:1});text=f.topic==='read'?'전에 읽었던 기사를 다시 펼쳐 모르는 말을 확인했다. 더듬어 읽던 대목이 전보다 수월하게 읽혔다.':'신문에서 들었던 소식을 이웃에게 다시 물었다. 전해 들은 말과 기사에 적힌 내용을 구분해 보았다.';}
  if(f.type==='letter'){const person=V4.ensure(l).people.find(p=>p.id===f.relativeId);if(!person||!person.alive)text='안부를 전하려던 식구는 세상을 떠났다. 보냈던 말에 답을 듣지 못했다.';else if(person.atHome!==false)text=person.name+'은 지금 한집에 머물고 있다. 전에 전하려던 말을 얼굴을 보고 나누었다.';else if(roll(l,f.id+'letter')<.7){person.relation=clip((person.relation||50)+3,0,100);l.change({bonds:2});text=person.name+'의 안부가 인편으로 돌아왔다. 멀리 있어도 서로의 소식을 이어 갔다.';}else text='전에 보낸 안부에 아직 답이 오지 않았다. 인편이 닿았는지 기다렸다.';}
  if(f.type==='proof')text='새로 받은 문서와 전에 적어 둔 내용을 나란히 놓고 맞춰 보았다. 다른 항목에는 근거가 된 기록을 덧붙였다.';
  if(f.type==='petition'){
   if(f.risk&&j.office&&roll(l,f.id+'trial')<Math.max(.15,.35-s.proof*.04)&&B){const b=B.ensure(l);b.politics.stage='trial';b.politics.risk=Math.max(2,b.politics.risk);B.queue(l,b,'trial');text='전에 낸 글의 경위를 확인하라는 요구가 왔다. 문서와 증언을 갖추어 조사에 답해야 했다.';}
   else text='전에 낸 글의 사본을 받아 보관했다. 관직이나 세금에 새로 내려진 처분은 없었다.';
  }
  if(f.type==='reserve'){if(j.region!==f.region){v.grain=clip(v.grain+f.amount,0,200);text='고을을 옮겨 전에 따로 묶어 둔 곡식을 다시 살림에 보탰다.';}
   else{const actual=j.economy?.lastCosts?.levies||0,used=Math.min(f.amount,Math.max(0,actual));cash(l,used);v.grain=clip(v.grain+f.amount-used,0,200);text=used?'따로 둔 곡식을 납부에 보탰다. 이번 살림 장부에서 이미 나간 납부 비용 중 '+used+'만큼을 그 곡식으로 대신했다.':'이번 장부에 대신 낼 납부액이 없어 따로 둔 곡식을 곳간으로 돌렸다.';}}
  if(f.type==='study'){const applies=f.topic==='hangul'||/의관|의술|의원|약재/.test(job(l));if(applies){l.change({knowledge:2});if(f.topic==='hangul')s.hangul=clip(s.hangul+1,0,3);else if(l.joseon6?.career?.code==='healer')l.joseon6.career.practice=clip(l.joseon6.career.practice+1,0,100);text=f.topic==='hangul'?'전에 익힌 글자를 다시 읽고 짧은 말을 적어 보았다. 여러 번 따라 쓰던 글자가 조금씩 눈에 들어왔다.':'옮겨 적었던 처방을 다시 펼쳐 약재의 이름과 쓰임을 대조했다.';}else text='생업이 달라져 의서를 함께 읽던 공부는 이어 가지 못했다.';}
  if(f.type==='harvest'){
   if(j.region!==f.region||!farmer(l))text='밭을 떠나 전에 시험하던 작물의 수확을 거두지 못했다.';
   else if(l.year<=v.scarcityUntil||l.year<=j.hardshipUntil||(l.joseon13?.fields||0)>0||roll(l,f.id+'harvest')<.3){l.change({health:-1});text='시험한 밭의 작황이 좋지 않았다. 씨앗과 품을 들였지만 곳간에 보탤 수확을 거두지 못했다.';}
   else {const gain=Math.min(4,200-v.grain);v.grain+=gain;text=gain?'시험한 밭에서 수확을 거두어 먹을거리를 곳간에 보탰다.':'시험한 밭의 작물을 거두었다. 곳간이 가득 차 더 쌓아 둘 자리는 없었다.';}
  }
  if(f.type==='trade'){
   if(j.region!==f.region||!trader(l))text='고을이나 생업이 달라져 전에 맡으려던 거래를 마무리하지 못했다. 들인 비용은 돌아오지 않았다.';
   else if(roll(l,f.id+'trade')<(experience(l) ? .2 : .35)){cash(l,-1);text='거래 물량이 기대에 못 미쳐 들인 비용을 건지지 못했다. 추가 운반비도 들었다.';}
   else {const used=experience(l);cash(l,4);s.routes=s.routes||[];s.routes.push({region:j.region,year:l.year,kind:f.topic});s.routes=s.routes.slice(-8);text=used?'앞서 익힌 이 고을의 운송 사정을 참고해 물건을 넘겼다. 받을 값과 들인 비용을 맞춰 정산했다.':'전에 맡은 거래를 마무리하고 물건 값과 운반 비용을 정산했다. 다음에 운반비를 물어볼 거래처가 생겼다.';}
  }
  if(text)log(l,f,text,'followup');
 }
}
function warYear(l){
 if(!valid(l)||!War||J.ensure(l).active?.kind==='war')return;const s=War.ensure(l);
 const candidates={1592:['imjinAlarm','imjinCapital','imjinNorth','militia1593'],1597:['jeongyu1597'],1627:['jeongmyo1627','jeongmyoNews'],1636:['byeongja1636','byeongjaProvince']}[l.year];
 if(!candidates||[s.active,...s.queue].some(q=>q?.year===l.year))return;
 const event=candidates.map(id=>War.EVENTS.find(e=>e.id===id)).find(e=>e&&War.allowed(l,e,s));
 if(!event||s.seen.includes(event.id))return;
 s.seen.push(event.id);s.queue.unshift({id:l.year+'-'+event.id,eventId:event.id,year:l.year});s.queue=s.queue.slice(0,4);
}
function open(l){
 if(!valid(l)||l.pending)return;
 const war=l.joseon13;if(war&&!war.active&&war.queue.length){while(war.queue.length){const q=war.queue.shift(),event=War.EVENTS.find(e=>e.id===q.eventId);if(!event||q.year<l.year-1||!War.allowed(l,event,war))continue;war.active=q;l.pending='joseon13:'+q.id;return;}}
 const s=ensure(l);if(s.active){if(eligibility(l,s.active.key)){l.pending='joseon338:'+s.active.id;return;}s.active=null;}
 while(s.queue.length){const q=s.queue.shift();if(q.year<l.year-1||!eligibility(l,q.key))continue;s.active=q;l.pending='joseon338:'+q.id;break;}
}
function processYear(l){
 const s=ensure(l);if(!s||!l.alive||s.processedYear>=l.year)return;s.processedYear=l.year;
 settle(l,s);if(!valid(l))return;warYear(l);
 for(const item of opportunities(l)){
  const token=item.key==='tax'||item.key==='court'||item.key==='purge'?item.key+'-'+l.year:item.key;
  if(s.seen.includes(token)||s.queue.length>=4)continue;s.seen.push(token);
  s.queue.push({id:token+'-'+l.year,key:item.key,year:l.year,title:item.fact.title,source:item.fact.source});
 }
 s.queue=s.queue.slice(-4);open(l);
}
function matchEntry(l,e){if(!/^joseon338-(?:choice|followup)$/.test(e?.kind||''))return null;return ensure(l)?.decisions.find(d=>'joseon338:'+d.id===e.causeId)||null;}
function hydrate(l,data){
 const s=ensure(l),o=data?.historyLife338;if(!s||!o||o.version!==1){if(s)s.processedYear=l.year;if(typeof l.pending==='string'&&l.pending.startsWith('joseon338:'))l.pending=null;return;}
 s.routes=Array.isArray(o.routes)?o.routes.filter(r=>r&&typeof r.region==='string'&&Number.isInteger(r.year)&&r.year>=l.birthYear&&r.year<=l.year&&['map','port','coin','rail'].includes(r.kind)).slice(-8).map(r=>({region:r.region,year:r.year,kind:r.kind})):[];
 s.hangul=clip(Number(o.hangul)||0,0,3);s.proof=clip(Number(o.proof)||0,0,100);
 const validQ=q=>q&&Object.hasOwn(titles,q.key)&&typeof q.id==='string'&&/^[a-z0-9-]{1,75}$/.test(q.id)&&Number.isInteger(q.year)&&q.year>=l.birthYear&&q.year<=l.year&&typeof q.source==='string'&&/^https:\/\/(?:sillok\.history\.go\.kr|contents\.history\.go\.kr|encykorea\.aks\.ac\.kr|theme\.archives\.go\.kr|www\.korean\.go\.kr)\//.test(q.source);
 const clean=q=>({id:q.id,key:q.key,year:q.year,title:String(q.title||'').slice(0,100),source:q.source});
 s.processedYear=clip(Number(o.processedYear)||l.year,l.birthYear,l.year);s.seen=Array.isArray(o.seen)?o.seen.filter(x=>typeof x==='string').slice(-120):[];
 s.queue=Array.isArray(o.queue)?o.queue.filter(validQ).map(clean).slice(-4):[];
 s.active=validQ(o.active)&&data.pending==='joseon338:'+o.active.id&&eligibility(l,o.active.key)?clean(o.active):null;if(s.active)l.pending='joseon338:'+s.active.id;else if(typeof l.pending==='string'&&l.pending.startsWith('joseon338:'))l.pending=null;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(validQ).slice(-60).map(q=>({...clean(q),action:String(q.action||'').slice(0,20),result:String(q.result||'').slice(0,220)})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(f=>f&&Object.hasOwn(titles,f.key)&&typeof f.id==='string'&&['letter','proof','petition','reserve','study','harvest','trade','route','news'].includes(f.type)&&s.decisions.some(d=>d.id===f.id&&d.key===f.key)&&Number.isInteger(f.due)&&f.due>=l.birthYear&&f.due<=l.year+2).slice(-30).map(f=>({...f,relativeId:typeof f.relativeId==='string'?f.relativeId.slice(0,70):null,amount:f.type==='reserve'?2:0,risk:f.risk===true,region:typeof f.region==='string'?f.region:null,topic:Object.hasOwn(titles,f.topic)||['read','listen'].includes(f.topic)?f.topic:null})):[];

}
function install(){const L=root?.OneLifeSim?.Life;if(!L||!Cal||L.prototype.__historyLife338)return false;
 const tick=L.prototype.tick,get=L.prototype.getChoice,chooseOld=L.prototype.choose,reflect=L.prototype.reflect,snapshot=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){if(this.alive&&!this.pending){processYear(this);if(this.pending)return true;}const y=this.year,result=tick.call(this);if(result&&this.year!==y&&this.alive)processYear(this);return result;};
 L.prototype.getChoice=function(){return typeof this.pending==='string'&&this.pending.startsWith('joseon338:')?prompt(this):get.call(this);};
 L.prototype.choose=function(i){if(typeof this.pending==='string'&&this.pending.startsWith('joseon338:'))return choose(this,i);const result=chooseOld.call(this,i);if(result)open(this);return result;};
 L.prototype.reflect=function(t){const result=reflect.call(this,t);if(result)open(this);return result;};
 L.prototype.snapshot=function(){const data=snapshot.call(this);if(J.isJoseon(this))data.historyLife338=JSON.parse(JSON.stringify(ensure(this)));return data;};
 L.restore=function(data){const l=restore.call(this,data);if(l&&J.isJoseon(l))hydrate(l,data);return l;};
 Object.defineProperty(L.prototype,'__historyLife338',{value:true});return true;
}
install();return Object.freeze({ensure,eligibility,opportunities,prompt,choose,processYear,settle,warYear,matchEntry,hydrate,install});
});
