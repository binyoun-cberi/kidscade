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
  opt('집안 문권과 세금 납부 종이를 모아 대조한다','논밭의 주인과 경계가 다르게 적히면 불이익을 볼 수 있다. 낡은 문권을 찾아 신고 내용과 비교한다.','집에 남은 문권과 신고된 경계를 대조한 종이가 있었다. 인정 여부는 여전히 관리의 판단에 달려 있었다.',{knowledge:3,bonds:1}),
  opt('글을 읽기 어려운 이웃과 신고서를 확인한다','이웃이 가져온 문서의 이름·면적을 함께 읽어 준다. 우리 집 일도 미뤄야 한다.','이웃의 종이에서 이름과 면적을 찾아 표시해 주었다. 그 집은 나중에 다시 확인할 문구를 알게 되었다.',{knowledge:2,bonds:4}),
  opt('신고에 나갈 품을 줄이고 그날 밭을 돌본다','당장 김을 매지 않으면 밥벌이에 지장이 있다. 대신 신고 내용을 직접 따져 볼 기회는 줄어든다.','밭일은 마쳤으나 신고 서류의 내용은 확인하지 못했다. 이후 세금 이야기가 나오면 막막함이 남았다.',{wealth:-2,health:-1})]},
 {id:'nightLearning',start:1918,end:1936,age:11,maxAge:30,title:'저녁 불빛 아래 글을 배우다',
  desc:'낮에는 일하고 밤에는 글을 배우는 사람들이 모인다. 누구에게나 배움의 시간과 돈이 넉넉하지는 않다.',options:[
  opt('저녁 품일을 마친 뒤 야학에 가서 글을 배운다','낮에 일한 몸으로 밤마다 한글과 셈을 익힌다. 잠과 휴식이 부족해질 수 있다.','일이 끝난 밤마다 글자와 숫자를 적었다. 낯선 서류의 내용을 스스로 확인할 길이 조금씩 생겼다.',{knowledge:5,health:-1}),
  opt('글을 배우려는 이웃과 공책을 함께 본다','알고 있는 글자를 서로 가르치고 틀린 곳을 고쳐 준다. 혼자 공부할 시간은 줄어든다.','어려운 낱말을 이웃과 함께 읽었다. 서로 모르는 글자를 물을 사람이 생겼다.',{knowledge:2,bonds:4}),
  opt('밤 공부를 미루고 남은 일손으로 품삯을 번다','오늘 식구가 먹을 곡식이 더 급하다. 공부할 기회가 줄지만 당장의 끼니를 마련한다.','저녁에도 품을 팔아 집에 먹을 것을 가져왔다. 글을 배우는 일은 다음을 기약했다.',{wealth:2,happiness:-1})]},
 {id:'riceExpansion',start:1920,end:1934,age:16,title:'논에 물을 대고 소작료를 걱정하다',
  desc:'논을 고치고 벼 수확을 늘린다는 소식이 들린다. 그러나 수확이 늘어도 남는 쌀은 집집마다 다르다.',options:[
  opt('수리조합 분담금과 물길을 장부로 비교한다','논에 물이 더 들어와도 내야 할 돈이 늘 수 있다. 이전 수확량과 새 분담액을 적어 본다.','물길을 고친 뒤 예상되는 비용을 장부에 적었다. 실제로 손에 남을 몫을 다시 계산할 근거가 생겼다.',{knowledge:3,wealth:-2}),
  opt('이웃 소작농과 수확·소작료 내역을 모은다','여러 집의 내역을 비교해야 요구할 금액을 따질 수 있다. 함께 나서면 지주의 반발을 살 수 있다.','몇 집의 수확과 소작료를 나란히 적었다. 같은 부담을 겪는 이웃을 확인했다.',{bonds:4,knowledge:2}),
  opt('올해 남은 쌀을 덜어 가족 먹을 몫을 보관한다','새 농사에 투자할 몫은 줄지만 흉년이나 빚 독촉에 대비한다.','먹을 몫을 따로 덜어 두었다. 다음 수확 전까지 양식을 얼마나 아껴야 할지 알 수 있었다.',{wealth:1,bonds:2})]},
 {id:'tenantPetition',start:1924,end:1936,age:18,title:'소작료를 두고 모인 사람들',
  desc:'소작료가 너무 높다는 불만이 쌓인다. 몇몇 농민이 함께 요구를 전할 방법을 의논한다.',options:[
  opt('낸 소작료와 영수증을 모아 요구서를 작성한다','소작료를 줄여 달라 하려면 얼마를 냈는지 먼저 보여 줄 자료가 필요하다.','소작료를 낸 날과 수량을 한 장에 정리했다. 요구가 받아들여질지는 알 수 없었다.',{knowledge:3,bonds:3}),
  opt('이웃 소작농과 함께 지주에게 인하를 요구한다','여러 집의 요구를 모아 전달한다. 그러나 지주나 중개인의 보복을 당할 위험이 있다.','이웃과 함께 소작료 부담을 말했지만 답을 기다려야 했다. 항의에 나선 사람들의 이름이 서로 알려졌다.',{bonds:5,health:-2}),
  opt('항의를 미루고 이번 철 품삯과 식량을 확보한다','지주와의 충돌을 피하되 당장의 소작료 문제는 그대로 남는다.','며칠 동안 다른 품일을 찾아 끼니를 마련했다. 소작료를 낮추는 문제는 해결되지 않았다.',{wealth:2,happiness:-1})]},
 {id:'students1929',start:1929,end:1929,age:12,maxAge:35,title:'광주에서 시작된 학생들의 외침',
  desc:'광주에서 학생들이 차별에 항의했다는 소식이 다른 고을에도 닿는다. 집집마다 자녀와 친척의 안부를 걱정한다.',options:[
  opt('학교가 있는 지역의 친척에게 안부 편지를 보낸다','학생들의 검거 소식에 멀리 있는 식구가 걱정된다. 주소를 찾아 편지를 보내지만 답장이 보장되지는 않는다.','친척의 주소를 찾아 편지를 보냈다. 답을 기다리며 학생들의 소식을 귀 기울여 들었다.',{bonds:4,knowledge:2}),
  opt('학생들이 내건 요구와 단속 소식을 수첩에 적는다','소문과 실제 들은 말을 나누어 적는다. 단속이 심해 수첩을 드러내기도 조심스럽다.','들어 본 요구와 소식의 출처를 적어 두었다. 사실을 확인하지 못한 말은 별도로 표시했다.',{knowledge:4}),
  opt('집안과 이동할 길목을 상의하고 귀가를 서두른다','장터에서 단속이 이어질 수 있어 집으로 돌아갈 경로를 정한다. 거리의 사정은 직접 확인하기 어렵다.','식구들이 돌아오는 길과 시간을 맞췄다. 거리에서 무슨 일이 더 있었는지는 소문으로 들었다.',{bonds:3,health:-1})]},
 {id:'marketDepression',start:1930,end:1935,age:16,title:'장터의 손님이 줄다',
  desc:'장터에서 물건이 잘 팔리지 않는다. 빚을 갚을 날짜와 가족의 끼니가 겹친다.',options:[
  opt('장터 밖 품일을 찾아 하루씩 일을 구한다','가게의 물건이 팔리지 않아 돈이 모자란다. 먼 일터에서 품삯을 받는 대신 몸은 더 고단해진다.','다른 일을 도우며 받은 품삯으로 밀린 끼니를 해결했다. 장터의 판매 사정은 나아지지 않았다.',{wealth:2,health:-2}),
  opt('이웃과 쓰지 않는 도구를 서로 빌려 쓴다','당장 새것을 살 돈이 없다. 누구에게 무엇을 빌렸는지 정해 두면 서로의 지출을 줄일 수 있다.','빌린 도구를 사용한 뒤 돌려주었다. 이웃과 빌리는 날짜를 서로 맞추게 되었다.',{bonds:4,wealth:1}),
  opt('집안 지출과 빚 갚을 날짜를 장부에 적는다','어느 돈을 먼저 갚아야 하는지 정하기 위해 남은 곡식과 빚을 계산한다.','남은 돈과 외상값을 한 장에 정리했다. 무엇을 미뤄야 할지 가족과 구체적으로 상의할 수 있었다.',{knowledge:2,wealth:1})]},
 {id:'languagePressure',start:1938,end:1945,age:10,title:'집안에서 쓰는 말과 학교의 말',
  desc:'학교와 관공서에서 일본어를 쓰라는 압박이 커진다. 가족은 집에서 나누는 말을 더욱 조심한다.',options:[
  opt('집안 어른에게 들은 우리말을 작은 공책에 적는다','밖에서 쓰지 못하게 하는 말이 늘어도 집안의 표현을 잊지 않으려 한다. 보관하는 곳은 조심스럽게 정한다.','가족이 쓰던 물건 이름과 옛 이야기를 공책에 옮겼다. 종이는 집안 깊숙이 보관했다.',{knowledge:4,bonds:2}),
  opt('글을 읽기 어려운 이웃과 우리말 편지를 읽는다','모르는 글자를 서로 물어 가며 읽는다. 바깥에서는 말과 종이를 드러내는 일을 조심해야 한다.','편지 속 표현을 서로 풀어 읽었다. 이웃과 글자를 알려 주는 일이 이어졌다.',{knowledge:3,bonds:3}),
  opt('바깥에서 단속이 있을 때 식구에게 먼저 알린다','마을과 학교에서 통제가 강화된다. 가족이 어디서 어떤 말을 조심해야 하는지 미리 전한다.','식구들은 단속이 있던 장소와 시간을 서로 알렸다. 마음 놓고 말할 수 없는 생활은 계속됐다.',{bonds:3,health:-1})]},
 {id:'languageSociety1942',start:1942,end:1943,age:14,title:'우리말 사전을 만들던 사람들의 검거',
  desc:'우리말을 모아 사전을 만들던 사람들이 붙잡혔다는 소식이 들린다. 어떤 글은 숨기고 어떤 이름은 입 밖에 내지 못한다.',options:[
  opt('집안에서 배운 낱말을 공책에 옮겨 숨겨 둔다','글을 모으던 사람들이 검거됐다는 소식에 책과 수첩을 지킬지 고민한다. 적는 일에도 위험이 따른다.','집안 어른의 낱말과 뜻을 적어 두고 숨길 곳을 정했다. 누군가 확인하러 오지 않을까 걱정했다.',{knowledge:4}),
  opt('검거된 사람을 아는 이에게 조심스레 안부를 묻는다','소문을 퍼뜨리는 일이 누군가를 위험하게 할 수 있다. 필요한 사람에게만 묻고 들은 사실을 가려 둔다.','아는 사람을 통해 안부를 물었다. 모르는 사실까지 떠들지 않으려 애썼다.',{bonds:4,knowledge:2}),
  opt('책과 편지에서 이름이 적힌 쪽지를 따로 보관한다','가족과 지인의 이름이 드러나지 않도록 문서의 보관 장소를 나눈다.','종이와 이름이 적힌 쪽지를 따로 묶었다. 무엇을 어디에 두었는지 가족에게만 알려 주었다.',{health:-1,bonds:2})]},
 {id:'laborNotices',start:1939,end:1945,age:16,title:'먼 일터로 떠난 집안사람',
  desc:'전쟁을 위해 사람들을 동원한다는 통보가 늘어난다. 일본의 공장과 탄광으로 떠난 친척 이야기도 들린다.',options:[
  opt('먼 일터로 떠난 친척의 마지막 주소를 받아 적는다','편지를 보내려면 공장·탄광 이름과 인편을 알아야 한다. 실제로 닿을지는 알 수 없다.','소식을 전해 준 사람에게 주소와 일터 이름을 물어 적었다. 연락할 길을 다시 찾아볼 단서가 남았다.',{knowledge:2,bonds:3}),
  opt('빈 일손을 대신해 땔감·곡식을 나누어 마련한다','일하던 가족이 떠나면 집안일을 남은 사람들이 맡아야 한다. 한 사람이 너무 무리하지 않게 일을 분담한다.','식구마다 맡을 밭일과 땔감 마련을 정했다. 일이 줄지는 않았지만 누가 무엇을 할지 분명해졌다.',{bonds:4,health:-2}),
  opt('떠난 이의 집에 먹을 것을 나르고 소식을 나눈다','옆집도 가장이나 자식의 연락을 기다린다. 우리 집 양식을 조금 덜어 어려운 집에 가져간다.','기다리는 집에 쌀과 장작을 건네고 들은 소식을 나눴다. 서로 소식이 오면 전하기로 약속했다.',{bonds:5,wealth:-2})]},
 {id:'draftNotice1944',start:1944,end:1945,age:18,maxAge:35,gender:'남자',title:'징병 통지에 술렁이는 마을',
  desc:'청년에게 징병에 관한 통지가 전달된다. 가족들은 어느 집의 아들이 떠나게 될지 두려워한다.',options:[
  opt('통지서의 날짜·집결지·이름을 가족과 확인한다','떠나는 시점과 장소가 적혔는지 읽고 가족이 알아야 할 내용을 따로 적는다. 명령을 마음대로 바꿀 수는 없다.','통지서의 내용을 함께 읽고 종이에 옮겼다. 가족은 알아낸 날짜를 잊지 않으려 했다.',{knowledge:2,health:-2}),
  opt('징병 통보를 받은 집에 일손을 나눠 주러 간다','이웃집은 곧 떠날 사람의 빈자리를 걱정한다. 우리 집 일을 잠시 미뤄 밭과 땔감을 돕는다.','떠날 사람의 집에 가서 미처 끝내지 못한 일을 도왔다. 돌아갈 길에 걱정이 더 남았다.',{bonds:5,wealth:-1}),
  opt('떠난 뒤 쓸 곡식과 남은 식구의 일을 계산한다','집안에 한 사람의 일손이 빠질 수 있다. 먼저 끼니와 품일을 어떻게 마련할지 정한다.','남은 곡식과 품삯을 계산하고 일을 나눴다. 통지에 따른 불안은 여전히 집안에 남았다.',{bonds:3,wealth:1})]},
 {id:'liberationDay',start:1945,end:1945,age:7,title:'해방 소식이 마을에 전해지다',
  desc:'일본의 식민 통치가 끝났다는 소식이 들려온다. 기뻐하는 사람들 사이로 행방을 알 수 없는 가족을 찾는 이들도 보인다.',options:[
  opt('장터에 모인 사람들에게 소식을 확인한다','일본의 지배가 끝났다는 말이 전해졌다. 서로 다른 소식을 확인하며 바뀔 생활을 생각한다.','사람들에게 들은 해방 소식을 서로 맞춰 보았다. 기쁨 속에서도 앞으로의 일을 알 수 없었다.',{knowledge:3,happiness:3}),
  opt('전쟁 중 떠난 가족의 이름과 주소를 다시 정리한다','연락이 끊긴 사람을 찾으려면 마지막 일터와 소식을 남긴 사람을 알아봐야 한다.','남은 주소와 이름을 다시 꺼내 적었다. 돌아온 사람에게 물어볼 실마리가 남았다.',{bonds:4,knowledge:2}),
  opt('가족의 식량과 잠자리를 마련해 귀환을 기다린다','떠난 사람이 곧 돌아오리라는 보장은 없다. 그래도 누군가 찾아왔을 때 쉴 자리를 준비한다.','빈자리와 먹을 것을 조금 남겨 두었다. 돌아올 사람을 기다리면서도 매일의 살림을 이어 갔다.',{bonds:4})]},
 {id:'police',start:1910,end:1919,age:13,title:'헌병경찰이 마을에 들다',
  desc:'헌병경찰이 장터와 길목을 단속한다. 사람들이 말을 낮춘다.',options:[
  opt('단속을 피할 장터 길을 가족에게 알려 준다','헌병경찰이 서 있는 길목을 돌아 장을 보러 간다. 길은 멀어져도 뜻밖의 검문을 피하려 한다.','가족과 함께 돌아갈 길을 정했다. 장에 다녀오느라 시간이 더 들었다.',{health:1}),
  opt('장터의 단속 시간과 길목을 이웃에게 전한다','같은 길을 오가는 사람들이 조심할 수 있도록 직접 본 사실만 알린다.','단속을 본 장소와 시간을 이웃에게 전했다. 근거 없는 소문은 옮기지 않았다.',{bonds:3,knowledge:2}),
  opt('경찰이 요구한 문서가 무엇인지 확인한다','장사를 계속하려면 어떤 증명서를 내야 하는지 알아야 한다. 관청에 묻는 일 자체가 부담스럽다.','요구받은 서류의 이름을 들었다. 어디서 구할지 확인할 일이 남았다.',{knowledge:4})]},
 {id:'manse',start:1919,end:1919,age:14,title:'거리에서 들려온 만세 소리',
  desc:'독립을 외치는 목소리가 거리와 장터로 번져 간다.',options:[
  opt('군중이 모인 길목에서 들은 소식을 가족에게 전한다','만세 소리가 커지자 가족이 다니는 길과 돌아갈 시간을 알려 준다. 시위에 참여했다고 단정하지 않는다.','길목에서 본 일과 귀가할 경로를 식구에게 전했다. 다른 거리에서 일어난 일은 알 수 없었다.',{knowledge:2,bonds:2}),
  opt('시위 참여자에게 마실 물과 피할 길을 알려 준다','목이 쉰 사람에게 물을 건네고 검문이 있는 골목을 알린다. 경찰에게 발견되면 위험하다.','물통을 건네고 검문이 있는 곳을 알려 주었다. 이후 사람들의 안부는 확인할 수 없었다.',{health:-4,bonds:5}),
  opt('검문이 시작된 뒤 어린 식구와 골목을 돌아간다','사람들이 흩어지는 길에서 아이가 다치지 않도록 손을 잡고 집으로 향한다.','흩어진 군중을 피해 집에 돌아왔다. 바깥에서 들린 만세 소리는 오래 기억에 남았다.',{bonds:4})]},
 {id:'independence',start:1920,end:1936,age:16,title:'국경 너머의 독립운동 소식',
  desc:'만주와 국경 지방에서 독립운동에 참여한 사람의 소문이 들려온다.',options:[
  opt('국경 밖에 간 사람의 마지막 주소를 수소문한다','먼 지역의 소식이 끊겼다. 인편이 아는 고을과 거처를 묻고 종이에 적는다.','전해 들은 지명과 주소를 남겼지만 실제로 그곳에 있는지는 확인하지 못했다.',{bonds:4,knowledge:2}),
  opt('돌려 읽는 글의 출처와 날짜를 확인한다','독립운동 소식이라며 건넨 종이가 언제 나온 것인지 읽고 확인한다. 단속을 경계해야 한다.','종이에 적힌 날짜와 소문의 내용을 나누어 적었다. 어떤 말이 사실인지는 끝내 분명하지 않았다.',{knowledge:4}),
  opt('국경 소식을 기다리며 오늘의 품일을 마친다','먼 곳으로 바로 갈 형편이 아니다. 먼저 집안에 필요한 돈과 먹을 것을 마련한다.','품일을 끝내고 식구의 끼니를 마련했다. 멀리 떠난 사람의 소식은 계속 기다렸다.',{wealth:2})]},
 {id:'press',start:1920,end:1936,age:12,title:'신문에 실리지 못한 이야기',
  desc:'검열로 신문 기사가 지워졌다는 이야기가 장터를 돈다.',options:[
  opt('장터 사람들에게 지워진 기사 내용을 서로 확인한다','신문에 검은 자국만 남았다. 누가 직접 읽었는지 묻되 소문을 사실처럼 옮기지 않는다.','서로 다르게 들은 내용을 비교했다. 확인하지 못한 부분은 모른다고 남겨 두었다.',{knowledge:3}),
  opt('신문의 남은 문장을 읽으며 어려운 낱말을 익힌다','글자를 익혀야 어떤 소식이 빠졌는지 스스로 짐작할 수 있다. 하루의 공부 시간을 따로 낸다.','신문에서 읽을 수 있는 문장과 모르는 낱말을 베껴 썼다. 글을 읽는 속도가 조금씩 늘었다.',{knowledge:4}),
  opt('신문 이야기는 집 밖에서 멈추고 가족의 안부를 묻는다','단속이 걱정되어 밖에서 더 묻지 않는다. 대신 늦게 귀가하는 식구를 기다린다.','가족이 집에 돌아오는지 확인했다. 기사에서 무엇이 지워졌는지는 끝내 알 수 없었다.',{bonds:3})]},
 {id:'shrine',start:1937,end:1945,age:10,title:'신사참배를 강요받다',
  desc:'학교와 마을에서 신사참배에 관한 통보가 내려온다.',options:[
  opt('신사참배 통보 내용을 집안 어른과 함께 읽는다','통보가 학교에 해당하는지 마을 전체에 해당하는지 살핀다. 어떻게 대응할지 가족과 의논한다.','언제 어디로 모이라는 말이 있었는지 확인했다. 가족은 강요를 피하기 어려운 현실을 이야기했다.',{bonds:4,knowledge:2}),
  opt('학교에 다니는 이웃에게 통보와 처벌 내용을 묻는다','학생이 없는 집에도 학교에서 벌어지는 일은 전해진다. 실제로 어떤 지시가 내려왔는지 알아본다.','학교를 다니는 이웃에게 들은 지시를 적었다. 그 일로 누가 불이익을 받을지는 알 수 없었다.',{knowledge:3}),
  opt('참배 날짜를 피해 가족의 장보기와 이동을 조정한다','강요받는 상황에서 식구가 길목의 불시에 단속받지 않도록 이동 시간을 맞춘다.','식구가 어디로 갈지 서로 알려 주었다. 강요 자체가 사라진 것은 아니었다.',{bonds:3,health:-1})]},
 {id:'name',start:1940,end:1945,age:14,title:'창씨개명 신고를 재촉하다',
  desc:'면사무소에서 성과 이름을 일본식으로 바꾸는 신고를 재촉한다.',options:[
  opt('신고서에 적힐 이름을 가족과 대조한다','창씨개명을 재촉하는 서류가 왔다. 기존 호적의 이름과 바뀔 표기를 함께 확인한다.','서류에 적힌 이름을 가족의 기록과 비교했다. 어떤 이름으로 불려야 할지를 두고 오래 이야기했다.',{bonds:4,knowledge:2}),
  opt('신고 기한과 압박 내용을 종이에 적어 둔다','면사무소에서 언제까지 신고하라 했는지 기록한다. 미루는 동안 불이익을 겪을 수도 있다.','통보 날짜와 담당자가 전한 말을 적었다. 기한을 넘길 때의 위험은 그대로 남았다.',{health:-2,knowledge:2}),
  opt('신고를 하고 집안에서 쓰던 이름도 따로 적어 둔다','행정상 불이익을 걱정해 신고한다. 그래도 집에서 부르던 이름을 가족에게 남긴다.','신고한 표기와 집안에서 부르던 이름을 함께 적어 두었다. 두 이름이 생긴 까닭을 기억했다.',{health:1,happiness:-2})]},
 {id:'requisition',start:1938,end:1945,age:13,title:'마을에 공출 명령이 내려오다',
  desc:'쌀과 물건을 내라는 명령에 곳간과 살림을 다시 헤아린다.',options:[
  opt('공출하고 남을 양식을 식구 수대로 나눈다','낼 곡식을 덜어 내면 남은 밥이 얼마나 되는지 계산해야 한다. 끼니의 양을 줄일 수밖에 없다.','공출 뒤 남은 곡식을 세어 식구가 먹을 양을 정했다. 곳간의 바닥이 보이기 시작했다.',{wealth:-4,bonds:3}),
  opt('굶는 이웃집에 좁쌀 한 됫박을 나눠 준다','우리 집 양식도 부족하지만 어린 식구가 굶는 집이 있다. 돌려받지 못할 수도 있다.','이웃집에 좁쌀을 건넸다. 우리 집 곡식은 줄었고 이웃은 그날 밥을 지을 수 있었다.',{wealth:-2,bonds:4}),
  opt('걷어 간 곡식의 수량과 명목을 적어 둔다','나중에 같은 양을 다시 요구받지 않도록 받은 명령과 낸 양을 종이에 적는다.','관청에 낸 곡식의 수량을 장부에 옮겼다. 그 기록만으로 부당한 공출을 막을 수는 없었다.',{health:-2,knowledge:2})]},
 {id:'mobilization',start:1939,end:1945,age:17,title:'먼 일터로 가라는 명령',
  desc:'전쟁을 위한 인력 동원이 확대된다. 집안의 젊은이가 먼 일터로 떠날 수 있다.',options:[
  opt('끌려가는 사람의 짐에 말린 밥과 옷을 넣는다','먼 일터로 가는 사람이 있다. 길에서 먹을 것과 갈아입을 옷을 마련하지만 돌아올 날짜는 알 수 없다.','남은 곡식으로 마른 밥을 챙겨 주었다. 떠난 뒤에는 식구가 먼저 그 사람의 안부를 묻게 되었다.',{wealth:-3,bonds:4}),
  opt('떠나는 사람에게 받을 편지의 주소를 적어 준다','편지가 오갈 길을 만들려고 집과 일터의 주소를 서로 적는다. 우편이 닿는다는 보장은 없다.','서로의 주소를 적어 둔 종이를 건넸다. 답장이 오지 않아도 소식을 찾아볼 곳이 남았다.',{knowledge:2,bonds:4}),
  opt('빈자리를 메울 집안의 밭일과 품일을 나눈다','일손 하나가 빠져 수확과 땔감 마련을 다시 배분해야 한다. 남은 식구의 부담이 늘어난다.','논과 장터에 나갈 날을 나누어 정했다. 일을 떠맡은 식구들은 이전보다 쉽게 지쳤다.',{health:-3,bonds:3})]},
 {id:'clothes',start:1910,end:1945,age:10,title:'거리에서 바뀌는 차림',
  desc:'한복 차림 사이로 양복과 모자, 안경을 쓴 사람이 오간다.',options:[
  opt('안경 쓴 사람에게 신문 한 줄을 읽어 달라 부탁한다','길에서 본 새로운 물건이 궁금하다. 읽지 못한 기사 제목을 읽어 줄 수 있는지 정중히 묻는다.','안경을 낀 사람이 종이의 글을 읽어 주었다. 글을 읽는 도구와 배우는 일에 관심이 생겼다.',{knowledge:3}),
  opt('해진 저고리의 팔꿈치를 헌 천으로 덧댄다','새 옷을 살 돈이 부족하다. 남은 천을 잘라 옷을 기워 이번 계절을 넘기려 한다.','저고리의 헤진 부분을 덧대었다. 새 옷을 살 돈은 남겼지만 바느질할 시간이 들었다.',{wealth:2}),
  opt('양복과 두루마기의 차이를 장터에서 살펴본다','같은 거리에도 여러 옷차림이 보인다. 천과 단추, 모자 모양이 어떻게 다른지 눈여겨본다.','장터에서 본 옷의 모양을 집안에 이야기했다. 입는 옷은 그대로였지만 새로운 차림을 알게 되었다.',{knowledge:2,happiness:2})]}
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
