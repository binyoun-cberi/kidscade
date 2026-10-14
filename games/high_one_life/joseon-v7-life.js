/* Joseon everyday-life situations: individual lives, not a historical-event census.
 * Context gated by era, place, status, age, gender, livelihood and relatives.
 * Choices affect existing stats, grain, household cash and long-lived relationships.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,root?.OneLifeJoseon4,root?.OneLifeJoseon5);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon7=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V4,V5){
'use strict';
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const rnd=(seed,salt)=>{
 let x=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;
 x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);
 return ((x^(x>>>16))>>>0)/4294967296;
};
const coastal=new Set(['경상도','전라도','황해도','함경도','평안도']);
const mountain=new Set(['강원도','함경도','평안도','경상도']);
const rural=s=>s.region!=='한양';
const bonded=s=>['공노비','사노비'].includes(s.origin)&&!s.freed;
const poor=s=>['소작 농가','몰락 양반','사노비','공노비','노비 후손 가계'].includes(s.origin);
const literate=(l,j,s)=>l.gender==='남자'&&!bonded(s)&&(j.literacy>=1||/양반|서리|역관|의관/.test(s.origin));
const opt=(label,note,change,after)=>({label,note,change,after});
// Each event is a playable vignette, not a claim that this happened to a real family.
// Historical year-gating follows known institutional chronology.
const EVENTS=[
 {id:'affection',group:'family',title:'마음이 가는 사람',desc:'장날마다 마주치던 사람의 얼굴이 눈에 들어온다.',age:[16,31],
  when:(l,j,s,f)=>!f.spouse,options:[
  opt('먼저 말을 건넨다','사람들 눈길이 조심스럽지만 안부를 묻는다',{bonds:5,happiness:3,affection:2},'장날이면 그 사람이 다시 올까 잠시 길을 바라보았다.'),
  opt('가족에게 마음을 털어놓는다','집안의 허락과 형편을 생각해야 한다',{bonds:3,affection:1},'혼사는 두 사람의 마음만으로 정해지지 않는다는 말을 들었다.'),
  opt('그 마음을 간직한다','당장은 하던 일을 이어 간다',{happiness:2},'가끔 먼 길에서 돌아온 날 그 얼굴이 떠올랐다.')]},
 {id:'friendship',group:'family',title:'오랜 길동무',desc:'어려서부터 함께 자란 벗이 먼 고을로 가겠다고 한다.',age:[13,67],options:[
  opt('길을 나서는 벗을 배웅한다','오래 쌓은 정을 잊지 않는다',{bonds:5,friendship:2},'먼 고을로 떠난 벗에게서 안부가 전해졌다.'),
  opt('서로 품을 나누자고 한다','다음 농번기에 다시 만나기로 한다',{bonds:4,friendship:2,grain:2},'벗과 함께 일하며 지난날의 이야기를 나눴다.'),
  opt('자기 일에 집중한다','인연이 소원해질 수도 있다',{wealth:2,friendship:-1},'가끔 벗을 생각했지만 좀처럼 만나지 못했다.')]},
 {id:'mourning',group:'family',title:'빈자리의 저녁',desc:'함께 살던 사람이 세상을 떠난 뒤 익숙한 자리가 유난히 허전하다.',age:[20,79],
  when:(l,j,s,f)=>!!f.spouse&&!f.spouse.alive,options:[
  opt('식구들과 옛이야기를 나눈다','떠난 이를 기억하며 서로를 위로한다',{bonds:5,happiness:-1,grief:1},'남겨진 식구들과 그 사람의 이름을 종종 입에 올렸다.'),
  opt('친척에게 도움을 청한다','살림과 마음을 함께 추슬러 본다',{bonds:4,capital:-2,grief:1},'친척이 찾아와 며칠간 집안일을 거들었다.'),
  opt('묵묵히 일손을 챙긴다','허전함을 안고 평소의 일을 이어 간다',{health:-2,grief:1},'계절이 바뀌어도 빈자리는 쉽게 익숙해지지 않았다.')]},
 {id:'parenting',group:'family',title:'아이가 말을 배우는 날',desc:'어린아이가 어른을 따라 말하고 손에 잡히는 것을 묻는다.',age:[20,56],
  when:(l,j,s,f)=>f.children>0,options:[
  opt('말을 들으며 함께 놀아 준다','생업은 잠시 미루고 아이 곁에 앉는다',{bonds:6,health:-1,care:2},'아이가 전에 들었던 말을 흉내 내며 웃었다.'),
  opt('집안의 일을 곁에서 가르친다','일을 함께 하며 익숙한 손길을 전한다',{knowledge:2,bonds:4,care:2},'아이는 어른의 손을 따라 작은 일을 해내기 시작했다.'),
  opt('친척에게 돌봄을 부탁한다','일손과 돌봄을 나누어 맡는다',{bonds:3,capital:-1,care:1},'도움을 준 친척에게 고마움을 전했다.')]},
 {id:'feast',group:'family',title:'이웃집 잔칫날',desc:'이웃집에서 잔치를 연다. 큰솥에는 음식이 끓고 사람들이 모여든다.',age:[10,70],options:[
  opt('음식을 만드는 일을 거든다','손을 보태고 이웃과 인사를 나눈다',{bonds:5,health:-1},'잔칫날 함께 솥을 지키던 이웃과 가까워졌다.'),
  opt('북적이는 자리에 함께 앉는다','노래와 이야기를 나누며 쉬어 간다',{happiness:5,bonds:2},'모여 앉아 웃던 그날의 소리가 오래 남았다.'),
  opt('집안에 남아 일을 마친다','바쁜 형편에 잔치를 오래 즐기지 못한다',{capital:3},'잔치는 지나갔고 집안의 일은 마무리되었다.')]},
 {id:'hobby',group:'family',title:'한가한 낮의 놀이',desc:'오랜만에 일이 일찍 끝났다. 마당에 이웃이 찾아왔다.',age:[11,74],options:[
  opt('윷과 장기를 꺼낸다','서로 웃고 다투며 한판 어울린다',{bonds:3,happiness:4,hobby:1},'일이 끝난 날이면 이웃이 다시 놀이판을 벌였다.'),
  opt('노랫가락과 장단을 익힌다','흥을 돋우며 시름을 잊는다',{happiness:5,knowledge:1,hobby:1},'익힌 노랫가락을 흥얼거리며 집으로 돌아왔다.'),
  opt('숲길을 거닐며 쉰다','바깥바람을 맞고 몸을 추스른다',{health:3,happiness:2},'숲길에서 보았던 풍경이 오래 기억에 남았다.')]},
 {id:'livestock',group:'livelihood',title:'외양간과 닭장의 아침',desc:'기르던 짐승들이 먹이를 기다린다. 가축도 집안의 귀한 살림이다.',age:[12,70],
  when:(l,j,s)=>rural(s)&&!bonded(s),options:[
  opt('송아지와 소를 돌본다','여물을 챙겨 두고 외양간을 살핀다',{health:-1,capital:2,stock:1},'돌보던 짐승이 자라 농사일에 보탬이 되었다.'),
  opt('닭과 돼지의 먹이를 챙긴다','작은 짐승부터 알뜰히 기른다',{capital:2,stock:1},'계절이 바뀌자 닭장과 우리에 새 식구가 생겼다.'),
  opt('이웃에게 가축 돌보는 법을 묻는다','낯선 병과 먹이 걱정을 나눈다',{knowledge:3,bonds:2},'가축이 아플 때 물어볼 이웃이 생겼다.')]},
 {id:'hyangyak',group:'village',title:'고을의 향약 모임',desc:'마을 어른들이 모여 이웃의 어려움을 어떻게 도울지 의논한다.',age:[18,76],from:1517,
  when:(l,j,s)=>rural(s),options:[
  opt('어려운 집을 함께 돕자고 한다','이웃과 쌀과 일손을 모으자고 청한다',{bonds:6,community:2,grain:-2},'마을 사람들이 힘든 집에 조금씩 양식을 보탰다.'),
  opt('부당한 벌과 차별에 의견을 낸다','향촌의 권력 있는 사람과 부딪힐 수 있다',{knowledge:3,community:1,health:-1},'이후 마을 모임에서 그날의 말이 다시 오갔다.'),
  opt('먼저 규약을 들어 본다','고을의 질서와 벌칙을 익힌다',{knowledge:3},'향약의 규율은 사람을 돕기도, 누군가를 억누르기도 했다.')]},
 {id:'duroe',group:'village',title:'논에 품이 모자란 날',desc:'장마를 앞두고 물길을 고쳐야 한다. 이웃이 함께 일을 하자고 찾아왔다.',age:[18,75],
  when:(l,j,s)=>rural(s),options:[
  opt('함께 논둑을 고친다','품앗이로 물길을 정리한다',{bonds:4,health:-2,community:1},'손보았던 논둑이 다음 큰비를 견디는 데 도움이 되었다.'),
  opt('가축과 짐을 빌려 준다','직접 일손을 내기 어려워 물건을 보탠다',{capital:-2,bonds:4},'빌려 준 짐승과 도구가 무사히 돌아왔다.'),
  opt('집안의 남은 일을 마친다','당장 내 살림도 지켜야 한다',{capital:2,bonds:-1},'마을 사람들은 그날의 일을 끝냈지만 서운함은 조금 남았다.')]},
 {id:'servant',group:'status',title:'머슴살이를 알아보다',desc:'주인집에 고용되어 농사를 거들면 품삯이나 먹을거리를 받을 수 있다.',age:[16,59],
  when:(l,j,s)=>rural(s)&&!bonded(s)&&poor(s),options:[
  opt('계절 동안 머슴일을 한다','힘은 들지만 품삯과 숙식을 얻는다',{capital:4,health:-3},'일을 마친 뒤 약속한 품삯을 받으러 갔다.'),
  opt('품삯과 일할 날을 먼저 의논한다','억울한 일을 줄이려 한다',{capital:2,knowledge:2},'약속해 둔 일과 품삯을 다시 확인했다.'),
  opt('이웃과 짧은 품앗이를 한다','오랫동안 묶이지 않고 일손을 바꾼다',{bonds:4,capital:1},'바쁠 때 서로 품을 갚을 이웃이 생겼다.')]},
 {id:'master',group:'status',title:'주인집의 부름',desc:'주인집에서 일을 서둘러 끝내라 한다. 식구에게 돌아갈 시간도 부족하다.',age:[13,63],
  when:(l,j,s)=>bonded(s),options:[
  opt('아픈 식구를 돌볼 시간을 청한다','거절당할 수 있지만 사정을 말한다',{bonds:4,health:-2},'식구의 사정을 알리던 일이 오래 기억에 남았다.'),
  opt('함께 일하는 이들과 품을 나눈다','서로 힘을 보태 고된 일을 마친다',{bonds:4,community:1,health:-2},'함께 일하던 사람이 다음에도 품을 나누었다.'),
  opt('먼저 맡긴 일을 해낸다','당장의 다툼은 피하지만 몸이 고되다',{health:-4,capital:1},'일을 마친 뒤 지친 몸으로 돌아와 잠자리에 들었다.')]},
 {id:'discrimination',group:'status',title:'고을의 낯선 눈길',desc:'출신을 알게 된 사람이 말을 거두며 모임 자리에서 멀찍이 선다.',age:[14,72],
  when:(l,j,s)=>['백정','사노비','공노비','노비 후손 가계'].includes(s.origin),options:[
  opt('부당한 대우를 따져 묻는다','다툼이 생길 수 있지만 가만있지 않는다',{knowledge:2,health:-1,bonds:-1},'그날의 말다툼은 오래 마음에 남았다.'),
  opt('오래된 이웃을 찾아간다','믿을 만한 사람과 속상한 마음을 나눈다',{bonds:5},'곁을 지킨 사람이 그날의 일을 기억해 주었다.'),
  opt('지나쳐 가던 일을 마친다','불편한 마음을 견디며 생업을 지킨다',{capital:2,happiness:-2},'일을 마쳐도 마음의 상처가 쉽게 가시지는 않았다.')]},
 {id:'weaving',group:'livelihood',title:'베틀 앞의 긴 오후',desc:'베틀에서 날실과 씨실이 엇갈린다. 옷감을 짜는 일도 집안의 살림이다.',age:[14,68],options:[
  opt('삼베를 조금 더 짠다','거친 실을 손질하고 베틀을 움직인다',{knowledge:3,capital:2,craft:2,health:-1},'짠 삼베는 식구의 옷을 짓는 데 쓰였다.'),
  opt('고운 모시를 다듬는다','섬세한 손길이 필요한 일을 익힌다',{knowledge:4,craft:2},'손질하던 모시가 여름옷 한 벌이 되었다.'),
  opt('이웃과 실을 나누어 쓴다','서로 모자란 실을 바꾸며 일을 돕는다',{bonds:4,craft:1},'실을 빌려 준 이웃과 다음에도 베틀 일을 나누었다.')]},
 {id:'silk',group:'material',title:'고운 비단이 들어온 날',desc:'고을에 고운 비단이 들어왔다. 값이 만만치 않아 쉽게 살 수는 없다.',age:[18,64],options:[
  opt('집안 형편에 맞는 옷감을 고른다','삼베와 무명도 손질하면 오래 쓸 수 있다',{capital:1,knowledge:1},'해진 옷감을 기워 가족의 옷을 지었다.'),
  opt('비단의 무늬를 살펴본다','장인이 쓰는 실과 무늬를 배운다',{knowledge:4,craft:1},'비단 무늬를 보며 익힌 솜씨를 다른 옷감에도 써 보았다.'),
  opt('잔칫날 입을 옷을 마련한다','살림이 넉넉하지 않으면 부담이 된다',{capital:-4,happiness:4},'옷을 꺼낼 때마다 잔칫날의 소리가 떠올랐다.')]},
 {id:'hairpin',group:'material',title:'비녀와 머리단장',desc:'머리를 빗고 비녀를 고른다. 옷차림에도 형편과 취향이 드러난다.',age:[15,68],
  when:(l)=>l.gender==='여자',options:[
  opt('나무 비녀를 손수 손질한다','오래 쓰던 비녀를 다듬어 쓴다',{craft:1,happiness:2},'손질한 비녀는 다음 계절에도 머리를 단정히 해 주었다.'),
  opt('잔칫날 쓸 비녀를 빌린다','이웃과 장신구를 빌려 쓰며 정을 나눈다',{bonds:3,happiness:2},'빌린 비녀를 돌려주며 한참 이야기를 나누었다.'),
  opt('장신구보다 살림을 챙긴다','지금은 다른 일이 더 급하다',{capital:2},'단장할 틈 없이 바쁜 계절을 보냈다.')]},
 {id:'gache',group:'material',title:'가체를 올린 잔칫날',desc:'잔치에 나온 사람들의 크고 높은 머리 모양이 눈길을 끈다.',age:[17,65],from:1600,until:1787,
  when:(l,j,s)=>l.gender==='여자'&&!bonded(s),options:[
  opt('가체 대신 단정히 머리를 묶는다','많은 비용을 들이지 않고 꾸민다',{capital:1,happiness:2},'다른 이의 차림을 보고도 자기 방식으로 머리를 단장했다.'),
  opt('장식에 관심을 기울인다','멋을 즐기지만 값비싼 재료는 부담이다',{capital:-3,happiness:3},'그날 본 머리 모양을 오래 기억했다.'),
  opt('이웃과 장신구를 빌려 쓴다','한 번 쓸 장식을 함께 마련한다',{bonds:4,capital:-1},'서로 빌린 장식을 돌려주며 웃었다.')]},
 {id:'gacheBan',group:'material',title:'가체를 금한다는 방',desc:'관아에 머리를 높이는 가체를 금한다는 방이 붙었다.',age:[17,70],from:1788,
  when:(l)=>l.gender==='여자',options:[
  opt('쪽을 틀고 비녀로 단장한다','바뀐 차림에 익숙해진다',{knowledge:2,happiness:1},'새로 다듬은 머리 모양으로 잔치에 나갔다.'),
  opt('금령의 내용을 살핀다','관아에서 붙인 말을 읽고 듣는다',{knowledge:3},'이웃과 새 규정에 대해 이야기를 나누었다.'),
  opt('오래 쓰던 장식은 넣어 둔다','익숙한 물건을 간직한다',{happiness:1},'소중한 장신구는 함 속에 남겨 두었다.')]},
 {id:'hanyang',group:'place',title:'한양에 처음 들어선 날',desc:'도성 문을 지나자 관청과 저잣거리, 수많은 사람의 걸음이 이어진다.',age:[16,65],
  when:(l,j,s)=>s.region==='한양'||['경기도','황해도'].includes(s.region),options:[
  opt('저잣거리에서 물건값을 살핀다','새로 들어온 물건과 소식을 접한다',{knowledge:3,capital:1},'도성에서 들은 소식이 고향 장날에도 이야깃거리가 되었다.'),
  opt('관아에 볼일을 보러 간다','문서와 사람을 찾아 길을 묻는다',{knowledge:3,health:-1},'도성의 관아에서 만난 사람이 훗날 다시 기억났다.'),
  opt('친척집에서 하루 묵는다','도시의 밤이 낯설고 소란스럽다',{bonds:3,happiness:1},'한양에서 보낸 밤 이야기를 가족에게 전했다.')]},
 {id:'government',group:'place',title:'관아의 부름',desc:'아전이 고을 사람들을 불러 서류와 공물을 확인하려 한다.',age:[18,67],options:[
  opt('내야 할 물목을 확인한다','서로 다른 집안의 부담을 살핀다',{knowledge:4},'며칠 뒤 관아에서 문서 내용을 다시 확인했다.'),
  opt('이웃의 사정을 함께 알린다','억울한 부담을 줄일 길을 묻는다',{bonds:4,health:-1},'같은 일을 겪던 이웃이 다시 찾아왔다.'),
  opt('생업을 마치고 들르기로 한다','관아에 갈 시간을 따로 내야 한다',{capital:2,health:-1},'밀린 공물과 문서를 챙겨 관아로 향했다.')]},
 {id:'hyanggyo',group:'learning',title:'향교의 뜰',desc:'향교에서 글 읽는 소리가 들린다. 배울 길은 집안 처지에 따라 다르다.',age:[12,38],
  when:(l,j,s)=>literate(l,j,s),options:[
  opt('책을 빌릴 길을 묻는다','읽을 책과 도와줄 사람을 찾는다',{knowledge:5,capital:-1},'빌린 책을 돌려주러 향교 뜰을 다시 찾았다.'),
  opt('선생에게 글의 뜻을 여쭙는다','모르는 말을 익히며 공부를 이어 간다',{knowledge:5,bonds:2},'전에 들은 글귀가 문득 생각나는 날이 있었다.'),
  opt('집안일을 마친 뒤 찾아간다','배움과 일을 함께 이어 가려 한다',{knowledge:2,capital:2},'집안의 일을 하며 배운 글자를 되새겼다.')]},
 {id:'seowon',group:'learning',title:'서원의 강학 소식',desc:'고을 선비들이 서원에 모여 학문을 논한다는 소식이 들려왔다.',age:[18,57],from:1543,
  when:(l,j,s)=>literate(l,j,s)&&rural(s),options:[
  opt('서원에서 글을 배우고 싶다고 청한다','배우는 기회가 누구에게나 같지는 않다',{knowledge:5,capital:-1},'서원에서 들은 가르침이 오랫동안 마음에 남았다.'),
  opt('서원 주변의 책과 물품 일을 돕는다','글을 배우는 일 말고도 할 일이 있다',{knowledge:3,capital:2},'서원에서 일하던 사람과 안부를 나누었다.'),
  opt('마을의 어린아이를 가르친다','서원에 가지 않아도 배움을 나눌 수 있다',{bonds:5,knowledge:2},'마을 아이가 배운 글을 또박또박 읽어 보였다.')]},
 {id:'tiger',group:'wild',title:'산길에 범이 나타났다',desc:'고개 너머에서 범을 보았다는 소식이 들려왔다. 나무하러 나간 이들이 돌아오지 않았다.',age:[13,68],
  when:(l,j,s)=>rural(s)&&mountain.has(s.region),options:[
  opt('산길로 오르는 일을 미룬다','안전을 위해 땔감을 나중에 구한다',{health:2,capital:-2},'산길을 조심하라는 말이 마을에 오래 남았다.'),
  opt('마을 사람에게 소식을 알린다','함께 길을 살피고 어린아이를 챙긴다',{bonds:4,community:2},'사람들이 함께 산길을 살피는 날이 생겼다.'),
  opt('관아에 착호를 청한다','범을 잡는 일을 맡은 사람의 도움을 구한다',{knowledge:2,bonds:2},'관아에서 산길을 살피겠다는 답이 전해졌다.')]},
 {id:'hunt',group:'wild',title:'겨울 산의 짐승 발자국',desc:'눈 위에 노루와 멧돼지의 발자국이 찍혔다.',age:[15,63],
  when:(l,j,s)=>rural(s)&&mountain.has(s.region),options:[
  opt('짐승의 흔적을 살핀 뒤 돌아온다','산짐승이 있는 길을 익힌다',{knowledge:4,health:1},'익힌 길 덕분에 겨울 산을 조심스레 다녔다.'),
  opt('경험 많은 사냥꾼을 돕는다','위험을 알고 함께 움직인다',{knowledge:3,health:-2,capital:2},'사냥꾼이 남겨 준 고기와 가죽을 식구들과 나누었다.'),
  opt('마을 밭을 지키는 울타리를 친다','멧돼지가 작물을 해치지 못하게 대비한다',{health:-2,capital:2},'손질한 울타리는 다음 농사에도 쓰였다.')]},
 {id:'logging',group:'wild',title:'땔나무를 하러 간 날',desc:'날이 추워지자 집안에 쓸 땔감을 마련해야 한다.',age:[12,67],
  when:(l,j,s)=>rural(s),options:[
  opt('마른 나뭇가지를 주워 온다','힘은 덜 들지만 양이 많지 않다',{health:-1,capital:1},'마른 가지를 모아 겨울 아궁이에 불을 지폈다.'),
  opt('이웃과 함께 벌목을 돕는다','허락된 곳에서 나무를 베고 옮긴다',{bonds:3,health:-2,capital:2},'함께 나무를 옮긴 사람과 겨울을 준비했다.'),
  opt('다른 집에서 장작을 구한다','돈이나 물건으로 땔감을 마련한다',{capital:-3,health:2},'쌓아 둔 장작을 아껴 쓰며 겨울을 났다.')]},
 {id:'horse',group:'skill',title:'말을 타는 법',desc:'말을 다루는 사람이 고을에 왔다. 가까이서 말의 움직임을 살펴본다.',age:[13,53],
  when:(l,j,s)=>!bonded(s)&&/무반|수군|양반|역관|보부상|서리/.test(s.origin+' '+j.occupation),options:[
  opt('말의 고삐를 잡는 법을 배운다','급히 서두르지 않고 말에 익숙해진다',{knowledge:3,health:1,hobby:1},'말을 다룰 때 배운 손길이 다음 길에도 보탬이 되었다.'),
  opt('먼저 먹이와 발굽을 살핀다','말을 돌보는 사람에게 배운다',{knowledge:4,bonds:2},'말을 돌보던 이와 오랜 인연을 맺었다.'),
  opt('말 타는 모습을 지켜본다','먼저 사람과 말의 호흡을 익힌다',{knowledge:2},'달리던 말의 발소리가 오래 귀에 남았다.')]},
 {id:'archery',group:'skill',title:'활쏘는 마당',desc:'과녁을 세우고 활쏘기를 익히는 사람들이 모였다.',age:[13,57],
  when:(l,j,s)=>!bonded(s),options:[
  opt('활시위를 당겨 본다','힘과 자세를 가다듬으며 연습한다',{health:2,knowledge:3,hobby:1},'한 번 익힌 자세를 다시 떠올려 활을 겨누었다.'),
  opt('화살을 거두고 과녁을 손질한다','직접 쏘지 않아도 함께 할 일이 있다',{bonds:3,knowledge:2},'활쏘던 사람들과 마당을 정리했다.'),
  opt('이웃의 솜씨를 구경한다','활쏘는 이야기를 들으며 쉰다',{happiness:3},'활쏘던 날의 함성이 귀에 남았다.')]},
 {id:'waterplay',group:'skill',title:'여름 개울의 자맥질',desc:'더운 날 아이들과 젊은이들이 얕은 물가에서 자맥질하며 논다.',age:[9,30],
  when:(l,j,s)=>rural(s),options:[
  opt('얕은 물에서 놀고 나온다','혼자가 아닌 사람들과 안전한 곳에 머문다',{health:2,happiness:4,hobby:1},'한여름 물가에서 웃던 기억이 남았다.'),
  opt('물가에 앉아 친구들과 이야기한다','서로 먼 고을 소식을 나눈다',{bonds:4},'그날의 친구가 다음 장날에도 찾아왔다.'),
  opt('바구니에 작은 물고기를 잡는다','물의 흐름을 살피며 조심스레 움직인다',{knowledge:3,grain:2},'잡아 온 물고기로 집안의 끼니를 보탰다.')]},
 {id:'fishing',group:'skill',title:'포구에서 어로를 돕다',desc:'바닷가의 어부들이 그물과 물때를 살피며 배를 준비한다.',age:[13,70],
  when:(l,j,s)=>coastal.has(s.region),options:[
  opt('그물 매듭을 고친다','익숙한 어부 곁에서 손질을 배운다',{knowledge:3,bonds:2},'배에서 쓸 그물 매듭을 다시 손보았다.'),
  opt('포구의 짐을 나른다','고된 일이지만 품삯을 얻는다',{capital:3,health:-2},'그날의 품삯으로 식구의 먹을거리를 샀다.'),
  opt('물때를 기다리며 이야기를 듣는다','먼 곳에서 들어오는 배의 소식을 들었다',{knowledge:3},'포구에서 만난 사람이 다시 먼 바닷길 이야기를 들려주었다.')]},
 {id:'smallpox',group:'illness',title:'마마가 돈다는 소식',desc:'이웃집 아이가 마마를 앓고 있다. 집집마다 걱정이 깊어졌다.',age:[10,69],options:[
  opt('아픈 집에 먹을거리를 건넨다','도울 방법을 의논하고 몸이 아픈 이는 쉬게 한다',{bonds:5,grain:-3,health:-1},'어려웠을 때 도왔던 집에서 안부를 전해 왔다.'),
  opt('집안의 아이와 어른을 돌본다','평소보다 세심히 몸 상태를 살핀다',{bonds:3,health:2,care:1},'그 겨울 가족의 안부를 서로 더 자주 물었다.'),
  opt('경험 있는 의원에게 도움을 청한다','아픈 이의 증세를 알리고 도움을 구한다',{knowledge:2,capital:-2},'의원이 알려 준 말이 두고두고 기억났다.')]},
 {id:'physician',group:'illness',title:'의원을 찾아간 날',desc:'기침과 열로 여러 날 몸이 좋지 않다. 이웃이 의원이 있는 곳을 알려 준다.',age:[12,72],options:[
  opt('의원에게 증세를 보인다','도움이 되겠지만 비용이 든다',{health:5,capital:-3},'몸을 추스르며 예전처럼 일할 수 있게 되었다.'),
  opt('지친 몸을 쉬게 한다','일손을 줄이고 집안에서 쉬어 간다',{health:3,capital:-2},'쉬어 간 뒤에야 다시 힘이 돌아왔다.'),
  opt('가족에게 돌봄을 부탁한다','식구와 일손을 나누어 버틴다',{health:2,bonds:4},'가족이 병상 곁을 지키던 일을 오래 기억했다.')]},
 {id:'harvest',group:'weather',title:'곡식이 잘 여문 가을',desc:'올해는 논밭의 곡식이 잘 익어 곳간에 쌓을 수확이 늘었다.',age:[13,75],
  when:(l,j,s)=>rural(s),options:[
  opt('씨앗과 곡식을 넉넉히 남겨 둔다','내년 농사를 준비한다',{grain:10,capital:1},'남겨 둔 씨앗이 다음 봄 농사에 쓰였다.'),
  opt('이웃과 수확을 조금 나눈다','형편 어려운 집과 곡식을 나눈다',{grain:3,bonds:5},'나눴던 이웃이 다음에 일손을 보태 주었다.'),
  opt('장터에 곡식을 내다 판다','팔아 남은 것으로 집안의 물건을 마련한다',{capital:5,grain:1},'장터에서 받은 품삯과 물건을 살림에 보탰다.')]},
 {id:'famine',group:'weather',title:'흉년의 첫 겨울',desc:'비가 제때 오지 않아 곡식이 여물지 못했다. 곳간을 열 때마다 근심이 깊어진다.',age:[15,75],
  when:(l,j,s)=>rural(s),options:[
  opt('남은 곡식부터 나누어 먹는다','식구의 끼니를 아껴 챙긴다',{grain:-7,health:-1,bonds:2},'어려운 시절 아껴 두었던 곡식 덕분에 한 철을 지났다.'),
  opt('관아의 구휼 소식을 알아본다','구휼미를 받을 수 있을지 기다린다',{knowledge:2,health:-2},'관아의 구휼과 백성의 사정을 두고 말이 많았다.'),
  opt('친척에게 곡식을 빌린다','빚이 남지만 식구의 끼니가 급하다',{grain:5,capital:-6,bonds:1},'친척에게 빌린 곡식을 갚을 일을 마음에 두었다.')]},
 {id:'flood',group:'weather',title:'밤새 불어난 물',desc:'큰비에 개울이 넘치고 논둑이 허물어졌다.',age:[12,75],
  when:(l,j,s)=>rural(s),options:[
  opt('식구를 먼저 높은 곳으로 옮긴다','물건보다 사람을 챙긴다',{health:2,capital:-4,bonds:4},'물이 빠진 뒤 망가진 집안을 다시 손보았다.'),
  opt('이웃과 둑을 막는다','함께 물길을 돌리며 땀을 흘린다',{health:-3,bonds:5,community:1},'함께 막은 둑을 다시 살피는 날이 있었다.'),
  opt('곡식과 연장을 옮긴다','살림에 필요한 것을 지키려 애쓴다',{grain:-2,capital:1,health:-2},'비에 젖은 곡식을 말리며 여름을 보냈다.')]},
 {id:'typhoon',group:'weather',title:'거센 바람이 들이닥치다',desc:'바닷가에 바람이 거세지고 배와 집 지붕이 흔들린다.',age:[14,74],
  when:(l,j,s)=>coastal.has(s.region),options:[
  opt('배와 그물을 묶어 둔다','포구의 생업을 지키려 한다',{capital:1,health:-2},'바람이 잦아든 뒤 배와 그물을 다시 손봤다.'),
  opt('지붕과 문을 단단히 고친다','식구와 이웃이 집을 지킨다',{capital:-3,bonds:2,health:1},'그때 손본 문짝이 다음 비바람에도 버텼다.'),
  opt('안전한 곳으로 피한다','당장의 재산보다 목숨을 먼저 생각한다',{health:3,capital:-4},'돌아와 보니 망가진 살림을 다시 꾸려야 했다.')]},
 {id:'heatwave',group:'weather',title:'숨이 막히는 더위',desc:'볕이 뜨겁고 바람이 잠잠하다. 낮일을 하기가 버거워졌다.',age:[13,75],options:[
  opt('한낮의 일을 줄이고 쉰다','몸을 살리며 일할 때를 기다린다',{health:3,capital:-2},'쉬어 가며 일하는 법을 몸에 익혔다.'),
  opt('이웃과 시원한 물을 나눈다','더위에 지친 사람을 살핀다',{bonds:4,health:1},'그날 물을 건넨 이웃과 다시 마주쳤다.'),
  opt('그늘에서 도구를 손질한다','바깥일 대신 할 수 있는 일을 찾는다',{knowledge:2,capital:1},'그늘에서 손본 도구가 다음 농사에 쓰였다.')]},
 {id:'blizzard',group:'weather',title:'눈이 길을 덮다',desc:'며칠째 눈이 쌓이고 고갯길이 막혔다.',age:[10,77],options:[
  opt('눈에 묻힌 길을 함께 낸다','마을 사람들과 길을 터 본다',{health:-2,bonds:5,community:1},'함께 낸 길로 먹을거리가 다시 들어왔다.'),
  opt('집안의 장작과 곡식을 아낀다','추위를 견디며 곳간을 살핀다',{grain:-3,health:1},'겨울에 아꼈던 장작과 먹을거리가 큰 도움이 되었다.'),
  opt('나이 든 이웃의 안부를 묻는다','눈을 헤치고 가까운 집에 다녀온다',{bonds:5,health:-1},'눈이 녹은 뒤 이웃이 고맙다며 찾아왔다.')]},
 {id:'sunny',group:'weather',title:'볕 좋은 화창한 날',desc:'아침부터 바람이 맑고 볕이 좋다. 오랜만에 마당으로 사람들이 나온다.',age:[8,78],options:[
  opt('마당에 곡식과 이불을 넌다','살림을 보송하게 말린다',{health:1,capital:1},'볕에 말려 둔 이불을 덮고 잠자리에 들었다.'),
  opt('이웃과 길을 걸으며 쉰다','한가한 낮을 함께 보낸다',{bonds:3,happiness:4},'그날 함께 걸었던 길이 오래 기억났다.'),
  opt('집 앞에 앉아 바느질한다','따뜻한 볕 아래 옷을 손질한다',{knowledge:2,happiness:2},'바느질하던 옷은 한동안 잘 입고 다녔다.')]},
 {id:'song',group:'material',title:'달라지는 옷차림',desc:'마을 잔치에서 낯선 옷감과 꾸밈이 눈에 띈다.',age:[12,72],from:1700,options:[
  opt('옷을 짓는 이에게 물어본다','새 유행과 손질법을 배운다',{knowledge:3,craft:1},'그날 배운 바느질을 집안 옷에도 써 보았다.'),
  opt('오래 입던 옷을 곱게 고친다','새 옷보다 손에 익은 것이 편하다',{capital:2,happiness:2},'기워 입은 옷이 여러 해를 더 견뎠다.'),
  opt('가까운 이웃과 꾸밈을 나눈다','서로 물건을 빌리며 풍속을 이야기한다',{bonds:4},'옷차림이 달라져도 오래된 이웃과의 정은 남았다.')]},
 {id:'season',group:'weather',title:'봄비 뒤의 마당',desc:'밤새 내린 봄비가 그치자 마당과 텃밭에 작은 싹이 돋았다.',age:[9,79],options:[
  opt('텃밭을 둘러보고 씨앗을 살핀다','새 계절에 할 일을 적어 둔다',{knowledge:2,grain:2},'그때 돌본 어린 싹이 자라 작은 먹을거리가 되었다.'),
  opt('아이와 함께 풀과 꽃을 살핀다','작은 것에 눈길을 주며 쉰다',{bonds:3,happiness:3},'마당에서 보던 풀꽃 이야기를 아이가 기억했다.'),
  opt('비에 젖은 담을 수리한다','집안을 지키려 먼저 손을 쓴다',{capital:-2,health:1},'손봐 둔 담장은 여름비를 견뎠다.')]},
];
const EVENT_BY_ID=new Map(EVENTS.map(e=>[e.id,e]));
function ensure(life){
 if(!J?.isJoseon(life))return null;
 if(!life.joseon7)life.joseon7={version:1,processedYear:life.birthYear,seen:[],queue:[],active:null,followups:[],decisions:[],affection:0,friendship:0,care:0,stock:0,craft:0,hobby:0,community:0,grief:0};
 return life.joseon7;
}
function eligible(life,e){
 if(!J.inOldEra(life)||!life.alive||life.age<(e.age?.[0]??8)||life.age>(e.age?.[1]??79))return false;
 if(e.from&&life.year<e.from)return false;
 if(e.until&&life.year>e.until)return false;
 const j=J.ensure(life),so=V5.summary(life),fam=V4.summary(life);
 return !e.when||!!e.when(life,j,so,fam);
}
function chooseEvent(life,s){
 const candidates=EVENTS.filter(e=>!s.seen.includes(e.id)&&eligible(life,e));
 if(!candidates.length)return null;
 // Stable seed-specific selection; avoids every life receiving the same scripted scenes.
 const prev=s.decisions.at(-1)?.group;
 candidates.sort((a,b)=>{
  const score=e=>rnd(life.seed,life.year*43+[...e.id].reduce((n,c)=>n+c.charCodeAt(0),0))+(e.group===prev?.75:0);
  return score(a)-score(b);
 });
 return candidates[0];
}
function prompt(life){
 const s=ensure(life),e=EVENT_BY_ID.get(s?.active?.eventId);
 if(!s?.active||!e)return null;
 return {title:e.title,description:e.desc,options:e.options.map(x=>({label:x.label,note:x.note,action:x.label}))};
}
function promote(life,s){
 if(!s||s.active||life.pending||!life.alive||!J.inOldEra(life)||!s.queue.length)return;
 s.active=s.queue.shift();
 life.pending='joseon7:'+s.active.id;
}
function yearly(life,s){
 if(!s||!J.inOldEra(life)||!life.alive||s.processedYear===life.year)return;
 s.processedYear=life.year;
 for(const f of s.followups.filter(x=>x.year<=life.year)){
  life.logEvent(f.text,'joseon7-followup');
  life.log.at(-1).causeId='joseon7:'+f.id;
 }
 s.followups=s.followups.filter(x=>x.year>life.year);
 // One additional personal-life decision about once per four years.
 if(life.age>=10&&life.age<=76&&life.age%4===2&&s.queue.length<2){
  const e=chooseEvent(life,s);
  if(e){s.seen.push(e.id);s.seen=s.seen.slice(-EVENTS.length);
    s.queue.push({id:life.year+'-'+e.id,eventId:e.id,year:life.year});
  }
 }
 promote(life,s);
}
function choose(life,index){
 const s=ensure(life),e=EVENT_BY_ID.get(s?.active?.eventId);
 if(!s?.active||!e||!life.alive||!Number.isInteger(index)||index<0||index>=e.options.length)return false;
 const o=e.options[index],c=o.change||{},j=J.ensure(life),v=V2.ensure(life),id=s.active.id;
 const changes={};for(const key of ['health','happiness','knowledge','bonds','wealth'])if(Number.isFinite(c[key]))changes[key]=c[key];
 life.change(changes);
 if(Number.isFinite(c.capital))j.capital=clamp(j.capital+c.capital,-120,600);
 if(Number.isFinite(c.grain))v.grain=clamp(v.grain+c.grain,0,200);
 for(const key of ['affection','friendship','care','stock','craft','hobby','community','grief']){
  if(Number.isFinite(c[key]))s[key]=clamp(s[key]+c[key],0,50);
 }
 if(life.money&&life.year<1900)life.money.netWorth=j.capital*100;
 life.logEvent(e.title+' — '+o.label,'joseon7-choice');life.log.at(-1).causeId='joseon7:'+id;
 s.decisions.push({id,eventId:e.id,group:e.group,year:life.year,choice:index});
 s.decisions=s.decisions.slice(-65);
 s.followups.push({id,year:life.year+2+(index%2),text:o.after});
 s.followups=s.followups.slice(-60);
 s.active=null;life.pending=null;
 promote(life,s);
 return true;
}
function summary(life){
 const s=ensure(life);
 return s?{decisions:s.decisions.length,memories:s.followups.length,friendship:s.friendship,care:s.care,community:s.community,stock:s.stock}:null;
}
function hydrate(life,data){
 const s=ensure(life),old=data?.joseon7;if(!s||!old||old.version!==1)return s;
 const cleanQ=q=>q&&typeof q.id==='string'&&EVENT_BY_ID.has(q.eventId)&&Number.isInteger(q.year)&&q.year<=life.year&&q.year>=life.birthYear?
  {id:q.id.slice(0,80),eventId:q.eventId,year:q.year}:null;
 s.processedYear=clamp(Number(old.processedYear)||life.birthYear,life.birthYear,life.year);
 s.seen=Array.isArray(old.seen)?old.seen.filter(id=>EVENT_BY_ID.has(id)).slice(-EVENTS.length):[];
 s.decisions=Array.isArray(old.decisions)?old.decisions.filter(x=>x&&EVENT_BY_ID.has(x.eventId)&&typeof x.id==='string'&&Number.isInteger(x.year)&&x.year<=life.year)
  .slice(-65).map(x=>({id:x.id.slice(0,80),eventId:x.eventId,group:String(x.group||''),year:x.year,choice:clamp(Number(x.choice)||0,0,2)})):[];
 s.queue=Array.isArray(old.queue)?old.queue.map(cleanQ).filter(Boolean).slice(-2):[];
 s.active=cleanQ(old.active);
 if(!life.alive||!J.inOldEra(life)||data?.pending!=='joseon7:'+s.active?.id)s.active=null;
 s.followups=Array.isArray(old.followups)?old.followups.filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'&&Number.isInteger(x.year)&&x.year>life.year&&x.year<=life.year+4)
  .slice(-60).map(x=>({id:x.id.slice(0,80),year:x.year,text:x.text.slice(0,240)})):[];
 for(const k of ['affection','friendship','care','stock','craft','hobby','community','grief'])s[k]=clamp(Number(old[k])||0,0,50);
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V4?.summary||!V5?.summary||Sim.Life.prototype.__joseon7)return false;
 const L=Sim.Life,prevTick=L.prototype.tick,prevChoose=L.prototype.choose,prevChoice=L.prototype.getChoice,
  prevReflect=L.prototype.reflect,prevSnapshot=L.prototype.snapshot,prevRestore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this))return prevTick.call(this);
  const before=this.year,ok=prevTick.call(this);
  if(ok&&this.alive&&this.year!==before)yearly(this,ensure(this));
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&this.pending?.startsWith('joseon7:'))return prompt(this);
  return prevChoice.call(this);
 };
 L.prototype.choose=function(index){
  if(J.isJoseon(this)&&this.pending?.startsWith('joseon7:'))return choose(this,index);
  const ok=prevChoose.call(this,index);
  if(ok&&J.inOldEra(this))promote(this,ensure(this));
  return ok;
 };
 L.prototype.reflect=function(text){const ok=prevReflect.call(this,text);if(ok&&J.inOldEra(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){const snap=prevSnapshot.call(this);if(J.isJoseon(this))snap.joseon7=JSON.parse(JSON.stringify(ensure(this)));return snap;};
 L.restore=function(data){const life=prevRestore.call(this,data);if(life&&J.isJoseon(life))hydrate(life,data);return life;};
 Object.defineProperty(L.prototype,'__joseon7',{value:true});
 return true;
}
install();
return Object.freeze({install,EVENTS,ensure,eligible,prompt,choose,yearly,summary});
});
