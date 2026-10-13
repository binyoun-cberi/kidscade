/* One Life — Joseon society: distinct family backgrounds, callings, obligations and local dangers.
 * Narrative weights and outcomes are invented for play; they are not population estimates.
 * Lives born before 1900 retain their family identity after the legal status reforms.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon4);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon5=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V4){
'use strict';
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function dice(seed,salt){
 let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);
 x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;
}
const coastal=new Set(['경상도','전라도','황해도']);
const border=new Set(['평안도','함경도']);
const isEnslaved=origin=>['사노비','공노비'].includes(origin);
const isRoyal=origin=>origin==='왕실 종친';
const ORIGINS={
 '사노비':{label:'사노비 가계',trade:'주인집의 농사와 집안일',duty:'주인집에 정해진 노동을 바침'},
 '공노비':{label:'공노비 가계',trade:'관아의 잡무와 기술 노동',duty:'관아의 지정된 역을 담당'},
 '백정':{label:'차별받는 백정 가계',trade:'도축과 가죽 손질',duty:'마을의 생업을 잇되 배척과 차별을 겪음'},
 '왕실 종친':{label:'왕실 종친 가계',trade:'왕실의 예법과 교육',duty:'왕실의 규범과 정치적 위험'},
 '문반 양반':{label:'문반과 학문을 이어 온 가계',trade:'서당과 글공부',duty:'가문의 학문과 관직 진출의 압박'},
 '무반 양반':{label:'무반의 일을 이어 온 가계',trade:'무예와 군무',duty:'군사 훈련과 집안 책임'},
 '몰락 양반':{label:'형편이 기운 양반 가계',trade:'농사와 글공부',duty:'생업과 가문의 체면 사이의 갈등'},
 '역관 가계':{label:'역관 가계',trade:'외국어와 통역',duty:'외국어 학습과 공무 준비'},
 '의관 가계':{label:'의관 가계',trade:'의술과 약재',duty:'환자 돌봄과 의료 공부'},
 '서리 가계':{label:'서리·아전 가계',trade:'관아 장부와 행정 실무',duty:'고을의 장부와 문서 처리'},
 '관청 장인':{label:'관청 장인 가계',trade:'관청 물품 제작',duty:'관청에서 맡긴 물건의 제작'},
 '소작 농가':{label:'땅을 빌려 짓는 농가',trade:'소작과 품팔이',duty:'소작료와 집안의 끼니 마련'},
 '자작 농가':{label:'자기 땅을 가꾸는 농가',trade:'농사와 농기구 손질',duty:'곡식 마련과 세금 부담'},
 '보부상 가계':{label:'보부상 가계',trade:'장시를 오가는 보부상',duty:'이동과 물품 운반'},
 '상인 가계':{label:'상인 가계',trade:'장터에서의 거래',duty:'재고와 가격, 물품 운송'},
 '어부 가계':{label:'어부 가계',trade:'어업과 포구의 일',duty:'물때와 날씨, 어획물 보관'},
 '주막 가계':{label:'주막을 꾸리는 가계',trade:'주막의 음식과 손님맞이',duty:'먹을거리·잠자리·손님 응대'},
 '도공 가계':{label:'도공 가계',trade:'도자기와 가마의 일',duty:'흙·땔감·가마의 온도'},
 '대장장이 가계':{label:'대장장이 가계',trade:'쇠를 달구는 대장간',duty:'쇠와 숯, 농기구 제작'},
 '목수 가계':{label:'목수 가계',trade:'목재와 집짓기',duty:'집과 배, 나무 손질'},
 '사찰 주변 가계':{label:'사찰과 인연이 있는 가계',trade:'사찰의 살림과 배움',duty:'사찰의 일과 속세의 집안일'},
 '수군 가계':{label:'수군의 일을 겪은 가계',trade:'수군과 해안 방비',duty:'바닷길과 해안 방비'}
};
function weighted(seed,salt,items){
 const sum=items.reduce((n,entry)=>n+entry[1],0);
 let p=dice(seed,salt)*sum;
 for(const [name,weight] of items){p-=weight;if(p<0)return name;}
 return items.at(-1)[0];
}
function originFor(life,j){
 const seed=life.seed;
 if(j.birthStatus==='천민')return weighted(seed,1901,[['사노비',68],['공노비',32]]);
 if(j.birthStatus==='양반'){
  // Even a royal lineage is not an automatic king. Only a later conditional
  // succession event can possibly confer that office.
  if(dice(seed,1902)<.003)return '왕실 종친';
  return weighted(seed,1903,[['문반 양반',37],['무반 양반',20],['몰락 양반',43]]);
 }
 if(j.birthStatus==='중인')return weighted(seed,1904,[['역관 가계',24],['의관 가계',18],['서리 가계',40],['관청 장인',18]]);
 const weights=[['소작 농가',31],['자작 농가',29],['상인 가계',9],['보부상 가계',6],['주막 가계',3],
  ['도공 가계',4],['대장장이 가계',4],['목수 가계',4],['사찰 주변 가계',2],
  ['백정',1],['수군 가계',2]];
 if(coastal.has(j.region))weights.push(['어부 가계',9]);
 else weights.push(['어부 가계',1]);
 return weighted(seed,1905,weights);
}
function make(life){
 const j=J.ensure(life),origin=originFor(life,j),info=ORIGINS[origin];
 const legal=life.year>=1894?'법적 신분 구별 폐지':isEnslaved(origin)?'천인':'양인';
 const s={version:1,origin,originLabel:info.label,trade:info.trade,
  legal,role:'',duty:info.duty,serviceYears:0,burdens:[],memories:[],decisions:[],
  processedYear:life.year,queue:[],active:null,seen:[],followups:[],rank:0,royalClaim:false,
  freed:life.year>=1894&&isEnslaved(origin),monastic:false,inspector:false,complaints:0};
 if(s.freed){s.originLabel='옛 '+info.label;s.trade='품팔이와 가족의 살림';}
 // Historical origin sets starting conditions only, never reapplies them to
 // an adult restoring a saved game.
 if(life.age===0){
  if(origin==='몰락 양반')j.capital=Math.min(j.capital,30);
  if(origin==='소작 농가')j.land=Math.max(1,j.land);
  if(origin==='어부 가계'||origin==='주막 가계')j.land=Math.min(j.land,1);
 }
 if(life.age===0)life.logEvent(s.originLabel+'에서 태어났다. '+(s.freed?'법적 노비제는 이미 폐지되었지만 가족의 처지는 쉽게 바뀌지 않았다.':info.duty+'이 집안의 생활과 가까웠다.'),'joseon5-family');
 if(life.money&&life.year<1900)life.money.netWorth=j.capital*100;
 return s;
}
function ensure(life){
 if(!J?.isJoseon(life))return null;
 return life.joseon5||(life.joseon5=make(life));
}
function remember(life,s,text,kind='joseon5-memory'){
 life.logEvent(text,kind);s.memories.push(text);s.memories=s.memories.slice(-28);
}
function offer(life,s,type,title,choices){
 const id=life.year+'-'+type;
 if(s.seen.includes(id)||s.queue.some(x=>x.id===id)||s.active?.id===id)return;
 s.seen.push(id);s.queue.push({id,type,title,year:life.year,choices});s.queue=s.queue.slice(-7);
 promote(life,s);
}
function promote(life,s){
 if(!s||s.active||life.pending||!life.alive||!J.inOldEra(life)||!s.queue.length)return;
 s.active=s.queue.shift();life.pending='joseon5:'+s.active.id;
}
const option=(label,action,description,effects={},cost=0,grain=0)=>({label,action,note:description,effects,cost,grain});
function roleChoices(s,j,life){
 if(isEnslaved(s.origin)&&!s.freed)return [
  option('맡은 노동을 버티며 몸을 돌본다','endure','그날그날의 일을 이어 간다.',{health:-1,bonds:2}),
  option('함께 일하는 이에게 배운다','skill','기술을 익혀 나중의 길을 준비한다.',{knowledge:5,bonds:2}),
  option('속량의 길을 알아본다','freedom','주인 또는 관아와 교섭하지만 허락을 장담할 수 없다.',{knowledge:3},8)];
 if(isRoyal(s.origin))return [
  option('왕실의 예법과 글을 익힌다','courtstudy','가문 안에서 배움을 쌓는다.',{knowledge:5}),
  option('궁중의 일과 권력에서 거리를 둔다','withdraw','정치적 위험을 피해 조용히 지낸다.',{happiness:3,bonds:2}),
  option('나라의 정무를 배워 본다','courtduty','왕실 사람으로서 정치를 가까이에서 배운다.',{knowledge:4,health:-1})];
 if(s.monastic||s.role==='승려')return [
  option('사찰의 불경을 배우고 수행한다','scripture','하루의 일과와 공부를 이어 간다.',{knowledge:4,happiness:3}),
  option('마을 사람의 일을 돕는다','templeaid','신도와 이웃의 고민을 듣는다.',{bonds:5,health:-1}),
  option('사찰의 살림과 토지를 맡아본다','templework','생계와 수행 사이의 균형을 살핀다.',{knowledge:3},2)];
 if(s.role==='어부'||s.origin==='어부 가계')return [
  option('물때를 살펴 고기를 잡는다','fish','수확은 바람과 물결에 따라 달라진다.',{health:-2,knowledge:2}),
  option('배와 그물을 손질한다','repairboat','다음 조업의 위험을 줄인다.',{knowledge:3},4),
  option('포구에서 물건을 교환한다','fishtrade','고기를 다른 생필품으로 바꾼다.',{bonds:3})];
 if(s.role==='주모'||s.origin==='주막 가계')return [
  option('손님에게 밥과 잠자리를 내준다','inn','먹을 것을 들여 손님을 맞는다.',{bonds:4},3,2),
  option('길손들의 사정을 듣는다','travelers','멀리서 온 사람의 이야기를 듣는다.',{knowledge:3,bonds:3}),
  option('주막에 쓸 재료를 마련한다','supplies','장터와 농가에서 먹을거리를 구한다.',{knowledge:2},4)];
 if(['역관','의관','서리'].includes(s.role)||['역관 가계','의관 가계','서리 가계'].includes(s.origin)){
  return [
   option('전문 지식과 글을 더 익힌다','specialstudy','실무와 배움을 함께 이어 간다.',{knowledge:5},3),
   option('관아나 관청에서 맡은 일을 한다','service','기록·통역·진료의 책임을 맡는다.',{health:-1,bonds:3}),
   option('가르치거나 기록을 정리한다','record','다음 사람이 배울 길을 남긴다.',{knowledge:3,bonds:3})];
 }
 if(['도공','대장장이','목수'].includes(s.role)||/도공|대장장이|목수|장인/.test(s.origin))return [
  option('맡은 물건을 정성껏 만든다','craft','재료와 시간을 아끼며 물건을 만든다.',{knowledge:3,health:-1}),
  option('도구와 재료를 손본다','repairtool','다음 작업을 위해 도구를 손질한다.',{knowledge:3},3),
  option('제자에게 손기술을 알려 준다','apprentice','내가 아는 기술을 다른 사람에게 나눈다.',{bonds:5,knowledge:2})];
 if(['상인','보부상'].includes(s.role)||/상인|보부상/.test(s.origin))return [
  option('장터에서 물건을 사고판다','market','물건값과 오가는 길을 살핀다.',{knowledge:2,bonds:2}),
  option('물품을 싣고 다른 고을로 간다','travel','길을 떠나며 도둑과 악천후를 경계한다.',{health:-2,knowledge:3},4),
  option('이웃 장사꾼과 거래를 나눈다','partnership','서로 돕지만 이익을 나누어야 한다.',{bonds:5})];
 if(s.origin==='백정')return [
  option('가죽과 고기 손질 기술을 이어 간다','craft','편견 속에서도 일의 숙련을 쌓는다.',{knowledge:3}),
  option('일에 필요한 물건을 장터에 내놓는다','market','거래처를 구하며 차별을 견뎌야 한다.',{bonds:3}),
  option('서로 도울 이웃을 찾는다','partnership','어려운 일을 함께 해나갈 관계를 만든다.',{bonds:5})];
 if(s.role==='수군'||s.origin==='수군 가계')return [
  option('해안 경비와 훈련을 맡는다','guard','군무로 생업을 비울 때가 있다.',{health:-2,knowledge:2}),
  option('배와 창고를 수선한다','repairboat','군영의 일손을 보탠다.',{knowledge:3},2),
  option('가족에게 소식을 전한다','home','멀리 있어도 집안의 안부를 챙긴다.',{bonds:4})];
 return [
  option('자신이 맡은 생업을 이어 간다','work','한 해의 살림을 꾸리고 다음 철을 준비한다.',{health:-1,knowledge:2}),
  option('이웃과 품을 나눈다','mutual','오고 가는 도움과 관계를 소중히 여긴다.',{bonds:6}),
  option('기술이나 글을 더 익힌다','learn','다음 선택의 폭을 넓혀 본다.',{knowledge:4},3)];
}
function taxChoices(type){
 if(type==='military')return [
  option('군역이나 군포 부담을 감당한다','payservice','군사와 나라의 의무가 생업을 흔든다.',{health:-2},5),
  option('대신할 품이나 비용을 구한다','arrange','다른 사람과 의논하지만 비용이 든다.',{bonds:2},7),
  option('형편을 알리고 부담을 줄여 달라 청한다','petition','요구가 받아들여진다는 보장은 없다.',{knowledge:2,bonds:1})];
 if(type==='tribute')return [
  option('내야 할 공물 또는 대동미를 마련한다','tribute','지역과 시기에 따른 물품·쌀 납부 부담을 감당한다.',{health:-1},3,6),
  option('이웃과 필요한 몫을 함께 마련한다','sharetribute','함께 힘을 모으지만 서로 부담을 나눈다.',{bonds:5},2,3),
  option('납부 방식과 부담을 알아본다','replace','고을과 시기에 따라 납부 규정이 다르다.',{knowledge:3},5)];
 return [
  option('공사에 나가 품을 보탠다','labor','노역으로 집안일을 돌볼 시간이 줄어든다.',{health:-4}),
  option('가족과 일손을 나누어 맡는다','familylabor','내가 없는 동안 살림이 이어지도록 부탁한다.',{bonds:4,health:-2},2),
  option('고을에 사정을 아뢴다','petition','형편을 설명해 보지만 결과는 장담하지 못한다.',{knowledge:2})];
}
function troubleChoices(type){
 if(type==='raid')return [
  option('가족과 몸을 피한다','flee','살림을 두고 이동할 수 있다.',{health:2,bonds:2},8),
  option('물건과 배를 숨기며 대비한다','hide','재산을 지키려 하지만 위험이 남는다.',{knowledge:3,health:-2},5),
  option('고을 사람과 함께 소식을 살핀다','warn','안전을 위한 관계와 준비를 만든다.',{bonds:6,health:-1})];
 if(type==='corruption')return [
  option('관아에 부담의 내역을 따져 묻는다','appeal','억울함을 알리지만 보복의 위험이 있다.',{knowledge:2,health:-1}),
  option('이웃과 증언을 모은다','witness','서로의 이야기를 모아 부당함을 기록한다.',{bonds:5,knowledge:2}),
  option('당장의 가족 생계를 우선한다','survive','억울해도 우선 살림을 지키기로 한다.',{health:2},4)];
 if(type==='inspector')return [
  option('고을의 실정을 살핀다','inspect','숨겨진 일을 알아보고 글과 증언을 모은다.',{knowledge:4,health:-2}),
  option('나쁜 관행을 바로잡도록 명한다','reform','기존의 권세와 갈등을 감수한다.',{bonds:4,health:-3}),
  option('억울한 이의 사정을 듣는다','hear','많은 사람의 이야기에서 증거를 찾는다.',{bonds:5,knowledge:2})];
 return [
  option('내가 할 수 있는 일을 이어 간다','work','세상의 변화 속에도 생업을 지킨다.',{health:-1}),
  option('이웃의 이야기를 듣는다','listen','함께 살아가는 이의 사정을 헤아린다.',{bonds:4}),
  option('집안의 앞날을 헤아린다','plan','어떤 길이 가능한지 계획을 세운다.',{knowledge:3})];
}
function prepare(life,s){
 const j=J.ensure(life),age=life.age,origin=s.origin;
 if(life.year===1801&&origin==='공노비'&&!s.freed&&dice(life.seed,1801)<.58){
  // 1801 affected major palace and central-office slave registers, not all
  // government and local bonded workers. This fictional branch is only a
  // scenario illustrating the reform's uneven reach.
  s.freed=true;s.legal='양인';
  s.trade='품팔이와 가족의 살림';
  remember(life,s,'내노비·시노비 혁파의 영향이 이 집안에도 미쳤다. 관아에 남은 노비가 모두 같은 처지가 된 것은 아니었다.');
 }
 if(life.year>=1894&&s.legal!=='법적 신분 구별 폐지'){
  s.legal='법적 신분 구별 폐지';
  if(isEnslaved(origin)&&!s.freed){s.freed=true;s.trade='품팔이와 가족의 살림';remember(life,s,'법적 노비제가 폐지되었다. 하지만 그동안의 예속과 차별이 곧바로 사라지지는 않았다.');}
 }
 if([18,27,39,54].includes(age))offer(life,s,'living','올해 나의 생업',roleChoices(s,j,life));
 const eligible=age>=16&&age<=58&&life.gender==='남자'&&s.legal==='양인'&&!isRoyal(origin);
 if(eligible&&age===22)offer(life,s,'military','군역과 군포의 부담',taxChoices('military'));
 if(age===34&&!isRoyal(origin)&&!(isEnslaved(origin)&&!s.freed)&&life.year<1894)offer(life,s,'tribute',life.year>=1750?'대동미와 고을의 조세 부담':'공납과 고을의 세금 부담',taxChoices('tribute'));
 if(age===42&&!isRoyal(origin)&&life.year<1894)offer(life,s,'labor','관아에서 일손을 부르는 날',taxChoices('labor'));
 // Fictional personal encounters, not a statement that a real raid happened
 // in the specified village or year. Regional exposure and era alter the chance.
 if(age>=13&&age<=58&&life.year<1600&&age%11===3){
  const risky=coastal.has(j.region)?'왜구 등 해안 약탈 소식':border.has(j.region)?'여진 세력의 국경 침입 소식':null;
  if(risky&&dice(life.seed,life.year+1720)<(coastal.has(j.region)?.28:.21)){
   offer(life,s,'raid',risky+'이 전해진 고을',troubleChoices('raid'));
  }
 }
 if(age>=19&&age<=70&&age%17===2&&life.year<1894&&dice(life.seed,life.year+1739)<.32&&!isRoyal(origin))
  offer(life,s,'corruption','고을의 부당한 징수와 관리의 횡포',troubleChoices('corruption'));
 // The royal bloodline alone does not confer a reign.
 if(isRoyal(origin)&&life.gender==='남자'&&!s.royalClaim&&age===26&&dice(life.seed,1908)<.018)
  offer(life,s,'succession','왕실의 후계 문제에 이름이 오르다',[
   option('왕위 계승의 책임을 받아들인다','throne','왕위는 드물고 위험한 자리다.',{health:-3,knowledge:3}),
   option('왕실 친족으로 남는다','relative','권력보다 자신의 일상을 택한다.',{bonds:4}),
   option('정치와 거리를 둔다','withdraw','조정에서 거리를 두고 살기로 한다.',{health:2})]);
 if(j.office&&s.rank>=2&&age===42&&dice(life.seed,1909)<.06){
  s.rank=4;s.role='대신';j.occupation='조정의 대신';
  remember(life,s,'벼슬길에서 중요한 직책을 맡아 조정의 일을 헤아리게 되었다. 그러나 모든 대신이 나라의 정치를 마음대로 움직일 수 있는 것은 아니었다.');
 }
 if(s.rank>=2&&!s.inspector&&age>=29&&age<=55&&age%13===3&&dice(life.seed,life.year+1791)<.045)
  offer(life,s,'inspector','어사로 고을의 일을 살필 기회',troubleChoices('inspector'));
}
const LATER={
 fish:'지난번 출항에서 겪은 물때와 바람을 기억하며 다음 조업을 준비했다.',
 repairboat:'그때 고친 배와 그물이 이후의 일에 보탬이 되었다.',
 inn:'밥과 잠자리를 내주었던 손님이 다시 주막을 찾았다.',
 travelers:'주막에서 들은 먼 고을의 소식이 새로운 사람과 이야기할 때 도움이 되었다.',
 craft:'그때 만든 물건이 계속 쓰이며 손기술을 인정받았다.',
 specialstudy:'꾸준히 익힌 학문과 기술이 관청의 업무를 이해하는 데 도움이 되었다.',
 service:'관청에서 맡은 일을 마치고 다음 기록과 일을 준비했다.',
 scripture:'사찰에서 배운 글과 수행의 일과가 오래 남았다.',
 templeaid:'지난날 도움을 주었던 마을 사람을 다시 만났다.',
 military:'군역을 겪은 뒤에도 생업과 집안의 빈자리를 다시 채워야 했다.',
 payservice:'그때의 군역과 비용 부담은 다음 계절의 살림에도 영향을 주었다.',
 arrange:'군역을 대신할 길을 구했던 일이 집안 사람들의 기억에 남았다.',
 tribute:'공납과 세금에 쓴 물품을 마련하느라 한 해의 살림을 다시 정리했다.',
 sharetribute:'함께 공물을 마련했던 이웃과 이후에도 품앗이를 이어 갔다.',
 replace:'납부할 물품을 알아보며 고을의 제도와 사람들을 더 알게 되었다.',
 labor:'공사와 노역에 나갔던 사이 미처 끝내지 못한 생업을 돌아보았다.',
 familylabor:'일손을 나누었던 가족이 서로의 수고를 기억하고 있었다.',
 appeal:'관아의 부당한 부담을 알렸지만 고을의 변화는 더딜 수밖에 없었다.',
 witness:'이웃과 나눴던 증언이 고을에서 다시 이야기되었다.',
 survive:'살림을 지키려 조심했던 그때를 돌아보았다.',
 flee:'피란 뒤에도 고향의 집과 생업을 다시 꾸려야 했다.',
 warn:'위험에 대비하자고 모였던 이웃과 소식을 주고받았다.',
 hide:'숨겨 둔 물건을 살피며 돌아온 일상을 정리했다.',
 inspect:'어사로 살폈던 고을의 백성들이 이후 어떤 일을 겪었는지 생각했다.',
 reform:'고을의 부당한 관행을 바로잡는 일은 하루에 끝나지 않았다.',
 hear:'사정을 들었던 사람에게서 이후의 소식이 전해졌다.',
 freedom:'속량의 길을 알아보았던 일은 이후의 생계와 관계에도 영향을 주었다.',
 throne:'왕위에 오른 뒤 나라의 일과 가족의 책임이 더 무겁게 다가왔다.'
};
function yearEnd(life,s){
 const j=J.ensure(life);
 s.processedYear=life.year;
 if(!life.alive||!J.inOldEra(life))return;
 for(const follow of s.followups.filter(x=>x.year<=life.year)){
  const text=LATER[follow.action]||'그 무렵 택했던 일을 몇 해 뒤 다시 떠올렸다.';
  life.logEvent(text,'joseon5-followup');
  life.log.at(-1).causeId='joseon5:'+follow.id;
  s.memories.push(text);
 }
 s.memories=s.memories.slice(-28);
 s.followups=s.followups.filter(x=>x.year>life.year);
 prepare(life,s);
 if(!s.monastic&&s.role==='승려')s.monastic=true;
 if(s.monastic&&life.age%7===0&&life.age>20)remember(life,s,'사찰에서 공부와 노동, 공양을 나누며 한 해를 보냈다.');
 if(isEnslaved(s.origin)&&!s.freed&&life.age>12&&life.age%8===0){s.serviceYears+=8;remember(life,s,'주인이나 관아에서 맡긴 일을 계속했다. 하고 싶은 일을 스스로 정할 자유는 제한되어 있었다.');}
}
function prompt(life){
 const s=ensure(life),q=s?.active;
 if(!q)return null;
 const grain=V2.ensure(life)?.grain||0;
 return {title:q.title,description:s.originLabel+' · '+(s.role||s.trade)+' · '+s.duty,
  options:q.choices.filter(x=>x&&typeof x.action==='string').map(x=>x.grain>grain
   ?option('재료를 구할 길을 알아본다','askResources','지금 가진 곡식만으로는 그 일을 할 수 없다. 다른 방법을 찾아본다.',{knowledge:2,bonds:2},0,0)
   :x)};
}
function choose(life,index){
 const s=ensure(life),p=prompt(life),q=s?.active;
 if(!p||!life.alive||!Number.isInteger(index)||index<0||index>=p.options.length)return false;
 const x=p.options[index],j=J.ensure(life),v=V2.ensure(life),success=dice(life.seed,life.year+1864+index),before=j.capital;
 life.change(x.effects||{});
 if(x.cost)j.capital=clamp(j.capital-x.cost,-120,600);
 if(x.grain){if(v.grain<x.grain)return false;v.grain-=x.grain;}
 const a=x.action;
 if(['fish','market','inn','craft','service','fishtrade','travel','work'].includes(a)){
  const gain=a==='market'?7:a==='inn'?8:a==='fish'?6:a==='craft'?7:a==='service'?5:3;
  j.capital=clamp(j.capital+Math.floor(gain*(.5+success)),-120,600);
 }
 if(['payservice','labor','guard'].includes(a))s.serviceYears++;
 if(['tribute','sharetribute','payservice','labor'].includes(a))s.burdens.push(life.year+'년 '+q.title);
 if(a==='freedom'){
  if(success<.22){s.freed=true;s.legal='양인';s.trade='품팔이와 가족의 살림';remember(life,s,'속량이 받아들여져 예속된 신분에서 벗어났다. 아직 생계와 차별의 어려움은 남아 있었다.');}
  else remember(life,s,'속량의 길을 알아보았지만 허락을 얻지 못했다. 배운 일과 인연은 남았다.');
 }
 if(a==='throne'){s.royalClaim=true;s.rank=5;s.role='왕';j.occupation='국왕';remember(life,s,'계승을 거쳐 왕위에 올랐다. 국정을 결정하는 무거운 책임이 뒤따랐다.');}
 if(a==='courtstudy'||a==='courtduty')s.rank=Math.max(s.rank,1);
 if(a==='inspector'||a==='inspect'||a==='reform'||a==='hear'){s.inspector=true;s.role='암행어사';j.occupation='어사로 감찰하는 임무';}
 if(a==='flee'){j.relocations++;j.hardshipUntil=Math.max(j.hardshipUntil,life.year+1);}
 if(a==='appeal'||a==='witness')s.complaints++;
 if(a==='petition'&&success<.35)j.capital=clamp(j.capital+4,-120,600);
 if(a==='craft'&&s.origin==='백정')s.role='백정의 생업을 잇는 장인';
 if(a==='askResources')remember(life,s,'필요한 재료가 부족해 이웃과 장터에서 다른 길을 알아보았다.');
 if(life.money&&life.year<1900)life.money.netWorth=j.capital*100;
 if(life.year<1900)life.career=j.occupation;
 const id='joseon5:'+q.id;
 life.logEvent(q.title+' — '+x.label,'joseon5-choice');life.log.at(-1).causeId=id;
 if(s.decisions.length<60)s.decisions.push({id:q.id,year:life.year,type:q.type,action:a});
 s.followups.push({id:q.id,year:life.year+3,action:a});s.followups=s.followups.slice(-38);
 s.burdens=s.burdens.slice(-18);
 if(before>j.capital&&x.cost>0&&j.capital<0&&before>=0)
  remember(life,s,'그 일에 드는 부담을 감당하려고 빚을 지게 되었다.');
 if(a==='fish'&&success<.16)remember(life,s,'바람과 물결이 거칠어 예상했던 고기를 잡지 못했다.');
 if(a==='market'&&success<.2)remember(life,s,'물건값이 예상보다 내려 팔고도 남는 돈이 적었다.');
 if(a==='appeal'&&success<.3)remember(life,s,'관아에 따져 물은 뒤에도 처지는 쉽게 나아지지 않았다.');
 if(a==='witness'&&success>.65)remember(life,s,'이웃의 증언이 모여 고을의 부당한 일을 다시 살피게 되었다.');
 if(a==='flee'&&success<.3)remember(life,s,'피란하는 동안 일터와 물건의 일부를 잃었다.');
 s.active=null;life.pending=null;promote(life,s);
 return true;
}
function summary(life){
 const s=ensure(life);if(!s)return null;
 const j=J.ensure(life);
 return {origin:s.origin,originLabel:s.originLabel,legal:life.year>=1894?'법적 신분 구별 폐지':s.legal,role:s.role||j.occupation,
  trade:s.trade,duty:s.duty,freed:s.freed,rank:s.rank,
  obligations:s.burdens.slice(-3),serviceYears:s.serviceYears,memories:s.memories.slice(-3),
  decisions:s.decisions.length,inspector:s.inspector,monastic:s.monastic};
}
function hydrate(life,data){
 const s=ensure(life),old=data?.joseon5;
 if(!s||!old||old.version!==1)return s;
 if(!ORIGINS[old.origin])return s;
 for(const key of ['origin','role','trade','legal','duty','originLabel'])
  if(typeof old[key]==='string')s[key]=old[key].slice(0,90);
 for(const key of ['serviceYears','rank','processedYear','complaints'])
  if(Number.isInteger(old[key]))s[key]=clamp(old[key],0,key==='processedYear'?life.year:300);
 for(const key of ['freed','royalClaim','monastic','inspector'])s[key]=old[key]===true;
 for(const key of ['memories','burdens','seen'])
  s[key]=Array.isArray(old[key])?old[key].filter(x=>typeof x==='string').slice(-45).map(x=>x.slice(0,200)):[];
 s.decisions=Array.isArray(old.decisions)?old.decisions.filter(d=>d&&typeof d.id==='string'&&Number.isInteger(d.year)).slice(-60).map(d=>({
  id:d.id.slice(0,90),year:d.year,type:String(d.type||'').slice(0,45),action:String(d.action||'').slice(0,45)})):[];
 const valid=q=>q&&typeof q.id==='string'&&/^\d{4}-[a-z]+$/.test(q.id)&&
  typeof q.type==='string'&&Number.isInteger(q.year)&&q.year<=life.year&&q.year>=life.birthYear&&
  typeof q.title==='string'&&Array.isArray(q.choices)&&q.choices.length<=4;
 const clean=q=>({id:q.id.slice(0,80),type:q.type.slice(0,30),year:q.year,title:q.title.slice(0,100),
  choices:q.choices.filter(x=>x&&typeof x.label==='string'&&typeof x.action==='string').slice(0,4).map(x=>({
   label:x.label.slice(0,100),action:x.action.slice(0,40),note:String(x.note||'').slice(0,150),
   effects:Object.fromEntries(Object.entries(x.effects||{}).filter(([k,v])=>['health','happiness','wealth','bonds','knowledge'].includes(k)&&Number.isFinite(v))),
   cost:clamp(Number(x.cost)||0,0,40),grain:clamp(Number(x.grain)||0,0,40)}))});
 s.queue=Array.isArray(old.queue)?old.queue.filter(valid).slice(-7).map(clean):[];
 s.followups=Array.isArray(old.followups)?old.followups.filter(x=>x&&
  typeof x.id==='string'&&/^\d{4}-[a-z]+$/.test(x.id)&&
  Number.isInteger(x.year)&&x.year>life.year&&x.year<=life.year+6&&
  typeof x.action==='string').slice(-38).map(x=>({id:x.id.slice(0,80),year:x.year,action:x.action.slice(0,40)})):[];
 if(valid(old.active)&&data?.pending==='joseon5:'+old.active.id&&life.alive&&J.inOldEra(life)){
  s.active=clean(old.active);life.pending='joseon5:'+s.active.id;
 }
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V4?.ensure||Sim.Life.prototype.__joseon5)return false;
 const L=Sim.Life,tick=L.prototype.tick,chooseOld=L.prototype.choose,getChoiceOld=L.prototype.getChoice,
  reflectOld=L.prototype.reflect,snapshotOld=L.prototype.snapshot,restoreOld=L.restore;
 L.prototype.tick=function(){
  if(!J.isJoseon(this))return tick.call(this);
  const s=ensure(this),year=this.year,ok=tick.call(this);
  if(ok&&this.year!==year)yearEnd(this,s);
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon5:'))
   return prompt(this);
  return getChoiceOld.call(this);
 };
 L.prototype.choose=function(index){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon5:'))return choose(this,index);
  const ok=chooseOld.call(this,index);
  if(ok&&J.isJoseon(this))promote(this,ensure(this));
  return ok;
 };
 L.prototype.reflect=function(text){
  const ok=reflectOld.call(this,text);
  if(ok&&J.isJoseon(this))promote(this,ensure(this));
  return ok;
 };
 L.prototype.snapshot=function(){
  const save=snapshotOld.call(this);
  if(J.isJoseon(this))save.joseon5=JSON.parse(JSON.stringify(ensure(this)));
  return save;
 };
 L.restore=function(data){
  const life=restoreOld.call(this,data);
  if(life&&J.isJoseon(life))hydrate(life,data);
  return life;
 };
 Object.defineProperty(L.prototype,'__joseon5',{value:true});
 return true;
}
install();
return Object.freeze({install,ensure,summary,originFor,weighted,dice,roleChoices,prepare,prompt,choose,ORIGINS});
});
