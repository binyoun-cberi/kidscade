/* Village state and episodic lives, fictional probabilities, historically contextual scenes. */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,
   root?.OneLifeJoseon4,root?.OneLifeJoseon5,root?.OneLifeJoseon8);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon9=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V4,V5,V8){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rng=(seed,salt)=>{let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967296;};
const coastal=new Set(['경상도','전라도','황해도','평안도','함경도','제주도']);
const mountainous=new Set(['강원도','경상도','평안도','함경도']);
const bonded=s=>['사노비','공노비'].includes(s.origin)&&!s.freed;
const farmer=s=>/농가|양반|서리|노비|소작|농사/.test(String(s.origin||'')+' '+String(s.trade||''));
const hasField=(j,s)=>j.land>0||/소작 농가/.test(String(s.origin||''));
const op=(label,note,result,delta={},risk=0)=>({label,note,result,delta,risk});
const ev=(id,group,title,desc,condition,options,from=1392,until=1899)=>({id,group,title,desc,condition,options,from,until});
const EVENTS=[
 ev('water','farm','윗논과 아랫논','가뭄에 윗논 주인이 물꼬를 막았다. 집안이 일구는 아랫논으로 오던 물이 줄었다.',
  (l,j,s)=>j.region!=='한양'&&farmer(s)&&hasField(j,s),[
  op('윗논 주인에게 물꼬를 열어 줄 날짜를 청한다','물길을 막은 집을 찾아가 며칠씩 번갈아 물을 대자고 제안한다. 합의가 안 되면 아랫논의 모가 마를 수 있다.','윗논과 아랫논에서 물을 쓸 날짜를 정해 두었다. 다음 가뭄에도 약속을 지키는지가 중요해졌다.',{trust:6,water:4,bonds:3}),
  op('사람이 없는 밤에 막힌 물꼬를 직접 튼다','당장은 우리 집안이 일구는 논에 물이 들어온다. 들키면 윗논과 다투고 이웃의 신뢰를 잃는다.','밤에 물꼬를 열어 논에 물을 댔지만 윗논 주인과 사이가 틀어졌다.',{trust:-9,water:7}),
  op('마을 원로에게 두 논의 물길을 보여 주고 중재를 청한다','논의 위치를 함께 살피게 하여 한 집이 물을 독차지하지 않게 해 달라고 부탁한다.','원로들이 논둑에서 물길을 살펴보고 양쪽이 따를 차례를 이야기했다.',{trust:3,knowledge:2})]),
 ev('oxBirth','livestock','외양간의 송아지','기르던 소가 새끼를 낳았다. 송아지는 아직 제대로 일어서지 못한다.',
  (l,j,s,v)=>v.animals.ox>0,[
  op('송아지가 젖을 먹는지 살피고 어미 소에게 여물을 더 준다','태어난 송아지가 일어서지 못한다. 외양간을 마르게 치우고 어미 소가 먹을 여물을 더 마련한다.','외양간을 정리하고 송아지에게 필요한 먹이를 챙겼다. 돌보는 동안 집안의 곡식은 줄었다.',{grain:-2,health:-1}),
  op('가축을 길러 본 이웃에게 새끼 상태를 보여 준다','숨과 걸음걸이를 살펴 달라 부탁한다. 이웃은 다시 도울 수 있으나 새끼의 건강을 장담하진 않는다.','경험 많은 이웃에게 먹이는 방법을 들었다. 다음에 비슷한 일이 생기면 물어볼 사람이 생겼다.',{trust:4,knowledge:2}),
  op('상인에게 송아지를 팔고 그 값을 받는다','외양간을 더 늘릴 여유가 없다. 키우는 대신 팔면 당장의 살림돈을 마련할 수 있다.','송아지 값을 흥정하고 살림에 필요한 물건을 샀다. 키웠을 때의 이익은 얻지 못했다.',{capital:4})]),
 ev('toolLoan','livelihood','이웃집 농기구를 빌리는 날','밭을 손질할 괭이가 부족하다. 이웃에게 빌리거나 자기 집 도구를 고쳐 쓸 길을 생각한다.',
  (l,j,s,v)=>l.age>=16&&farmer(s)&&hasField(j,s)&&v.homes[0]?.wealth>=20,[
  op('이웃에게 괭이를 빌려 밭일을 마친 뒤 돌려준다','그날 밭일을 마친 뒤 괭이를 닦아 돌려준다. 이웃도 자신의 도구가 필요하다.',
   '이웃에게 괭이를 빌려 밭을 손질하고 그날 닦아서 돌려주었다.',{trust:3,knowledge:1}),
  op('쌀 두 되를 품삯으로 내고 농기구를 빌려 쓴다','쌀을 낼 수 있다면 빌리는 조건을 분명히 하고, 못 낼 형편이라면 일손으로 대신 갚는다.',
   '곡식을 내고 밭일을 마친 뒤 농기구를 씻어 돌려주었다.',{grain:-2,trust:1}),
  op('집에 있는 괭이의 자루와 날을 직접 고친다','나무와 철물 등 손볼 재료가 필요하지만 이웃에게 도구를 빌리지 않아도 된다.',
   '낡은 괭이를 손질해 다시 쓸 수 있게 했다. 시간이 지나면 다시 살펴야 한다.',{capital:-2,knowledge:3})]),
 ev('sickOx','livestock','외양간의 병든 가축','기르던 짐승이 먹이를 거부한다. 다른 가축까지 아플까 걱정이다.',
  (l,j,s,v)=>v.animals.ox+v.animals.pig+v.animals.chicken>0,[
  op('아픈 짐승을 따로 두고 물과 볏짚을 마련한다','먹지 못하는 짐승이 다른 가축과 한데 있지 않게 돌본다. 며칠간 사료와 일손이 더 든다.','앓는 가축에게 먹이와 물을 가져다주었다. 회복할지는 알 수 없어 외양간을 계속 살폈다.',{grain:-3,health:-2}),
  op('병든 가축을 본 적 있는 이웃에게 증상을 보여 준다','무엇을 먹였는지 이야기하고 어떻게 돌보는지 물어본다. 병이 심하면 의원의 도움도 필요할지 모른다.','이웃의 말을 듣고 먹이와 잠자리를 살폈다. 며칠 동안 병세가 나아지는지 지켜보았다.',{trust:4,capital:-2}),
  op('멀쩡한 짐승을 따로 옮기고 외양간을 치운다','병이 번질까 걱정되어 함께 두지 않는다. 옮기는 일과 잃을 수 있는 가축이 부담이다.','건강한 짐승을 따로 두었다. 앓는 짐승의 상태가 악화될 가능성은 여전히 남았다.',{capital:-2,knowledge:1})]),
 ev('wildBoar','farm','멧돼지가 밭을 헤집다','밤새 멧돼지가 콩과 조를 심은 밭을 뒤집었다.',
  (l,j,s)=>j.region!=='한양'&&hasField(j,s),[
  op('무너진 울타리 자리에 말뚝과 나뭇가지를 보탠다','짐승이 들어온 틈을 막아 다음 피해를 줄이려 한다. 재료를 구하느라 비용과 곡식을 쓴다.','헤집힌 밭의 울타리를 다시 세웠다. 짐승이 다른 곳으로 돌아 들어올 위험도 남았다.',{capital:-3,grain:-2}),
  op('이웃과 날을 정해 밭 근처를 번갈아 살핀다','혼자 밤길에 나서기 위험해 여럿이 순번을 정한다. 잠과 일손을 더 써야 한다.','밭을 살피는 날을 이웃과 나눴다. 밤마다 혼자 산짐승을 마주칠 위험을 줄였다.',{trust:5,health:-2}),
  op('관아에 콩밭 피해와 짐승이 다닌 자리를 알린다','마을 여러 집이 같은 피해를 봤는지 확인하고 순찰을 청한다. 지원이 꼭 나오는 것은 아니다.','피해를 본 밭과 발자국을 알렸다. 관아가 언제 대응할지는 알 수 없었다.',{knowledge:2,health:-1})]),
 ev('tigerHouse','danger','범이 민가에 내려온 밤','산기슭 집에서 고함소리가 들린다. 마당에 범이 나타났다고 한다.',
  (l,j)=>mountainous.has(j.region),[
  op('식구를 안채로 들이고 문과 창을 단단히 잠근다','범이 마당 가까이 왔다는 소리를 들었다. 밖에 있는 사람을 찾으러 나서기보다 먼저 가까운 식구를 들인다.','식구가 문 안에 모였는지 확인했다. 범이 지나갈 때까지 불을 켜고 기다렸다.',{bonds:4,health:1}),
  op('관아에 범이 나타난 집과 산길을 알려 포수 파견을 청한다','정확한 위치를 알려야 다른 사람이 같은 길을 피할 수 있다. 포수가 바로 오지는 않을 수 있다.','어느 산기슭에서 범을 봤는지 전했다. 사람들은 그 길의 통행을 조심했다.',{knowledge:3,trust:2}),
  op('이웃들과 횃불을 들고 마을 어귀에서 범을 막는다','범이 민가로 더 내려오지 않게 하려는 위험한 행동이다. 다치거나 목숨을 잃을 수도 있다.','횃불을 든 사람들이 마을 어귀에 모였다. 범을 쫓는 과정에서 목숨이 위험했던 밤으로 남았다.',{health:-8,trust:4},.04)]),
 ev('midwife','family','산파를 부른 밤','가까운 집안에서 산기가 시작되었다. 산파를 부르고 따뜻한 물을 마련해야 한다.',
  (l)=>l.age>=16&&l.age<=75,[
  op('산파가 쓸 따뜻한 물과 마른 천을 준비한다','가까운 집안에서 아이를 낳는 중이다. 산파가 필요로 할 물건을 챙기되 산모의 곁은 경험 있는 사람에게 맡긴다.','산파에게 따뜻한 물과 천을 건넸다. 출산이 끝난 뒤에도 산모에게 도움이 필요한지 물었다.',{bonds:5,capital:-2}),
  op('아이를 낳아 본 이웃에게 산파를 부를 길을 묻는다','혼자 방법을 짐작하지 않고 경험 있는 사람을 찾는다. 부를 사람을 만나기까지 시간이 걸릴 수 있다.','이웃에게 어느 집에 산파가 있는지 물었다. 사람을 부르러 갈 길을 알아냈다.',{trust:5,bonds:2}),
  op('산모 곁에서 불을 지키고 필요한 물건을 가져다준다','밤새 산파의 요청에 따라 물과 천을 옮긴다. 잠을 못 자 다음 날 일손이 줄 수 있다.','필요한 것을 나르며 밤을 지새웠다. 산모와 아기의 안부를 이후에도 물었다.',{health:-2,bonds:6})]),
 ev('marriage','family','혼처를 묻는 중매쟁이','집안 어른과 중매쟁이가 혼처와 본관을 알아본다.',
  (l,j,s,v,f)=>l.age>=15&&l.age<=37&&!f.spouse,[
  op('서로의 본관과 친족 관계를 살핀다','가문의 관례를 확인한다','집안 어른들이 혼처에 관한 이야기를 이어 갔다.',{knowledge:3}),
  op('두 사람의 마음을 먼저 묻는다','집안의 뜻과 다를 수 있다','혼사를 두고 식구들과 오랫동안 이야기를 나눴다.',{bonds:3,trust:1}),
  op('당분간 생업에 전념한다','혼인을 서두르지 않는다','중매 이야기는 한동안 잦아들었다.',{capital:2,knowledge:2})]),
 ev('filial','family','연로한 부모님의 기침','집안의 어른이 몸을 가누기 힘들어 한다.',
  (l,j,s,v,f)=>f.parents>0&&l.age>=25,[
  op('부모 곁에서 물을 먹이고 밤새 기침을 살핀다','연로한 부모가 아프다. 일을 줄이고 곁을 지키며 물과 덮을 것을 챙긴다.','부모의 기침이 심한 밤 곁을 지켰다. 며칠간 집안 생업을 맡을 사람도 찾아야 했다.',{bonds:5,capital:-2}),
  op('돌볼 형제자매가 있는지 확인해 방문 시간을 나눈다','한 사람만 일을 멈추기 어렵다. 서로 가능한 날을 묻고 진료와 식사를 나눠 맡는다.','돌볼 수 있는 친족과 시간을 상의했다. 혼자 감당할 일을 나누어 맡을 길을 찾았다.',{trust:3,bonds:3}),
  op('의원에게 증상을 설명하고 약재값을 물어본다','기침이 길어져 진료가 필요하다고 생각한다. 비용을 마련해야 하지만 낫는다고 보장할 수는 없다.','의원에게 증상을 전하고 약재를 구했다. 몸이 나아지는지는 계속 살펴야 했다.',{capital:-4,knowledge:2})]),
 ev('gender','status','아들과 딸에게 서로 다른 기대','어른들은 아들과 딸이 배울 일과 혼처를 다르게 이야기한다.',
  (l)=>l.age>=10&&l.age<=35,[
  op('집안 어른에게 배우고 싶은 글이나 생업을 말한다','아들과 딸에게 다르게 기대하는 집안에서 내가 익히려는 일을 직접 설명한다. 반대가 있을 수도 있다.','배우고 싶은 일을 말하고 허락받을 길을 찾았다. 가족의 의견은 한 번에 바뀌지 않았다.',{knowledge:4,bonds:-1}),
  op('글을 익힌 친족에게 쉬는 날 한 자씩 가르쳐 달라 청한다','집안의 일을 마친 뒤라도 배울 시간을 만들려 한다. 친족이 도와줄지는 그 사람의 사정에 달렸다.','아는 글자를 알려 줄 사람에게 부탁했다. 틈이 날 때마다 몇 글자씩 읽어 보았다.',{bonds:4,knowledge:2}),
  op('집안일을 맡으며 바느질·장부 등 한 가지 솜씨를 익힌다','큰돈 없이 시작할 수 있는 일을 골라 반복해 본다. 배우고 싶은 다른 일은 미뤄질 수 있다.','맡은 일을 하며 손기술을 익혔다. 익힌 일을 나중에 쓰는 길을 생각했다.',{knowledge:3,capital:1})]),
 ev('baekjeong','status','고기를 손질한 장날','고기와 가죽을 내놓았지만 사람들은 백정의 집안을 멀리한다.',
  (l,j,s)=>s.origin==='백정',[
  op('가죽을 잘 손질해 제값에 판다','솜씨와 거래를 이어 간다','가죽을 샀던 손님이 다시 찾아왔다.',{capital:4,health:-2}),
  op('차별을 따져 묻는다','고을의 편견과 부딪힌다','그날의 말다툼이 고을에 오래 남았다.',{knowledge:2,bonds:-2}),
  op('가족에게 도축 기술을 가르친다','집안의 생업을 잇는다','자녀가 가죽을 다루는 솜씨를 익혀 갔다.',{knowledge:4,bonds:3})]),
 ev('market','livelihood','장시에 내다 판 물건','손수 만든 삼베와 도자기를 장터에 가져왔다.',
  (l)=>l.age>=16,[
  op('삼베와 도자기의 값을 따로 붙여 직접 흥정한다','만든 물건의 품과 재료값을 설명하며 장터 손님을 만난다. 팔리지 않으면 집으로 다시 가져와야 한다.','장터에서 물건마다 받을 값을 설명했다. 흥정에 쓴 시간만큼 새 물건을 만들 시간은 줄었다.',{capital:4,knowledge:2}),
  op('보부상에게 운송 품삯과 받을 돈을 미리 정한다','먼 고을로 물건을 보내되 길에서 없어지거나 값이 달라질 위험이 있다.','보부상과 보낼 물건의 수, 가져갈 품삯을 정했다. 값을 받는 일은 뒤에 확인해야 했다.',{capital:2,trust:3}),
  op('큰 상인과 외상거래로 받을 날짜를 적어 둔다','한꺼번에 많이 팔 수 있지만 돈을 늦게 받으면 집안 살림이 빠듯해질 수 있다.','큰 상인과 거래 날짜와 금액을 적었다. 약속한 돈을 제때 받을지는 알 수 없었다.',{capital:5,trust:-2})]),
 ev('temple','religion','시주를 청하는 스님','문밖에 스님이 서 있다. 절에서는 곡식과 땔감이 필요하다고 한다.',
  ()=>true,[
  op('쌀 한 줌을 시주한다','집안의 곳간도 살핀다','스님이 다른 철에 안부를 전했다.',{grain:-2,bonds:3}),
  op('절의 땔감 나르는 일을 돕는다','힘은 들지만 손을 보탠다','절에서 일하던 이웃과 다시 만났다.',{health:-2,bonds:3}),
  op('시주할 곡식이 부족하다고 스님에게 설명한다','지금은 나눌 수 없어 집안의 양식을 남겨 둔다','스님에게 형편을 설명했다. 스님은 다음 집으로 향했다.',{})]),
 ev('shaman','religion','무당의 굿판','고을에 굿판이 벌어졌다. 장단과 기원 소리가 들린다.',
  ()=>true,[
  op('장단과 이야기를 듣는다','사람들이 모인 자리를 구경한다','굿판에서 들은 장단이 한동안 귀에 남았다.',{happiness:3,knowledge:2}),
  op('앓는 식구부터 살핀다','몸이 아픈 사람을 돌본다','병든 식구는 며칠을 쉬며 몸을 추슬렀다.',{bonds:4,health:2}),
  op('마을 어른께 전해 온 풍속을 묻는다','옛이야기를 듣는다','이 고을의 옛 이야기를 더 알게 되었다.',{knowledge:3,trust:2})]),
 ev('ginseng','livelihood','심마니의 약초길','깊은 산을 다녀온 심마니가 약초 이야기를 들려준다.',
  (l,j)=>mountainous.has(j.region),[
  op('산길을 배우러 따라간다','험한 지형을 익힌다','산의 약초와 길을 조금씩 구별하게 됐다.',{knowledge:4,health:-2}),
  op('약초를 캐 장터에 판다','험한 길에서 벌이를 찾는다','약초를 가져오던 길을 오래 기억했다.',{capital:4,health:-3}),
  op('위험한 산행은 피한다','집안의 일을 이어 간다','돌아온 심마니에게 산 이야기를 들었다.',{health:2,capital:1})]),
 ev('salt','livelihood','소금을 마련하는 해안','바닷가에서 소금을 만드는 사람들이 더운 날씨에 일한다.',
  (l,j)=>coastal.has(j.region),[
  op('소금 만드는 일을 배운다','바닷물과 햇볕, 불을 다룬다','배운 솜씨가 소금 장사에 도움이 되었다.',{knowledge:3,capital:2,health:-2}),
  op('소금을 장터로 나른다','짐을 옮겨 품삯을 받는다','소금 자루를 나르던 이웃과 다시 마주쳤다.',{capital:3,health:-2}),
  op('다른 고을의 소금값을 알아본다','값의 차이를 듣는다','장터에서 알게 된 소금값을 식구들과 나눴다.',{knowledge:3,trust:1})]),
 ev('haenyeo','danger','바다에 물질하러 간 날','해안의 여인들이 숨을 참고 해산물을 캔다. 깊이 잠수할수록 몸에 부담이 간다.',
  (l,j)=>j.region==='제주도'&&l.gender==='여자'&&l.age>=15,[
  op('얕은 물에서 물질한다','물살과 몸 상태를 살핀다','잡아 온 해산물로 가족의 끼니를 보탰다.',{capital:2,health:-1}),
  op('동무와 함께 물질한다','서로 안전을 살핀다','물질을 함께하던 동무와 고생을 나눴다.',{capital:3,bonds:3,health:-3},.012),
  op('더 깊은 곳까지 내려간다','몸이 상하거나 목숨을 잃을 수 있다','물질 뒤 오래도록 몸을 추스르는 날이 있었다.',{capital:6,health:-10},.055)]),
 ev('fishing','danger','풍랑에 갇힌 어선','바람이 거세지고 파도가 높아졌다. 조업을 더 할지 돌아갈지 정해야 한다.',
  (l,j,s)=>/어부|수군/.test(s.origin)||/어부|뱃사공/.test(j.occupation),[
  op('그물을 거두고 포구로 돌아간다','고기보다 사람을 지킨다','돌아온 그날 이후로 물때와 바람을 더 살폈다.',{capital:-2,health:2}),
  op('동료와 배를 지켜 본다','힘을 모아 파도를 버틴다','그때 함께했던 동료가 오래 기억에 남았다.',{bonds:3,health:-5},.02),
  op('고기를 더 잡으려 나아간다','배가 전복될 수도 있다','위험을 무릅쓴 그날을 다시 떠올렸다.',{capital:5,health:-10},.09)]),
 ev('taxBoat','livelihood','조운선에 실을 세곡','포구에 조운선이 들어왔다. 곡식 자루와 장부를 맞추는 일이 분주하다.',
  (l,j)=>coastal.has(j.region)||j.region==='충청도',[
  op('곡식 자루를 싣는다','무거운 짐을 옮겨 품삯을 받는다','세곡을 실었던 배가 먼 고을로 떠났다.',{capital:3,health:-2}),
  op('풍랑이 지나가길 기다린다','배의 안전을 먼저 살핀다','바람이 잦아든 뒤 배가 출항했다.',{knowledge:2,capital:-1}),
  op('관아의 장부를 도와 본다','쌀자루 수와 문서를 대조한다','서리가 다음에도 장부를 도와 달라 했다.',{knowledge:4,trust:1})]),
 ev('village','village','옆 마을의 장터 싸움','장터 자리를 놓고 이웃 마을과 말다툼이 났다.',
  (l,j)=>j.region!=='한양',[
  op('두 마을 어른에게 장터 자리와 날짜를 나누자 청한다','길이 좁아 물건을 펼 곳에서 싸움이 난다. 장날과 자리를 정하면 다툼을 줄일 수 있다.','장터에 어느 마을이 설 자리를 쓸지 의논했다. 합의를 지킬지는 더 지켜봐야 했다.',{trust:6,bonds:2}),
  op('우리 마을 상인의 물건을 먼저 진열하도록 주장한다','우리 마을의 장사꾼이 자리를 잃을까 걱정된다. 이웃 마을과 관계가 나빠질 수 있다.','우리 마을 사람들이 자리를 지켰지만 이웃 마을과 말다툼이 더 이어졌다.',{trust:-5,bonds:3}),
  op('양쪽 장사꾼이 서로 부족한 물건을 바꾸도록 제안한다','한쪽이 가진 나무와 다른 쪽이 가진 곡식을 교환하면 장터를 나눠 쓸 이유가 생긴다.','서로 가진 물건을 펼쳐 보이며 값을 맞췄다. 장터 자리를 두고 싸우던 사람도 거래 이야기를 시작했다.',{trust:4,capital:2})]),
 ev('holiday','culture','한가위의 송편','햅쌀로 만든 송편을 나누고 친족이 안부를 묻는다.',
  ()=>true,[
  op('송편 몇 개를 싸 들고 멀리 지내던 친족을 찾아간다','한가위에 찾아뵙지 못한 어른의 안부가 궁금하다. 장거리 길을 나설 시간이 필요하다.','어른에게 송편을 건네고 집안 소식을 들었다. 오래 지낸 친족의 생활을 새로 알았다.',{bonds:5}),
  op('마을 윷판에서 이웃과 편을 나누어 논다','추수로 바쁘던 사람들과 잠깐 놀이하며 지낸다. 일을 멈추는 시간도 필요하다.','이웃과 윷을 던지며 웃었다. 다음 장날 다시 볼 사람들과 인사를 나눴다.',{happiness:5,trust:2}),
  op('끼니가 모자란 이웃집에 송편과 쌀을 가져간다','우리 집 양식을 조금 덜어 혼자 명절을 보내는 이웃에게 건넨다. 곳간의 양은 줄어든다.','송편과 쌀을 건네고 잠시 이야기를 나눴다. 이웃은 그날 한 끼를 더 마련할 수 있었다.',{grain:-2,trust:5})]),
 ev('seollal','culture','설날의 첫 아침','설을 맞아 집안 어른께 세배하고 떡국을 나눈다.',
  ()=>true,[
  op('웃어른께 세배하며 올해 집안의 할 일을 여쭙는다','새해 인사를 드리고 어른의 덕담을 듣는다. 먼 집이면 길을 나설 시간을 내야 한다.','세배를 드리고 올해 농사와 식구의 안부를 이야기했다.',{bonds:3,happiness:2}),
  op('어린 식구와 윷·팽이 놀이판을 만든다','아이들이 직접 놀 수 있게 물건을 모으고 규칙을 알려 준다. 설날의 일을 잠시 쉰다.','윷을 나누어 던지고 팽이를 돌렸다. 어린 식구는 놀이 방법을 다시 물었다.',{happiness:5,bonds:3}),
  op('떡국 재료가 모자란 집에 떡과 국거리를 덜어 준다','이웃집 살림을 알고 있어 우리 집 재료를 조금 나누려 한다. 우리 집에 남는 양은 줄어든다.','떡과 국거리를 가져다주었다. 이웃집은 새해 아침에 국을 끓일 재료를 마련했다.',{trust:5,grain:-1})]),
 ev('secondary','status','서얼의 배움과 벼슬길','적자와 서얼을 다르게 대하는 집안 관습으로 다툼이 일어났다.',
  (l,j,s)=>/양반|왕실/.test(s.origin),[
  op('서얼 친족의 배움을 돕는다','다른 관습을 주장한다','친족이 배움을 이어 갔다는 소식을 들었다.',{knowledge:2,bonds:5}),
  op('집안의 규범을 따른다','다툼은 피할 수 있다','서먹해진 가족 사이가 쉽게 풀리지 않았다.',{bonds:-2,capital:1}),
  op('다른 생업을 찾도록 돕는다','새로운 기회를 함께 찾는다','멀리서 친족의 안부가 전해졌다.',{capital:-2,bonds:4})]),
 ev('namsadang','culture','남사당패가 장터에 들다','놀이패가 재주와 재담을 펼치자 장터가 떠들썩해졌다.',
  ()=>true,[
  op('놀이판에서 재담을 듣는다','한나절 일을 잊는다','장터에 웃음소리가 남았다.',{happiness:4}),
  op('놀이패의 짐을 옮긴다','길 위에서 사는 사람의 사연을 듣는다','놀이패가 다른 고을로 떠난 뒤에도 소문이 전해졌다.',{knowledge:3,capital:1}),
  op('집안일을 마저 한다','바쁜 살림을 꾸린다','놀이패 이야기는 밥상에서 들었다.',{capital:2})],1650),
 ev('court','status','궁녀를 뽑는다는 소식','궁궐에서 일할 여인을 뽑는다는 소문이 돌았다.',
  (l,j,s)=>l.gender==='여자'&&l.age>=12&&l.age<=21&&!bonded(s),[
  op('궁중의 규율을 알아본다','출신과 조건이 맞는지 살핀다','궁에서 일하는 사람이 알려 준 이야기를 들었다.',{knowledge:4}),
  op('고향에서 배움을 이어 간다','궁궐 밖의 살림을 택한다','고향에서 익힌 일을 계속했다.',{knowledge:2,bonds:2}),
  op('궁에 들어간 아는 이의 안부를 묻는다','멀리 떠난 이가 걱정된다','궁궐에서 일하던 사람의 소식을 전해 들었다.',{bonds:3})]),
 ev('examRoad','learning','한양으로 과거 보러 가는 길','먼 길을 떠날 여비와 묵을 곳을 마련해야 한다.',
  (l,j,s)=>l.gender==='남자'&&l.age>=17&&j.literacy>=2&&!bonded(s),[
  op('친척집을 거쳐 간다','먼 길을 나누어 걸어간다','시험을 보러 다녔던 친척집에 다시 들렀다.',{capital:-2,knowledge:3}),
  op('길동무와 함께 한양에 간다','함께 밤길을 피한다','함께 걸었던 벗과 시험 이야기를 나누었다.',{bonds:3,knowledge:4}),
  op('이번 시험은 미루고 공부한다','배움을 이어 간다','다음 시험을 기다리며 밤마다 책을 읽었다.',{knowledge:5})]),
 ev('militia','war','전란에 의병을 일으키다','왜군이 쳐들어왔다는 소식에 마을 사람들이 군량과 무기를 모은다.',
  (l)=>l.year>=1592&&l.year<=1599&&l.age>=15,[
  op('피란민과 군량을 돕는다','조와 보리, 물을 마련한다','고을 사람들은 힘을 합쳐 어려운 시절을 버텼다.',{grain:-4,bonds:4}),
  op('조총과 군수품을 옮긴다','위험한 길이지만 필요한 물자다','그때 함께 무기를 옮기던 동료가 떠올랐다.',{health:-3,knowledge:2}),
  op('의병대에 들어가 싸운다','살아서 돌아오지 못할 수 있다','싸움을 마친 뒤 살아 돌아온 이들과 소식을 나눴다.',{health:-7,bonds:2},.07)]),
];
const BY_ID=new Map(EVENTS.map(x=>[x.id,x]));
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.joseon9){
  const j=J.ensure(l);const houses=Array.from({length:3},(_,i)=>{
   const c=V8.CLANS[Math.floor(rng(l.seed,6100+i)*V8.CLANS.length)];
   return {id:'n'+i,name:c[0]+['만복','복이','순덕','덕수'][Math.floor(rng(l.seed,6200+i)*4)],
    wealth:Math.floor(rng(l.seed,6300+i)*85)+5,trust:Math.floor(rng(l.seed,6400+i)*45)+25,field:Math.floor(rng(l.seed,6500+i)*5)};
  });
  l.joseon9={version:1,processedYear:l.year,animals:{ox:j.region==='한양'?0:1,pig:1,chicken:2},
   water:35+Math.floor(rng(l.seed,6700)*40),trust:50,homes:houses,
   seen:[],queue:[],active:null,decisions:[],followups:[],memories:[]};
 }
 return l.joseon9;
}
function eligible(l,e,s=ensure(l)){
 if(!J.inOldEra(l)||!l.alive||l.age<8||l.age>77||l.year<e.from||l.year>e.until)return false;
 return !!e.condition(l,J.summary(l),V5.summary(l),s,V4.summary(l));
}
function promote(l,s){if(!s?.active&&!l.pending&&l.alive&&s?.queue.length){
 s.active=s.queue.shift();l.pending='joseon9:'+s.active.id;
}}
function choiceFor(l,e,index){
 // Feeding the poor cannot mint rice out of an empty granary.
 // Offer real labor or transport as an alternative, preserving player agency.
 const grain=V2.ensure(l)?.grain||0;
 if(e.id==='holiday'&&index===2&&grain<2)
  return op('송편을 나눌 곡식이 없어 이웃의 마당 일을 거든다',
   '우리 집도 식량이 없어 나눌 수 없다. 대신 장작을 옮기고 마당을 치우는 일손을 보낸다.',
   '가져갈 곡식은 없었지만 이웃집에 가서 장작을 옮겼다. 한나절 몸을 써야 했다.',
   {health:-2,trust:3});
 if(e.id==='seollal'&&index===2&&grain<1)
  return op('떡국 재료 대신 물과 땔감을 길어다 준다',
   '나눌 떡과 곡식이 없다. 물을 길어 오고 아궁이를 돌보는 일로 이웃을 돕는다.',
   '떡을 나누지는 못했지만 이웃집에 물과 땔감을 가져다주었다.',
   {health:-2,trust:3});
 if(e.id==='toolLoan'&&index===1&&grain<2)
  return op('괭이를 빌리는 대신 하루 품일을 돕기로 한다',
   '빌리는 대가로 낼 쌀이 부족하다. 이웃에게 일손을 보태고 괭이를 잠시 빌리는 조건을 상의한다.',
   '이웃집 일을 하루 도우며 괭이를 빌려 썼다. 일을 마친 뒤 돌려주었다.',
   {health:-2,trust:2});
 if(e.id==='temple'&&index===0&&grain<2)
  return op('시주할 쌀이 없어 절의 빈 물통을 나른다',
   '곳간이 비어 곡식을 낼 수 없다. 대신 절의 물통을 채우는 일을 하겠다고 전한다.',
   '곡식을 내지는 못했지만 절에서 쓸 물통을 채웠다.',
   {health:-1,bonds:2});
 return e.options[index];
}
function prompt(l){const s=ensure(l),e=BY_ID.get(s?.active?.eventId);
 return !e?null:{title:e.title,description:e.desc,options:e.options.map((o,i)=>{
  const actual=choiceFor(l,e,i);return {label:actual.label,note:actual.note,action:actual.label};
 })};
}
function yearly(l,s){
 if(!s||!J.inOldEra(l)||!l.alive||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 if(l.joseon14?.captivity?.status==='held')return;
 const dry=rng(l.seed,l.year*17)<.13;s.water=clamp(s.water+(dry?-11:3),0,100);
 for(const h of s.homes)h.wealth=clamp(h.wealth+Math.floor(rng(l.seed,l.year+h.field*19)*7)-3,0,120);
 for(const f of s.followups.filter(f=>f.year<=l.year)){
  l.logEvent(f.text,'joseon9-followup');l.log.at(-1).causeId='joseon9:'+f.id;s.memories.push(f.text);
 }
 s.followups=s.followups.filter(f=>f.year>l.year);
 s.memories=s.memories.slice(-25);
 if(l.age>=13&&l.age<=73&&l.age%5===3&&s.queue.length<2){
  const pool=EVENTS.filter(e=>!s.seen.includes(e.id)&&eligible(l,e,s));
  if(pool.length){
   pool.sort((a,b)=>rng(l.seed,l.year*37+a.id.length*71)-rng(l.seed,l.year*37+b.id.length*71));
   const e=pool[0];s.seen.push(e.id);s.queue.push({id:l.year+'-'+e.id,eventId:e.id,year:l.year});
  }
 }
 promote(l,s);
}
function choose(l,index){
 const s=ensure(l),e=BY_ID.get(s?.active?.eventId);
 if(!l.alive||!e||!Number.isInteger(index)||index<0||index>=3)return false;
 const o=choiceFor(l,e,index),d=o.delta,j=J.ensure(l),v=V2.ensure(l),id=s.active.id;
 const stats={};for(const k of ['health','happiness','knowledge','wealth','bonds'])if(Number.isFinite(d[k]))stats[k]=d[k];
 l.change(stats);
 if(Number.isFinite(d.capital))j.capital=clamp(j.capital+d.capital,-120,600);
 if(Number.isFinite(d.grain))v.grain=clamp(v.grain+d.grain,0,200);
 if(Number.isFinite(d.water))s.water=clamp(s.water+d.water,0,100);
 if(Number.isFinite(d.trust)){s.trust=clamp(s.trust+d.trust,0,100);
  s.homes[0].trust=clamp(s.homes[0].trust+d.trust,0,100);}
 for(const animal of ['ox','pig','chicken'])
  if(Number.isFinite(d[animal]))s.animals[animal]=clamp(s.animals[animal]+d[animal],0,12);
 // The calf is already born at the beginning of the event: keeping it
 // after either care option adds an animal; selling it does not.
 if(e.id==='oxBirth'&&index!==2)s.animals.ox=clamp(s.animals.ox+1,0,12);
 l.logEvent(e.title+' — '+o.label,'joseon9-choice');l.log.at(-1).causeId='joseon9:'+id;
 s.decisions.push({id,eventId:e.id,year:l.year,option:index});s.decisions=s.decisions.slice(-70);
 s.followups.push({id,year:l.year+2+(index%2),text:o.result});s.followups=s.followups.slice(-55);
 s.active=null;l.pending=null;
 if(o.risk&&rng(l.seed,l.year+index*411+e.id.length*37)<o.risk){
  l.finish(e.id==='fishing'?'풍랑 속에서 배가 뒤집혀 고향에 돌아오지 못했다.':
   e.id==='haenyeo'?'물질 중 깊은 물속에서 몸이 상해 목숨을 잃었다.':
   e.id==='militia'?'전쟁터에서 목숨을 잃었다.':'범을 쫓다가 크게 다쳐 목숨을 잃었다.');
 }else promote(l,s);
 return true;
}
function summary(l){const s=ensure(l);return s?{clan:V8.summary(l).clan,animals:{...s.animals},
 water:s.water,trust:s.trust,neighbors:s.homes.map(h=>({...h})),decisions:s.decisions.length}:null}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseon9;if(!o||o.version!==1||!s)return s;
 const clean=q=>q&&BY_ID.has(q.eventId)&&typeof q.id==='string'&&Number.isInteger(q.year)&&q.year<=l.year&&q.year>=l.birthYear?
  {id:q.id.slice(0,70),eventId:q.eventId,year:q.year}:null;
 s.processedYear=clamp(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(id=>BY_ID.has(id)).slice(-EVENTS.length):[];
 s.queue=Array.isArray(o.queue)?o.queue.map(clean).filter(Boolean).slice(-3):[];
 s.active=clean(o.active);if(!l.alive||!J.inOldEra(l)||data?.pending!=='joseon9:'+s.active?.id)s.active=null;
 if(s.active)l.pending='joseon9:'+s.active.id;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(x=>x&&BY_ID.has(x.eventId)&&typeof x.id==='string'&&Number.isInteger(x.year)).slice(-70):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'
 &&Number.isInteger(x.year)&&x.year>l.year&&x.year<=l.year+5).slice(-55):[];
 for(const k of ['water','trust'])if(Number.isFinite(o[k]))s[k]=clamp(o[k],0,100);
 if(Array.isArray(o.homes))for(let i=0;i<Math.min(3,o.homes.length);i++)if(o.homes[i]?.id===s.homes[i].id){
  for(const k of ['wealth','trust','field'])if(Number.isFinite(o.homes[i][k]))s.homes[i][k]=clamp(o.homes[i][k],0,120);
 }
 if(o.animals)for(const k of ['ox','pig','chicken'])if(Number.isFinite(o.animals[k]))s.animals[k]=clamp(o.animals[k],0,12);
 s.memories=Array.isArray(o.memories)?o.memories.filter(x=>typeof x==='string').slice(-25):[];
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V4?.summary||!V5?.summary||!V8?.summary||Sim.Life.prototype.__joseon9)return false;
 const L=Sim.Life,pt=L.prototype.tick,pc=L.prototype.choose,pg=L.prototype.getChoice,pr=L.prototype.reflect,ps=L.prototype.snapshot,restore=L.restore;
 L.prototype.tick=function(){if(!J.inOldEra(this))return pt.call(this);
  const y=this.year,ok=pt.call(this);if(ok&&this.alive&&this.year!==y)yearly(this,ensure(this));return ok;};
 L.prototype.getChoice=function(){if(J.isJoseon(this)&&(typeof this.pending==='string'&&this.pending.startsWith('joseon9:')))return prompt(this);return pg.call(this);};
 L.prototype.choose=function(i){if(J.isJoseon(this)&&(typeof this.pending==='string'&&this.pending.startsWith('joseon9:')))return choose(this,i);
  const ok=pc.call(this,i);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;};
 L.prototype.reflect=function(t){const ok=pr.call(this,t);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const s=ps.call(this);if(J.isJoseon(this))s.joseon9=JSON.parse(JSON.stringify(ensure(this)));return s;};
 L.restore=function(d){const life=restore.call(this,d);if(life&&J.isJoseon(life))hydrate(life,d);return life;};
 Object.defineProperty(L.prototype,'__joseon9',{value:true});return true;
}
install();
return Object.freeze({EVENTS,ensure,eligible,choiceFor,yearly,choose,prompt,summary,install});
});
