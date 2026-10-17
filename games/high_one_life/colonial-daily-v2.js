/* Colonial-era everyday-life pressure. Fictional households, historically dated policies.
 * Dated events never claim a specific fictional person was present at an actual battle.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeColonialDaily=api;
})(typeof window!=='undefined'?window:null,function(Sim){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const hash=(seed,salt)=>{let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;};
const opt=(label,note,result,effect={})=>({label,note,result,effect});
// These are personal traces of choices, not historical participation scores.
// Keep the three strands distinct so a previous choice can change a later scene.
const ARC={
 landRegistry:[{records:3},{neighbors:3,records:1},{provisions:2}],
 nightLearning:[{learning:3},{learning:1,neighbors:2},{provisions:2}],
 riceExpansion:[{records:2,provisions:-1},{neighbors:2,records:1},{provisions:3}],
 tenantPetition:[{records:2},{neighbors:3,records:1},{provisions:2}],
 students1929:[{familyNews:2},{records:2},{provisions:1,familyNews:1}],
 marketDepression:[{provisions:3},{neighbors:3},{records:1,provisions:2}],
 languagePressure:[{learning:2,records:1},{learning:1,neighbors:2},{familyNews:2}],
 languageSociety1942:[{learning:2,records:2},{familyNews:2,neighbors:1},{records:1,provisions:1}],
 laborNotices:[{familyNews:3},{provisions:3},{neighbors:3,familyNews:1}],
 draftNotice1944:[{familyNews:2},{neighbors:3},{provisions:3}],
 liberationDay:[{records:2},{familyNews:3},{provisions:2}],
 police:[{provisions:1},{neighbors:2},{records:2}],
 manse:[{familyNews:2},{neighbors:2,familyNews:1},{provisions:2}],
 independence:[{familyNews:3},{learning:2},{provisions:3}],
 press:[{neighbors:1,records:1},{learning:2},{provisions:1,familyNews:1}],
 shrine:[{familyNews:2},{records:1},{provisions:2}],
 name:[{familyNews:2},{records:1},{provisions:2,familyNews:1}],
 requisition:[{provisions:2},{neighbors:3,provisions:-1},{records:2}],
 mobilization:[{provisions:1,familyNews:1},{familyNews:3},{provisions:3}],
 clothes:[{learning:2},{provisions:2},{learning:1}]
};
const TOPIC={
 landRegistry:'land',riceExpansion:'land',tenantPetition:'land',marketDepression:'work',requisition:'work',
 nightLearning:'learning',press:'learning',languagePressure:'learning',languageSociety1942:'learning',
 police:'authority',manse:'authority',students1929:'authority',independence:'authority',shrine:'authority',name:'authority',
 laborNotices:'separation',mobilization:'separation',draftNotice1944:'separation',liberationDay:'separation',
 clothes:'home'
};
const thread=()=>({records:0,neighbors:0,learning:0,provisions:0,familyNews:0});
function traces(l,e,s){
 const x=s.threads;
 if(e.id==='riceExpansion'&&x.records>=2)
  return '앞서 땅의 경계와 신고 내역을 적어 둔 장부가 있다. 이번 부담을 헤아릴 때 그 기록을 다시 펼칠 수 있다.';
 if(e.id==='tenantPetition'&&x.neighbors>=2)
  return '전에 곡식과 신고를 함께 살피던 이웃들도 이번 일을 걱정한다. 혼자 이야기할 때와는 다를 수 있다.';
 if(e.id==='languageSociety1942'&&x.learning>=2)
  return '예전에 배운 글과 적어 둔 낱말들이 남아 있다. 그 종이를 어떻게 지킬지 생각해야 한다.';
 if(e.id==='liberationDay'&&x.familyNews>=2)
  return '오랫동안 연락할 길을 찾으며 적어 둔 이름과 주소가 있다. 아직 돌아오지 못한 사람들의 소식을 더듬는다.';
 if(e.id==='mobilization'&&x.familyNews>=2)
  return '앞서 멀리 떠난 가족에게 소식을 보내려고 적어 둔 주소가 있다. 또다시 먼 일터 이야기가 들려온다.';
 if(e.id==='requisition'&&x.provisions>=3)
  return '전에 아껴 둔 곡식과 집안 살림이 조금 남아 있다. 이번 명령 앞에서 무엇을 지킬지 고민한다.';
 if(e.id==='press'&&x.learning>=2)
  return '글을 배울 기회를 겨우 얻었다. 신문에서 지워진 자리를 보니 적힌 글보다 빠진 말이 더 궁금하다.';
 return '';
}
const RESULT_MEMORY={
 records:'당시 적어 둔 글과 장부를 버리지 않아, 뒤에도 그 내용을 다시 확인할 수 있었다.',
 neighbors:'도움을 주고받던 이웃에게 안부를 전할 수 있었다.',
 learning:'예전에 익힌 글과 표현이 나중에 다른 소식을 읽는 데 보탬이 되었다.',
 provisions:'그때 아끼거나 마련한 살림이 뒤의 어려운 날에 작은 힘이 되었다.',
 familyNews:'전해 들은 이름과 주소를 잊지 않고 기억했다.'
};
function consequence(l,s,e,index){
 const d=ARC[e.id]?.[index]||{},old={...s.threads};
 for(const [k,v] of Object.entries(d))s.threads[k]=clamp((s.threads[k]||0)+v,0,12);
 s.lastTopic=TOPIC[e.id]||'home';
 // A continuing branch is based on the earlier action, not on a moral score.
 if(e.id==='riceExpansion'&&old.records>=2&&index===0)l.change({wealth:1,knowledge:1});
 if(e.id==='tenantPetition'&&old.neighbors>=2&&index===1)l.change({bonds:2});
 if(e.id==='languageSociety1942'&&old.learning>=2&&index===0)l.change({knowledge:1});
 if(e.id==='requisition'&&old.provisions>=3&&index===0)l.change({wealth:1});
 if(e.id==='liberationDay'&&old.familyNews>=2&&index===1)l.change({knowledge:2});
 const top=Object.entries(d).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0]?.[0];
 return {key:top||null,text:top?RESULT_MEMORY[top]:'그해 내린 선택이 이후의 집안 살림에도 영향을 주었다.'};
}
const EVENTS=[
// Each event portrays a possible household experience, not automatic participation.
// Date anchors: National Institute of Korean History (contents.history.go.kr).
 {id:'landRegistry',start:1910,end:1918,age:16,title:'논밭의 주인을 적는 장부',
  desc:'측량을 마친 관리들이 토지 신고와 지세 이야기를 꺼낸다. 이웃은 옛 문서가 제대로 인정될지 걱정한다.',options:[
  opt('집에 남은 문서를 찾아본다','작은 종이 한 장도 버리지 않는다','옛 문서와 땅의 경계를 다시 확인했다.',{knowledge:3,bonds:1}),
  opt('이웃의 신고를 함께 돕는다','글을 읽지 못하는 이를 돕는다','이웃과 함께 장부에 적힌 이름을 살펴보았다.',{knowledge:2,bonds:4}),
  opt('밭일을 하며 소식을 기다린다','관아에 갈 품을 내기 어렵다','땅의 주인과 세금에 관한 말이 오래 이어졌다.',{wealth:-2,health:-1})]},
 {id:'nightLearning',start:1918,end:1936,age:11,maxAge:30,title:'저녁 불빛 아래 글을 배우다',
  desc:'낮에는 일하고 밤에는 글을 배우는 사람들이 모인다. 누구에게나 배움의 시간과 돈이 넉넉하지는 않다.',options:[
  opt('저녁에 글 배우는 자리를 찾는다','하루 일을 마친 뒤 시간을 낸다','서툰 글씨를 한 자씩 써 보며 배움을 이어 갔다.',{knowledge:5,health:-1}),
  opt('어린 동생에게 글을 알려 준다','함께 배운 것을 나눈다','동생이 자기 이름을 읽으며 웃었다.',{knowledge:2,bonds:4}),
  opt('일손을 거들며 때를 기다린다','배움보다 오늘 끼니가 급하다','언젠가 글을 배우겠다는 말을 마음에 품었다.',{wealth:2,happiness:-1})]},
 {id:'riceExpansion',start:1920,end:1934,age:16,title:'논에 물을 대고 소작료를 걱정하다',
  desc:'논을 고치고 벼 수확을 늘린다는 소식이 들린다. 그러나 수확이 늘어도 남는 쌀은 집집마다 다르다.',options:[
  opt('수리조합의 부담을 알아본다','가져올 물과 갚을 돈을 헤아린다','물을 댄 논을 보면서도 다음 해의 빚을 걱정했다.',{knowledge:3,wealth:-2}),
  opt('소작료 문제를 이웃과 의논한다','혼자서는 항의하기 어렵다','이웃들과 수확을 나눌 몫을 오래 따졌다.',{bonds:4,knowledge:2}),
  opt('남는 곡식부터 아껴 둔다','식구의 끼니가 우선이다','곳간에 남겨 둔 쌀로 어려운 철을 넘겼다.',{wealth:1,bonds:2})]},
 {id:'tenantPetition',start:1924,end:1936,age:18,title:'소작료를 두고 모인 사람들',
  desc:'소작료가 너무 높다는 불만이 쌓인다. 몇몇 농민이 함께 요구를 전할 방법을 의논한다.',options:[
  opt('서로 낸 몫을 장부에 적는다','말보다 기록을 모은다','곡식과 돈을 낸 날짜를 이웃과 맞춰 보았다.',{knowledge:3,bonds:3}),
  opt('소작료를 낮춰 달라고 함께 나선다','압박과 보복을 받을 수도 있다','함께 말했던 얼굴들을 오래 잊지 못했다.',{bonds:5,health:-2}),
  opt('식구의 생계를 먼저 돌본다','당장 먹고사는 일을 살핀다','장터에 다녀와도 소작료 이야기는 그치지 않았다.',{wealth:2,happiness:-1})]},
 {id:'students1929',start:1929,end:1929,age:12,maxAge:35,title:'광주에서 시작된 학생들의 외침',
  desc:'광주에서 학생들이 차별에 항의했다는 소식이 다른 고을에도 닿는다. 집집마다 자녀와 친척의 안부를 걱정한다.',options:[
  opt('멀리 사는 친척의 안부를 묻는다','인편과 편지를 기다린다','안부를 묻는 편지를 보냈지만 답장이 언제 올지는 알 수 없었다.',{bonds:4,knowledge:2}),
  opt('거리에서 들린 요구를 기록한다','말을 옮길 때 조심한다','학생들이 전한 말을 잊지 않으려 적어 두었다.',{knowledge:4}),
  opt('가족과 함께 상황을 지켜본다','검거와 단속이 걱정된다','어른들이 늦게까지 학생들의 이야기를 나누었다.',{bonds:3,health:-1})]},
 {id:'marketDepression',start:1930,end:1935,age:16,title:'장터의 손님이 줄다',
  desc:'장터에서 물건이 잘 팔리지 않는다. 빚을 갚을 날짜와 가족의 끼니가 겹친다.',options:[
  opt('다른 일거리를 찾아본다','낯선 품팔이도 알아본다','하던 일 밖에서 벌이를 찾아 다녔다.',{wealth:2,health:-2}),
  opt('이웃과 물건을 나누어 쓴다','오늘 모자란 것을 나눈다','필요한 물건을 빌리고 돌려주며 지냈다.',{bonds:4,wealth:1}),
  opt('가족과 살림을 다시 셈한다','쓸 돈과 먹을 곡식을 헤아린다','낡은 장부에 남은 돈을 적어 보았다.',{knowledge:2,wealth:1})]},
 {id:'languagePressure',start:1938,end:1945,age:10,title:'집안에서 쓰는 말과 학교의 말',
  desc:'학교와 관공서에서 일본어를 쓰라는 압박이 커진다. 가족은 집에서 나누는 말을 더욱 조심한다.',options:[
  opt('집안의 옛 이야기를 적어 둔다','어른의 말을 잊지 않는다','할머니가 들려주던 말을 공책에 옮겼다.',{knowledge:4,bonds:2}),
  opt('형제자매에게 우리말을 알려 준다','자신이 아는 말을 나눈다','식구들이 서로 가르쳐 준 말을 익혔다.',{knowledge:3,bonds:3}),
  opt('가족의 안전을 먼저 살핀다','밖에서 하는 말을 조심한다','문밖에서는 말을 삼키는 날이 늘었다.',{bonds:3,health:-1})]},
 {id:'languageSociety1942',start:1942,end:1943,age:14,title:'우리말 사전을 만들던 사람들의 검거',
  desc:'우리말을 모아 사전을 만들던 사람들이 붙잡혔다는 소식이 들린다. 어떤 글은 숨기고 어떤 이름은 입 밖에 내지 못한다.',options:[
  opt('가족에게 들은 낱말을 기록한다','작은 수첩을 지킨다','어른들이 쓰던 낱말을 한 자씩 옮겨 적었다.',{knowledge:4}),
  opt('검거된 사람의 소식을 물어본다','다른 사람의 안부를 살핀다','소식이 끊긴 이들을 걱정하는 사람과 이야기를 나눴다.',{bonds:4,knowledge:2}),
  opt('글을 숨겨 두고 때를 기다린다','가족에게 닥칠 위험을 헤아린다','종이 꾸러미를 깊숙이 간직했다.',{health:-1,bonds:2})]},
 {id:'laborNotices',start:1939,end:1945,age:16,title:'먼 일터로 떠난 집안사람',
  desc:'전쟁을 위해 사람들을 동원한다는 통보가 늘어난다. 일본의 공장과 탄광으로 떠난 친척 이야기도 들린다.',options:[
  opt('떠난 사람의 주소를 적어 둔다','편지를 보낼 길을 찾는다','돌아오지 않은 편지를 서랍에 모아 두었다.',{knowledge:2,bonds:3}),
  opt('남은 가족의 일손을 나눈다','곡식과 땔감을 마련한다','식구끼리 바쁜 철의 일을 나누어 맡았다.',{bonds:4,health:-2}),
  opt('같은 소식을 기다리는 이웃을 돕는다','먹을 것과 안부를 나눈다','서로 소식을 전하며 긴 계절을 보냈다.',{bonds:5,wealth:-2})]},
 {id:'draftNotice1944',start:1944,end:1945,age:18,maxAge:35,gender:'남자',title:'징병 통지에 술렁이는 마을',
  desc:'청년에게 징병에 관한 통지가 전달된다. 가족들은 어느 집의 아들이 떠나게 될지 두려워한다.',options:[
  opt('가족과 통지 내용을 살펴본다','피할 수 없는 명령의 무게를 느낀다','읽고도 다시 펼쳐 본 종이가 구겨졌다.',{knowledge:2,health:-2}),
  opt('떠난 이의 가족을 찾아간다','이웃의 사정을 듣는다','남겨진 식구들이 서로 기댈 일을 찾았다.',{bonds:5,wealth:-1}),
  opt('가족의 생계를 준비한다','떠난 뒤의 집안을 걱정한다','함께 일하던 사람의 빈자리를 헤아렸다.',{bonds:3,wealth:1})]},
 {id:'liberationDay',start:1945,end:1945,age:7,title:'해방 소식이 마을에 전해지다',
  desc:'일본의 식민 통치가 끝났다는 소식이 들려온다. 기뻐하는 사람들 사이로 행방을 알 수 없는 가족을 찾는 이들도 보인다.',options:[
  opt('사람들이 모인 곳에서 소식을 듣는다','바뀔 세상을 생각한다','사람들의 환호와 걱정이 뒤섞인 날을 기억했다.',{knowledge:3,happiness:3}),
  opt('소식이 끊긴 가족의 행방을 알아본다','돌아올 길과 주소를 묻는다','돌아온 사람에게서 먼 곳의 소식을 들었다.',{bonds:4,knowledge:2}),
  opt('가족과 함께 집을 지킨다','앞으로의 살림을 헤아린다','모두 돌아온 것은 아니었지만 식구들은 불을 밝히고 기다렸다.',{bonds:4})]},
 {id:'police',start:1910,end:1919,age:13,title:'헌병경찰이 마을에 들다',
  desc:'헌병경찰이 장터와 길목을 단속한다. 사람들이 말을 낮춘다.',options:[
  opt('가족과 장터를 조심히 다닌다','다툼을 피한다','단속이 있던 길을 한동안 피해 다녔다.',{health:1}),
  opt('이웃과 소식을 나눈다','서로 무슨 일이 있는지 듣는다','그때 나누었던 이야기를 식구들이 기억했다.',{bonds:3,knowledge:2}),
  opt('마을 어른에게 사정을 묻는다','달라진 법과 통제를 알아본다','달라진 규칙을 알고도 마음은 편하지 않았다.',{knowledge:4})]},
 {id:'manse',start:1919,end:1919,age:14,title:'거리에서 들려온 만세 소리',
  desc:'독립을 외치는 목소리가 거리와 장터로 번져 간다.',options:[
  opt('가족과 함께 길가의 소식을 듣는다','몸을 조심하며 사람들의 뜻을 듣는다','만세 소리를 들었던 날이 오래 기억났다.',{knowledge:2,bonds:2}),
  opt('독립을 외치는 사람을 돕는다','검거될 위험이 있다','그때 함께했던 사람들의 안부가 늘 걱정되었다.',{health:-4,bonds:5}),
  opt('단속을 피해 식구를 챙긴다','누군가 다칠까 염려된다','그날 식구들은 집에 모여 무사함을 확인했다.',{bonds:4})]},
 {id:'independence',start:1920,end:1936,age:16,title:'국경 너머의 독립운동 소식',
  desc:'만주와 국경 지방에서 독립운동에 참여한 사람의 소문이 들려온다.',options:[
  opt('먼 곳에 간 친척의 안부를 묻는다','편지와 인편을 기다린다','멀리 있는 친척에게 안부를 물을 길을 찾았다.',{bonds:4,knowledge:2}),
  opt('사람들이 읽는 글을 함께 본다','검열과 단속을 피해야 한다','당시 읽었던 글귀가 오래 마음에 남았다.',{knowledge:4}),
  opt('마을의 생업을 이어 간다','집안이 버틸 수 있도록 한다','바쁜 가운데에도 먼 곳의 소식은 계속 들어왔다.',{wealth:2})]},
 {id:'press',start:1920,end:1936,age:12,title:'신문에 실리지 못한 이야기',
  desc:'검열로 신문 기사가 지워졌다는 이야기가 장터를 돈다.',options:[
  opt('이웃이 전하는 이야기를 듣는다','서로 다른 소식을 확인한다','검열로 전하지 못한 일이 있었다는 말을 들었다.',{knowledge:3}),
  opt('배우던 글을 계속 익힌다','읽고 생각하는 시간을 지킨다','그때 익힌 글로 훗날 가족의 편지를 읽었다.',{knowledge:4}),
  opt('가족의 안부를 먼저 살핀다','위험한 이야기를 멀리한다','집안 사람들은 안전을 걱정하며 조용히 지냈다.',{bonds:3})]},
 {id:'shrine',start:1937,end:1945,age:10,title:'신사참배를 강요받다',
  desc:'학교와 마을에서 신사참배에 관한 통보가 내려온다.',options:[
  opt('어른과 어려운 마음을 이야기한다','가족끼리 선택의 부담을 나눈다','가족은 그 시절의 강요를 오래 기억했다.',{bonds:4,knowledge:2}),
  opt('학교에서 벌어지는 일을 살핀다','어떤 조치가 있는지 알아본다','학교에 다니는 이의 소식을 걱정하며 기다렸다.',{knowledge:3}),
  opt('식구의 안전을 먼저 생각한다','부당함 속에서도 가족을 챙긴다','어렵고 두려운 날들을 가족과 함께 버텼다.',{bonds:3,health:-1})]},
 {id:'name',start:1940,end:1945,age:14,title:'창씨개명 신고를 재촉하다',
  desc:'면사무소에서 성과 이름을 일본식으로 바꾸는 신고를 재촉한다.',options:[
  opt('가족과 오랫동안 의논한다','성씨와 집안의 기억을 함께 생각한다','이름을 두고 가족끼리 나눈 말이 오래 남았다.',{bonds:4,knowledge:2}),
  opt('신고를 미루며 상황을 살핀다','압박을 받을 수 있다','면사무소에서 이름을 물어보는 일이 이어졌다.',{health:-2,knowledge:2}),
  opt('안전을 위해 신고한다','제도가 강요한 선택이 남는다','서류에 적힌 이름과 집에서 부르는 이름이 달랐다.',{health:1,happiness:-2})]},
 {id:'requisition',start:1938,end:1945,age:13,title:'마을에 공출 명령이 내려오다',
  desc:'쌀과 물건을 내라는 명령에 곳간과 살림을 다시 헤아린다.',options:[
  opt('식구가 먹을 곡식을 먼저 챙긴다','살림이 더 빠듯해진다','한동안 식구들이 먹을 양식을 아껴야 했다.',{wealth:-4,bonds:3}),
  opt('이웃과 필요한 물건을 나눈다','서로 도울 만큼만 남아 있다','어려울 때 물건을 나누었던 이웃을 기억했다.',{wealth:-2,bonds:4}),
  opt('면사무소에 부담을 호소한다','받아들여지지 않을 수도 있다','부담을 줄여 달라는 말은 쉽게 통하지 않았다.',{health:-2,knowledge:2})]},
 {id:'mobilization',start:1939,end:1945,age:17,title:'먼 일터로 가라는 명령',
  desc:'전쟁을 위한 인력 동원이 확대된다. 집안의 젊은이가 먼 일터로 떠날 수 있다.',options:[
  opt('떠나는 가족에게 먹을 것을 챙긴다','돌아올 날을 기약하기 어렵다','멀리 떠난 사람을 기다리는 날이 길어졌다.',{wealth:-3,bonds:4}),
  opt('떠난 이에게 편지를 쓴다','소식이 닿기를 바란다','편지를 쓰고도 답장이 올지는 알 수 없어 오래 기다렸다.',{knowledge:2,bonds:4}),
  opt('남은 가족의 살림을 맡는다','갑자기 빈 일손을 대신한다','한 사람이 떠난 집안의 일은 남은 식구가 나누었다.',{health:-3,bonds:3})]},
 {id:'clothes',start:1910,end:1945,age:10,title:'거리에서 바뀌는 차림',
  desc:'한복 차림 사이로 양복과 모자, 안경을 쓴 사람이 오간다.',options:[
  opt('안경을 쓴 이에게 글을 읽어 달라 한다','글을 읽는 일을 돕는다','처음 본 안경이 오래 기억에 남았다.',{knowledge:3}),
  opt('가족의 옷을 기워 입는다','새것을 살 여유가 없다','기워 입은 옷이 오랫동안 집안 살림을 지탱했다.',{wealth:2}),
  opt('거리의 새로운 차림을 구경한다','옷과 머리 모양의 변화를 본다','장터에서 본 옷차림을 가족에게 이야기했다.',{knowledge:2,happiness:2})]}
];
function isPeriod(l){return l.country?.[0]==='대한민국'&&l.year>=1910&&l.year<=1945}
function ensure(l){if(!l||l.country?.[0]!=='대한민국')return null;
 const s=l.colonialDaily||(l.colonialDaily={version:1,processedYear:l.birthYear,seen:[],active:null,queue:[],decisions:[],followups:[],threads:thread(),lastTopic:''});
 if(!s.threads)s.threads=thread();return s;
}
function eligible(l,e){
 // A village's tenancy and irrigation disputes should not be assigned to
 // every city household as if it owned or worked rice paddies.
 if(['landRegistry','riceExpansion','tenantPetition'].includes(e.id)&&
    l.profile?.settlement&&l.profile.settlement!=='농촌'&&
    !/농업|소작|농사|농민/.test(String(l.profile?.motherJob||'')+' '+String(l.profile?.fatherJob||'')))return false;
 return isPeriod(l)&&l.alive&&l.age>=e.age&&
 (e.maxAge===undefined||l.age<=e.maxAge)&&(!e.gender||l.gender===e.gender)&&
 l.year>=e.start&&l.year<=e.end}
function promote(l,s){if(s&&!s.active&&!l.pending&&l.alive&&s.queue.length){
 s.active=s.queue.shift();l.pending='colonialDaily:'+s.active.id;
}}
function yearly(l,s){
 if(!s||!isPeriod(l)||!l.alive||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 for(const f of s.followups.filter(f=>f.year<=l.year)){
  l.logEvent(f.text,'colonialDaily-followup');l.log.at(-1).causeId='colonialDaily:'+f.id;
 }
 s.followups=s.followups.filter(f=>f.year>l.year);
 const pool=EVENTS.filter(e=>!s.seen.includes(e.id)&&eligible(l,e));
 // Date-specific public milestones are not gated by a birth-year modulo.
 // The player may hear about them, but is never automatically made a participant.
 const keyMoment=pool.filter(e=>e.start===e.end&&[1919,1929,1945].includes(e.start));
 if((l.age%4===1||keyMoment.length)&&pool.length&&s.queue.length<2){
  const candidates=keyMoment.length?keyMoment:pool;
  // Repeatedly asking about the same subject can feel like the previous
  // answer was ignored. Favor a fresh topic, except on fixed historical dates.
  candidates.sort((a,b)=>
   (hash(l.seed,l.year+a.id.length*73)+(TOPIC[a.id]===s.lastTopic?.28:0))-
   (hash(l.seed,l.year+b.id.length*73)+(TOPIC[b.id]===s.lastTopic?.28:0)));
  const e=candidates[0];s.seen.push(e.id);s.queue.push({id:l.year+'-'+e.id,eventId:e.id,year:l.year});
 }
 promote(l,s);
}
function prompt(l){const s=ensure(l),e=EVENTS.find(e=>e.id===s?.active?.eventId);return e?{
 title:e.title,description:e.desc+(traces(l,e,s)?' '+traces(l,e,s):''),options:e.options.map(o=>({label:o.label,note:o.note,action:o.label}))}:null}
function choose(l,index){const s=ensure(l),e=EVENTS.find(e=>e.id===s?.active?.eventId);
 if(!l.alive||!e||!Number.isInteger(index)||index<0||index>2)return false;
 const o=e.options[index],id=s.active.id;
 l.change(o.effect);const memory=consequence(l,s,e,index);
 l.logEvent(e.title+' — '+o.label,'colonialDaily-choice');l.log.at(-1).causeId='colonialDaily:'+id;
 s.decisions.push({id,eventId:e.id,year:l.year,option:index,trace:memory.key});
 s.followups.push({id,year:l.year+2,text:o.result+' '+memory.text});
 s.active=null;l.pending=null;promote(l,s);return true;
}
function hydrate(l,data){const s=ensure(l),o=data?.colonialDaily;if(!s||!o||o.version!==1)return s;
 const clean=q=>q&&typeof q.id==='string'&&EVENTS.some(e=>e.id===q.eventId)&&Number.isInteger(q.year)&&q.year<=l.year?
 {id:q.id.slice(0,75),eventId:q.eventId,year:q.year}:null;
 s.processedYear=clamp(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(id=>EVENTS.some(e=>e.id===id)).slice(-EVENTS.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.map(clean).filter(Boolean).slice(-2):[];
 s.active=clean(o.active);
 if(!l.alive||!isPeriod(l)||data?.pending!=='colonialDaily:'+s.active?.id)s.active=null;
 else l.pending='colonialDaily:'+s.active.id;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(x=>x&&typeof x.id==='string'&&Number.isInteger(x.year)).slice(-40):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'&&Number.isInteger(x.year)&&x.year>l.year).slice(-25):[];
 s.threads=thread();
 for(const k of Object.keys(s.threads))if(Number.isInteger(o.threads?.[k]))s.threads[k]=clamp(o.threads[k],0,12);
 s.lastTopic=Object.values(TOPIC).includes(o.lastTopic)?o.lastTopic:'';
 return s;
}
function install(){if(!Sim?.Life||Sim.Life.prototype.__colonialDaily)return false;
 const L=Sim.Life,pt=L.prototype.tick,pg=L.prototype.getChoice,pc=L.prototype.choose,pr=L.prototype.reflect,ps=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){const y=this.year,ok=pt.call(this);
  if(ok&&this.alive&&this.year!==y&&isPeriod(this))yearly(this,ensure(this));return ok;};
 L.prototype.getChoice=function(){if(typeof this.pending==='string'&&this.pending.startsWith('colonialDaily:'))return prompt(this);return pg.call(this);};
 L.prototype.choose=function(i){if(typeof this.pending==='string'&&this.pending.startsWith('colonialDaily:'))return choose(this,i);
 const ok=pc.call(this,i);if(ok&&isPeriod(this))promote(this,ensure(this));return ok;};
 L.prototype.reflect=function(t){const ok=pr.call(this,t);if(ok&&isPeriod(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const s=ps.call(this);if(this.colonialDaily)s.colonialDaily=JSON.parse(JSON.stringify(this.colonialDaily));return s;};
 L.restore=function(data){const l=restore.call(this,data);if(l&&data?.colonialDaily)hydrate(l,data);return l;};
 Object.defineProperty(L.prototype,'__colonialDaily',{value:true});return true;
}
install();
return Object.freeze({EVENTS,ARC,TOPIC,ensure,eligible,prompt,choose,yearly,install});
});
