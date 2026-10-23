/* Joseon v18 — three fiscal administrations and late-Joseon power networks.
 * The broad administrative practices and 1862 reforms are sourced; local incidents,
 * severity, probabilities and personal outcomes are fictional game mechanics.
 */
(function(root,factory){
 const api=factory(root?.OneLifeSim,root?.OneLifeJoseon,root?.OneLifeJoseon2,
   root?.OneLifeJoseon4,root?.OneLifeJoseon5,root?.OneLifeJoseon9,root?.OneLifeJoseon11);
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.OneLifeJoseon18=api;
})(typeof window!=='undefined'?window:null,function(Sim,J,V2,V4,V5,V9,V11){
'use strict';
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(seed,salt)=>{let n=(seed^Math.imul(salt+1,0x9e3779b9))>>>0;
 n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;};
const SRC=Object.freeze({
 system:'https://encykorea.aks.ac.kr/Article/E0026799',
 reforms:'https://encykorea.aks.ac.kr/Article/E0074112',
 uprising:'https://encykorea.aks.ac.kr/Article/E0047507',
 power:'https://theme.archives.go.kr/next/sillok/sub3_3.do'
});
const O=(label,note,follow,d={},tag='cope')=>({label,note,follow,d,tag});
const E=(id,category,from,to,title,scene,source,opts,gate=null)=>({id,category,from,to,title,scene,source,options:opts,gate});
const EVENTS=[
 E('landFalse','전정',1800,1869,'거두지 못하는 땅에도 붙은 세금',
  '장부에는 이미 경작하기 어려워진 땅도 여전히 논밭으로 적혀 있다. 세금을 내라는 독촉이 온다.',SRC.system,[
   O('논밭의 넓이와 수확을 이웃과 다시 살핀다','이웃의 증언과 기록을 모은다','논밭을 직접 재고 실제 수확과 장부의 수량이 다른 곳에 표시했다. 그 내역을 관아에 냈다.',{proof:3,anger:1,capital:-2},'record'),
   O('남은 곡식을 내어 우선 막는다','식구들이 먹을 양식이 줄어든다','다음 철 곳간이 더 빠듯해졌다.',{grain:-5,land:2,capital:-2},'pay'),
   O('다른 고을의 친척에게 도움을 구한다','확실한 해결은 아니지만 시간을 번다','갚아야 할 곡식의 양을 다시 헤아리며 친척과 소식을 주고받았다.',{capital:2,land:3,bonds:2},'borrow')],(l,j,v)=>j.land>0),
 E('landExtra','전정',1800,1869,'정해진 세금 외에 추가로 거두는 징세',
  '논밭에서 나올 세금 외에 여러 명목의 돈과 곡식을 더 내라고 한다. 징수 총액을 맞춘다는 설명뿐이다.',SRC.system,[
   O('세금의 근거를 적어 두고 따진다','억울한 부담을 문서로 남긴다','어느 항목 때문에 세금이 늘었는지 아전에게 따졌다. 아전은 당장 곡식을 내라는 말만 되풀이했다.',{proof:3,complaints:1,anger:2,capital:-1},'appeal'),
   O('곡식을 내고 그해 일을 넘긴다','농사에 남길 곡식을 줄인다','씨앗을 아끼느라 다음 해에도 걱정했다.',{grain:-6,land:3},'pay'),
   O('이웃과 함께 부당한 부과를 알린다','탄원에 참여할 사람을 모은다','같은 세금을 요구받은 이웃과 각자 낸 곡식의 양을 대조해 탄원서에 이름을 올렸다.',{anger:3,trust:4,proof:1,complaints:1},'organize')]),
 E('landShift','전정',1810,1869,'다른 집의 부족한 세금을 떠맡다',
  '이웃집에 부과된 세금 일부가 마을의 다른 집에 돌아왔다. 왜 우리 집이 부담해야 하는지 설명은 흐릿하다.',SRC.system,[
   O('고을의 장부를 확인한다','누가 왜 부담하게 됐는지 묻는다','아전의 장부에서 우리 집에 매겨진 군포뿐 아니라 이웃집 군포까지 늘어난 것을 찾아냈다.',{proof:3,complaints:1},'record'),
   O('이웃과 나누어 마련한다','갈등을 줄이지만 부담은 남는다','힘을 모았던 집과 다음에도 일을 나누었다.',{grain:-3,land:2,trust:3},'mutual'),
   O('우리 집에 부과할 세금이 아니라고 맞선다','징수하는 아전과 갈등이 생길 수 있다','거절한 뒤에도 독촉을 경계해야 했다.',{anger:4,retaliation:2,proof:1},'refuse')]),
 E('landRegister','전정',1820,1869,'세금이 면제된 땅과 불공평한 장부',
  '세금을 가볍게 내는 권세 있는 집의 땅과 우리 집의 부담을 두고 말이 많다. 사실을 확인하기도 어렵다.',SRC.power,[
   O('땅문서를 모아 비교한다','세금 부담이 어떻게 달라지는지 알아본다','땅문서에 적힌 밭의 넓이와 관아 장부의 수량이 달랐다. 틀린 곳을 표시해 두었다.',{proof:3,knowledge:2},'record'),
   O('집안의 남은 땅을 지키는 데 집중한다','당장 살림을 줄이기로 한다','땅을 지키기 위해 여러 해 씀씀이를 아꼈다.',{capital:-3,land:1},'survive'),
   O('이웃과 차이를 함께 알린다','부담이 한쪽에 쏠린 것을 이야기한다','관아 앞에서 이웃과 함께 실제 경작한 논밭의 넓이를 다시 살펴 달라고 청했다.',{anger:3,trust:3,complaints:1},'petition')]),
 E('militaryDead','군정',1800,1869,'세상을 떠난 식구의 군포가 남았다',
  '이미 세상을 떠난 사람의 이름이 군포 장부에서 지워지지 않아 납부를 요구한다. 이를 백골징포라고 불렀다.',SRC.system,[
   O('사망 기록과 친척의 증언을 낸다','세상을 떠난 사람에게 매긴 군포를 없애 달라 청한다','사망한 사람의 이름을 장부에서 지우려 애썼다.',{proof:4,complaints:1,anger:2},'record'),
   O('우선 군포를 마련해 낸다','가족의 다른 지출을 미룬다','세상을 떠난 가족 대신 군포까지 내느라 살림돈을 줄여야 했다.',{military:4,capital:-4,anger:1},'pay'),
   O('이웃과 함께 관아에 탄원한다','다른 집도 같은 일을 겪었다','군포를 내라는 독촉장을 받은 집들이 관아 앞에 모여 죽은 이의 이름을 지워 달라고 청했다.',{trust:4,complaints:1,anger:3},'petition')],(l,j,v)=>V4.summary(l).people.some(p=>p.sex==='남자'&&(p.diedYear||!p.alive))),
 E('militaryChild','군정',1800,1869,'아직 어린 자녀의 이름에 군포가 붙다',
  '군역을 지기 어려운 어린 남자아이를 장정으로 적어 군포를 요구한다. 황구첨정의 폐단이다.',SRC.system,[
   O('아이의 나이를 증명한다','출생과 나이를 아는 사람을 모은다','아직 어린 아이라고 여러 번 설명해야 했다.',{proof:4,knowledge:1,complaints:1},'record'),
   O('아이가 쓸 곡식으로 부담을 막는다','집안의 먹을거리가 줄어든다','아이에게 돌아갈 양식을 따로 남기기 어려웠다.',{grain:-5,military:4,anger:2},'pay'),
   O('다른 부모들과 함께 항의한다','여럿의 사정을 함께 전한다','아이의 나이를 아는 친척과 이웃을 찾아 장부의 잘못된 나이를 고쳐 달라고 청했다.',{trust:3,anger:3,complaints:1},'organize')],(l,j,v)=>V4.summary(l).people.some(p=>p.role==='child'&&p.alive&&p.sex==='남자'&&p.age<16)),
 E('militaryKin','군정',1810,1869,'도망간 친척의 군포까지',
  '군포를 내던 사람이 사라진 뒤 친척집으로 납부 독촉이 돌아왔다. 친족에게 부담을 지우는 족징의 사례다.',SRC.system,[
   O('친척과 장부를 함께 대조한다','장부의 잘못된 부분을 찾아 관아에 알린다','친척과 장부를 펼쳐 도망친 사람이 내야 할 군포가 어느 집에 더해졌는지 확인했다.',{proof:3,bonds:2,complaints:1},'record'),
   O('친척끼리 조금씩 나누어 낸다','모두의 살림이 빠듯해진다','친척들은 다른 해에도 서로 곡식을 빌려야 했다.',{military:3,grain:-4,bonds:2},'pay'),
   O('부담을 거두어 달라며 항의한다','관아의 반발을 감수한다','친척과 함께 관아에 잘못된 군포를 거두지 말라고 항의했다. 아전은 곧바로 답하지 않았다.',{anger:4,retaliation:1,proof:2},'refuse')]),
 E('militaryNeighbor','군정',1810,1869,'이웃집 군포를 대신 내라는 독촉',
  '군포를 내지 못한 집 대신 이웃에게 군포를 거두라고 했다. 대신 내야 할 돈이 늘자 마을 사람들 사이에 한숨이 깊어졌다.',SRC.system,[
   O('이웃과 책임을 나누어 따져 묻는다','장부와 납부자의 형편을 확인한다','누가 얼마나 내야 하는지 함께 따져 보았다.',{proof:3,trust:3,complaints:1},'record'),
   O('다툼을 피하고 납부한다','우리 집도 군포 부담을 떠안는다','이웃에게 미안함과 억울함이 함께 남았다.',{military:4,capital:-4,anger:2},'pay'),
   O('마을의 공동 탄원을 준비한다','갈등을 해결할 길을 찾는다','같은 부담을 떠안은 집들의 이름과 실제 납부한 양을 모아 탄원서를 냈다.',{anger:3,trust:5,complaints:1},'petition')]),
 E('militaryOver','군정',1810,1869,'지나간 나이를 고쳐 군포를 매기다',
  '이미 군역 연령을 지났다는 사람이 장부에는 여전히 장정으로 적혀 있다.',SRC.system,[
   O('나이와 가족의 증언을 확인한다','나이와 군역 기록을 대조한다','연로한 식구의 군포를 면해 달라 호소했다.',{proof:4,complaints:1},'record'),
   O('군포를 내고 불화를 피한다','가족의 곡식이 줄어든다','노인을 돌보며 군포도 마련해야 했다.',{military:3,grain:-4,bonds:1},'pay'),
   O('이웃의 억울한 사례를 모은다','수령에게 여러 집의 사정을 전한다','군역을 맡기 어려운 나이의 이웃을 데리고 관아에 가서 장부를 보여 줬다.',{anger:3,trust:3,complaints:1},'organize')],(l,j,v)=>l.age>=60||V4.summary(l).people.some(p=>p.role==='father'&&p.alive&&p.age>=60)),
 E('grainForced','환정',1800,1869,'바라지 않은 환곡을 나누어 주다',
  '곡식을 빌리겠다고 하지 않은 집에도 환곡이 배정됐다. 가을이 오면 이자와 함께 갚으라고 한다.',SRC.system,[
   O('왜 빌려야 하는지 확인한다','장부의 배정 사유를 묻는다','집안에 필요하지 않은 곡식이 왜 배정됐는지 따졌다.',{proof:2,complaints:1,grainDebt:1},'record'),
   O('곡식을 받아 당장 쓴다','가을에는 갚아야 할 곡식이 남는다','먹을 것을 얻었지만 갚을 곡식도 늘었다.',{grain:7,grainDebt:5,anger:1},'accept'),
   O('마을과 함께 배정을 거절한다','보복을 걱정하면서 뜻을 모은다','곡식을 강제로 빌리게 하는 일을 고쳐 달라 했다.',{anger:4,trust:3,retaliation:2},'refuse')]),
 E('grainShort','환정',1800,1869,'적게 받은 곡식과 그대로인 장부',
  '장부의 곡식 양보다 실제 받은 곡식이 적다. 하지만 가을에는 장부에 적힌 양을 모두 갚으라고 한다.',SRC.system,[
   O('곡식 분량을 다시 재고 기록한다','저울과 됫박을 확인한다','받은 곡식을 됫박으로 다시 재어 보니 관아 장부에 적힌 양보다 적었다.',{proof:4,knowledge:1,complaints:1},'record'),
   O('모자란 곡식까지 갚는다','곳간이 더 비게 된다','남은 곳간을 다시 헤아려야 했다.',{grain:-6,grainDebt:2,anger:2},'pay'),
   O('같은 일을 겪은 집들과 모인다','여러 집의 분량을 비교한다','이웃집이 받은 곡식도 직접 재어 보니 장부보다 적었다. 함께 관아에 알렸다.',{trust:4,anger:3,complaints:1},'organize')]),
 E('grainBad','환정',1800,1869,'상한 곡식을 받아 가라 하다',
  '관아에서 나온 환곡 일부가 먹기 어려운 상태인데도 좋은 곡식처럼 장부에 적힌다.',SRC.system,[
   O('곡식 상태를 증언하게 한다','있는 그대로 장부에 남기려 한다','곰팡이가 핀 곡식과 장부를 서로 비교했다.',{proof:4,complaints:1},'record'),
   O('쓸 수 있는 곡식을 골라 둔다','먹지 못할 곡식은 덜어 내야 한다','먹을 곡식을 고르는 데에도 품이 들었다.',{grain:-3,health:-1,grainDebt:2},'survive'),
   O('이웃과 함께 부당함을 알린다','나눠 준 곡식의 질을 문제 삼는다','여러 집이 상한 곡식 때문에 어려움을 호소했다.',{anger:3,trust:4,complaints:1},'petition')]),
 E('grainPhantom','환정',1810,1869,'창고에 없는 환곡이 장부에 있다',
  '장부에는 돌려받아야 할 환곡이 기록돼 있지만 정작 창고에는 곡식이 부족하다. 모자란 곡식을 백성에게 메우라고 한다.',SRC.system,[
   O('창고와 출납 장부를 대조한다','곡식의 행방을 확인하려 한다','창고에는 곡식이 모자라는데 출납 장부에는 가득하다고 적혀 있었다. 이 차이를 조사해 달라 청했다.',{proof:4,complaints:1},'record'),
   O('집안의 곡식을 내놓는다','원래 부담보다 더 많은 곡식을 낸다','식구에게 돌아갈 양식이 또 줄었다.',{grain:-7,grainDebt:3,anger:2},'pay'),
   O('관아의 조사부터 요구한다','부당함을 함께 증언한다','창고와 장부의 차이를 여러 집이 지적했다.',{anger:4,retaliation:1,trust:3},'petition')]),
 E('grainMarkup','환정',1810,1869,'곡식을 돈으로 갚게 하며 값이 달라지다',
  '곡식 대신 돈으로 내도록 요구하면서 불리한 값으로 계산한다. 집안의 장부와 관아의 계산이 서로 다르다.',SRC.system,[
   O('쌀값과 환산 내역을 적는다','얼마를 내야 하는지 확인한다','장터의 쌀값과 관아가 돈으로 바꿔 계산한 값을 나란히 적었다.',{proof:4,knowledge:2},'record'),
   O('돈을 구해 우선 납부한다','급하게 가진 물건을 팔 수도 있다','관아가 정한 높은 환산 금액을 맞추려고 집안 물건 일부를 팔았다.',{capital:-6,grainDebt:2,anger:1},'pay'),
   O('장터 사람들과 값을 확인한다','장터의 시세와 비교해 항의한다','장터의 쌀값을 알아본 이웃들과 관아의 환산 금액이 지나치게 높다고 따졌다.',{trust:3,anger:3,complaints:1},'organize')]),
 E('clerkBook','관아',1800,1869,'장부를 고치라는 윗사람의 지시',
  '관아에서 일하던 당신에게 실제 징수 내역과 다른 내용을 장부에 쓰라는 지시가 내려왔다.',SRC.power,[
   O('실제로 받은 것만 정확히 쓴다','불이익이 있더라도 거짓 장부를 거절한다','실제로 거둔 곡식의 양만 적었다. 윗사람은 장부를 다시 고치라고 재촉했다.',{proof:4,integrity:4,retaliation:2,trust:1},'refuse'),
   O('시키는 대로 고쳐 적는다','당장은 윗사람의 눈을 피한다','윗사람의 지시대로 장부 숫자를 바꾸었다. 그 때문에 다른 집에 내야 할 세금이 늘었다.',{corruption:4,anger:4,capital:3,trust:-5},'complicit'),
   O('다른 아전과 상의해 조사를 청한다','여럿의 증언을 모으려 한다','함께 일하던 사람에게 고을의 장부 문제를 털어놓았다.',{proof:3,integrity:2,complaints:1,retaliation:1},'petition')
  ],(l,j,v)=>v.origin==='서리 가계'||/아전|서리|관료|관리|수령/.test(v.role||'')),
 E('magistrateLevy','관아',1810,1869,'고을 행사의 비용을 거두다',
  '관아에서 정해진 세금 외에 접대와 행사에 쓸 곡식과 돈을 더 걷으려 한다. 부담을 결정하는 사람은 따로 있다.',SRC.power,[
   O('어떤 명목인지 확인한다','관아 문서를 살핀다','아전에게 더 내라는 돈의 명목을 물어 관아 문서에 적힌 내용과 대조했다.',{proof:3,complaints:1},'record'),
   O('이웃과 조금씩 나누어 부담한다','급한 마찰을 피한다','함께 부담했던 집과 이후에도 세금 이야기를 했다.',{capital:-3,grain:-3,anger:2},'pay'),
   O('부당한 요구를 함께 탄원한다','마을 대표와 함께 사정을 알린다','고을 사람들이 실제로 낸 곡식의 양을 대조한 뒤 함께 탄원서에 이름을 올렸다.',{anger:4,trust:4,complaints:1},'petition')]),
 E('courtBuying','세도정치',1800,1863,'관직을 돈으로 얻는다는 소문',
  '권세 있는 사람의 도움과 돈으로 벼슬을 얻는다는 말이 관가에 돈다. 지방 관리들의 책임을 누가 묻느냐는 불만도 커진다.',SRC.power,[
   O('관직을 사고파는 일을 비판한다','부정한 인사를 바로잡아야 한다고 말한다','청탁으로 얻은 관직 때문에 세금이 늘었다고 관아에서 비판했다. 곁에 있던 관리가 그 말을 들었다.',{knowledge:3,integrity:3,anger:1},'object'),
   O('권세 있는 집과 인연을 구한다','벼슬이 보장되는 것은 아니다','권세를 좇았지만 원하는 일이 되리라는 보장은 없었다.',{capital:-5,corruption:2,contacts:2},'network'),
   O('고을의 살림부터 돌본다','정치와 떨어져 생업을 지킨다','장터에 곡식을 내다 팔고 식구들이 겨울을 날 땔감을 마련했다.',{bonds:2,capital:1},'survive')
  ],(l,j,v)=>/양반|서리|역관|관료|수령/.test(v.origin+' '+v.role)||j.literacy>=4),
 E('officeAudit','관아',1800,1869,'장부를 조사하라는 명',
  '백성들이 잘못된 징수를 알린 문서가 모였다. 장부를 고치고 증언을 살필 기회가 찾아온다.',SRC.system,[
   O('잘못된 장부를 조사한다','실제 납부 기록을 대조한다','억울한 세금을 바로잡은 집도 있었지만 완전히 고치기는 어려웠다.',{proof:4,integrity:4,trust:4,capital:-2},'audit'),
   O('관아의 관행을 그대로 따른다','윗사람의 눈치를 본다','아전은 잘못된 장부를 그대로 두었다. 이듬해에도 같은 집에 추가 세금이 매겨졌다.',{corruption:2,anger:4,trust:-4},'ignore'),
   O('피해 본 백성의 사정을 듣는다','고을 곳곳의 이야기를 모은다','잘못된 세금을 낸 집마다 실제로 낸 곡식과 아전의 요구를 차례로 들었다.',{proof:3,trust:4,complaints:1},'listen')
  ],(l,j,v)=>/서리|아전|관료|관리|수령|어사/.test(v.origin+' '+v.role)||j.office),
 E('uprising1862','저항',1862,1862,'고을의 항의가 큰 봉기로 번지다',
  '단성·진주에서 시작된 항의가 여러 고을로 퍼진다. 사람들은 예전부터 겪은 환곡·군포·토지세의 문제를 떠올린다.',SRC.uprising,[
   O('이웃과 부당한 세금의 기록을 모은다','분노와 요구를 탄원으로 정리한다','잘못 거둔 세금을 증명하는 영수증과 이웃의 말을 모아 탄원서에 붙였다.',{proof:3,trust:3,anger:-2,complaints:1},'petition'),
   O('봉기에 참여하는 마을 사람을 돕는다','관군의 진압과 처벌 위험이 있다','봉기에 가담한 이웃에게 먹을 것을 건넸다. 관군의 수색이 시작되자 식구들도 불안해했다.',{anger:-4,trust:4,capital:-5,health:-2,retaliation:3},'resist'),
   O('식구의 안전과 끼니를 먼저 지킨다','싸움이 있는 곳을 피한다','고을이 어수선한 동안 가족과 서로를 돌보았다.',{grain:-3,bonds:4,anger:-1},'shelter')
  ],(l,j,v)=>['경상도','전라도','충청도','제주도','경기도','황해도','평안도'].includes(j.region)),
 E('reform1862','개혁',1862,1862,'삼정이정청에서 대책을 논하다',
  '조정에서 삼정의 문란을 바로잡으려 기구를 세우고 각지의 의견을 모은다는 소식이 들린다. 그 소식이 고을에 이르자 사람들은 올해 낼 곡식부터 걱정했다.',SRC.reforms,[
   O('우리 집의 잘못된 징수를 적어 보낸다','피해를 설명하는 문서를 마련한다','세금의 잘못을 알렸지만 당장 처리됐다는 소식은 없었다.',{proof:3,complaints:1,knowledge:2},'petition'),
   O('이웃과 개선책을 논의한다','곡식과 군포의 부담을 나누어 살핀다','동네에서 무엇을 먼저 고칠지 이야기했다.',{trust:4,anger:-1,knowledge:2},'discuss'),
   O('변화를 기다리며 생업을 잇는다','큰 제도 변화가 곧바로 닿지는 않는다','조정에서 내건 개혁 방침과 우리 고을의 실제 징수 방식은 달랐다.',{grain:1,bonds:1},'wait')]),
 E('reformAfter','개혁',1863,1865,'관아의 징수 방식은 쉽게 바뀌지 않았다',
  '봉기 뒤 잘못된 제도를 고치려 했지만 고을에 남은 장부와 관행은 한꺼번에 사라지지 않았다.',SRC.reforms,[
   O('다시 부당한 내역을 확인한다','남겨 둔 자료로 재차 따진다','이전에 표시해 둔 세금 항목을 다시 펼쳐 보였다. 아전에게 왜 아직 고치지 않았느냐고 물었다.',{proof:2,complaints:1,anger:-1},'record'),
   O('이웃과 상호부조를 이어 간다','고을 사람들의 관계를 회복한다','쌀이 모자란 이웃집에 곡식을 나누고 다음 농사철의 품앗이를 약속했다.',{trust:4,bonds:2,grain:-2},'mutual'),
   O('새로운 곳에서 생계를 도모한다','이주에도 비용과 위험이 따른다','가족과 다른 고을의 품일을 알아보았다. 길을 떠나려면 여비가 더 필요했다.',{capital:-4,anger:-1,knowledge:2},'move')])
];
const IDS=new Map(EVENTS.map(e=>[e.id,e]));
const isEra=l=>J?.isJoseon(l)&&J.inOldEra(l)&&l.alive&&l.year>=1800&&l.year<=1869;
const elite=l=>{const v=V5.summary(l);return /양반|왕실|서리|관료|수령/.test(v.origin+' '+v.role);};
const intensity=(y,r)=>{const era=y<1800?0:y<1830?2:y<1850?3:y<1862?4:y===1862?6:y<=1865?3:2;
 return era+(r==='전라도'||r==='경상도'||r==='충청도'?1:0);};
function ensure(l){
 if(!J?.isJoseon(l))return null;
 if(!l.joseon18)l.joseon18={version:1,processedYear:l.year,seen:[],queue:[],active:null,
   decisions:[],followups:[],landDebt:0,militaryDebt:0,grainDebt:0,proof:0,complaints:0,
   anger:0,trust:0,retaliation:0,integrity:0,corruption:0,contacts:0,
   lastSource:null,year1862:false,penaltyYears:0,notes:[]};
 return l.joseon18;
}
function fits(l,e,s){
 if(!isEra(l)||l.age<12||l.age>84||l.year<e.from||l.year>e.to)return false;
 if(e.category==='군정'&&l.gender==='여자'&&l.age<18&&!V4.summary(l).people.some(p=>p.sex==='남자'))return false;
 if(e.category==='전정'&&J.ensure(l).land===0&&e.id==='landFalse')return false;
 return !e.gate||e.gate(l,J.summary(l),V5.summary(l));
}
function rank(l,e,s){
 const categoryGap=s.decisions.slice(-3).some(x=>x.category===e.category)?.5:0;
 const power=elite(l)?(e.category==='관아'?-.35:.14):0;
 const office=l.joseon19?.office;
 const policy=office&&['전정','군정','환정'].includes(e.category)?
   (office.levy>=60?-.16:office.integrity>=70?.16:0):0;
 return hash(l.seed,l.year*43+e.id.split('').reduce((n,c)=>n+c.charCodeAt(0),0))+categoryGap+power+policy;
}
function enqueue(l,s,e){
 if(s.seen.includes(e.id)||s.queue.some(q=>q.eventId===e.id)||s.active?.eventId===e.id)return;
 s.seen.push(e.id);s.queue.push({id:l.year+'-'+e.id,eventId:e.id,year:l.year});
 s.queue=s.queue.slice(-4);
}
function promote(l,s){
 if(!s||s.active||l.pending||!l.alive||!J.inOldEra(l)||!s.queue.length)return;
 s.active=s.queue.shift();l.pending='joseon18:'+s.active.id;
}
function prompt(l){
 const s=ensure(l),event=IDS.get(s?.active?.eventId);
 if(!event)return null;
 let description=event.scene;
 if(event.id==='uprising1862'){
  const burden=s.landDebt+s.militaryDebt+s.grainDebt+(V11?.summary(l)?.taxDebt||0);
  description+=(burden>=12?
   ' 당신의 집도 여러 해 곡식과 군포에 쫓겨 왔다. 남아 있는 장부와 가족의 기억이 떠오른다.':
   ' 사는 고을과 집안마다 경험은 다르다. 직접 피해를 겪지 않은 사람도 이웃의 이야기를 듣는다.');
 }else if(event.id==='officeAudit'&&s.corruption>=3)
  description+=' 이전에 묵인하거나 손댄 장부도 조사 대상이 될 수 있다.';
 const official=l.joseon19?.office;
 if(official&&['전정','군정','환정','관아'].includes(event.category))
  description+=' 관아 장부는 아전들의 손에 있고, 수령의 한마디에 일이 달라질 수도 있다.';
 return {title:event.title,description,
  options:event.options.map(o=>({label:o.label,note:o.note,action:o.label}))};
}
function yearly(l,s){
 if(!s||!isEra(l)||s.processedYear>=l.year)return;
 s.processedYear=l.year;
 if(l.joseon14?.captivity?.status==='held')return;
 const j=J.ensure(l),v=V2.ensure(l),vil=V9.ensure(l);
 for(const f of s.followups.filter(f=>f.year<=l.year)){
  l.logEvent(f.text,'joseon18-followup');l.log.at(-1).causeId='joseon18:'+f.id;
  s.notes.push(f.text);
 }
 s.followups=s.followups.filter(f=>f.year>l.year);
 s.notes=s.notes.slice(-20);
 // Persistent costs are fictional household accounting, not historical tax rates.
 const debts=s.landDebt+s.militaryDebt+s.grainDebt;
 if(l.year%4===0&&debts>=7){
  const cost=clip(Math.floor(debts/8),1,3);
  j.capital=clip(j.capital-cost,-120,600);
  v.grain=clip(v.grain-1,0,200);
  s.penaltyYears++;
  l.logEvent('여러 해 쌓인 군포·토지세·환곡 부담 때문에 살림의 여유가 줄었다.','joseon18-memory');
 }
 // A prior petition does not guarantee a fair local judgment.
 if(l.year%5===0&&s.anger>0&&s.trust>1)s.anger=clip(s.anger-1,0,60);
 if(l.year===1862&&!s.year1862){
  s.year1862=true;
  if(fits(l,IDS.get('uprising1862'),s)){
   enqueue(l,s,IDS.get('uprising1862'));
  }
  // The 1862 reform discussion reaches every region but is not an instant success.
  if(l.age>=12&&l.age<=84)enqueue(l,s,IDS.get('reform1862'));
 }else if(l.year>=1863&&l.year<=1865&&l.year===1863&&l.age>=12)enqueue(l,s,IDS.get('reformAfter'));
 if(l.year%3===0&&l.age>=15&&l.age<=79&&s.queue.length<3){
  const pool=EVENTS.filter(e=>e.from<1862&&e.to>=l.year&&fits(l,e,s)&&!s.seen.includes(e.id));
  if(pool.length){
   pool.sort((a,b)=>rank(l,a,s)-rank(l,b,s));
   enqueue(l,s,pool[0]);
  }
 }
 promote(l,s);
}
function choose(l,index){
 const s=ensure(l),e=IDS.get(s?.active?.eventId),choice=e?.options?.[index];
 if(!l.alive||!choice||!Number.isInteger(index))return false;
 const d=choice.d,j=J.ensure(l),v=V2.ensure(l),village=V9.ensure(l);
 const status={};
 for(const k of ['health','happiness','knowledge','bonds','wealth'])if(Number.isFinite(d[k]))status[k]=d[k];
 l.change(status);
 if(Number.isFinite(d.capital))j.capital=clip(j.capital+d.capital,-120,600);
 if(Number.isFinite(d.grain))v.grain=clip(v.grain+d.grain,0,200);
 for(const k of ['proof','complaints','anger','retaliation','integrity','corruption','contacts'])
  if(Number.isFinite(d[k]))s[k]=clip(s[k]+d[k],0,k==='anger'?60:90);
 if(Number.isFinite(d.trust)){
  s.trust=clip(s.trust+d.trust,0,60);
  village.trust=clip(village.trust+d.trust,0,100);
 }
 const toKey={land:'landDebt',military:'militaryDebt',grainDebt:'grainDebt'};
 for(const [key,dest] of Object.entries(toKey))
  if(Number.isFinite(d[key]))s[dest]=clip(s[dest]+d[key],0,70);
 // A prior success in collecting testimony improves prospects only, not a guarantee.
 if((choice.tag==='record'||choice.tag==='audit')&&s.proof>=9&&s.complaints>=3&&
    hash(l.seed,l.year*7+index+133)<.28){
  for(const key of ['landDebt','militaryDebt','grainDebt'])
   s[key]=clip(s[key]-1,0,70);
  l.logEvent('제출한 자료의 일부가 인정되어 장부의 부담을 조금 덜었다. 모두가 같은 결과를 얻지는 못했다.','joseon18-memory');
 }
 if(l.money&&l.year<1900)l.money.netWorth=j.capital*100;
 const office=l.joseon19;
 if(office&&office.office&&['전정','군정','환정','관아'].includes(e.category)){
  if(d.anger>0)office.anger=clip(office.anger+Math.min(3,d.anger),0,60);
  if(d.proof>0)office.proof=clip(office.proof+Math.min(3,d.proof),0,100);
  if(d.complaints>0)office.petitions=clip(office.petitions+Math.min(2,d.complaints),0,100);
  if(d.corruption>0)office.corruption=clip(office.corruption+Math.min(3,d.corruption),0,100);
 }
 const qid=s.active.id;
 l.logEvent(e.title+' — '+choice.label,'joseon18-choice');
 l.log.at(-1).causeId='joseon18:'+qid;
 l.log.at(-1).sourceUrl=e.source;
 s.decisions.push({id:qid,eventId:e.id,category:e.category,year:l.year,choice:index});
 s.decisions=s.decisions.slice(-75);
 s.followups.push({id:qid,year:l.year+2+(index%2),text:choice.follow});
 s.followups=s.followups.slice(-48);
 s.lastSource=e.source;
 s.active=null;l.pending=null;promote(l,s);
 return true;
}
function summary(l){
 const s=ensure(l);if(!s)return null;
 const debt=s.landDebt+s.militaryDebt+s.grainDebt;
 return {land:s.landDebt,military:s.militaryDebt,grain:s.grainDebt,total:debt,
  proof:s.proof,complaints:s.complaints,anger:s.anger,trust:s.trust,
  integrity:s.integrity,corruption:s.corruption,retaliation:s.retaliation,
  intensity:intensity(l.year,J.ensure(l).region),decisions:s.decisions.length,
  reformed:s.year1862,penaltyYears:s.penaltyYears,
  lastSource:s.lastSource,lastEvent:s.decisions.at(-1)?.eventId||null};
}
function inherit(parent,child){
 if(!parent||!child||!J?.isJoseon(parent)||!J.isJoseon(child))return false;
 const from=ensure(parent),to=ensure(child);
 for(const k of ['landDebt','militaryDebt','grainDebt'])
  to[k]=clip(Math.floor(from[k]*.5),0,70);
 to.proof=clip(Math.floor(from.proof*.7),0,90);
 to.anger=clip(Math.floor(from.anger*.5),0,60);
 to.trust=clip(Math.floor(from.trust*.6),0,60);
 to.processedYear=child.year;
 if(to.landDebt+to.militaryDebt+to.grainDebt)
  child.logEvent('앞세대에서 바로잡지 못한 토지세·군포·환곡 부담의 일부가 집안에 남아 있다.','joseon18-family');
 return true;
}
function hydrate(l,data){
 const s=ensure(l),o=data?.joseon18;
 if(!s||!o||o.version!==1)return s;
 s.processedYear=clip(Number(o.processedYear)||l.birthYear,l.birthYear,l.year);
 s.seen=Array.isArray(o.seen)?o.seen.filter(id=>IDS.has(id)).slice(-EVENTS.length):[];
 const valid=q=>q&&IDS.has(q.eventId)&&typeof q.id==='string'&&
  Number.isInteger(q.year)&&q.year>=l.birthYear&&q.year<=l.year;
 const clean=q=>({id:q.id.slice(0,65),eventId:q.eventId,year:q.year});
 s.queue=Array.isArray(o.queue)?o.queue.filter(valid).slice(-4).map(clean):[];
 s.active=valid(o.active)&&data?.pending==='joseon18:'+o.active.id&&l.alive&&J.inOldEra(l)?
  clean(o.active):null;
 s.decisions=Array.isArray(o.decisions)?o.decisions.filter(x=>x&&IDS.has(x.eventId)&&Number.isInteger(x.year)&&x.year<=l.year&&x.year>=l.birthYear&&Number.isInteger(x.choice)&&x.choice>=0&&x.choice<3).slice(-75)
  .map(x=>({id:String(x.id).slice(0,65),eventId:x.eventId,category:IDS.get(x.eventId).category,year:x.year,choice:x.choice})):[];
 s.followups=Array.isArray(o.followups)?o.followups.filter(x=>x&&typeof x.id==='string'&&typeof x.text==='string'&&Number.isInteger(x.year)&&x.year>l.year&&x.year<=l.year+4).slice(-48)
  .map(x=>({id:x.id.slice(0,65),year:x.year,text:x.text.slice(0,220)})):[];
 for(const k of ['landDebt','militaryDebt','grainDebt','proof','complaints','anger','trust','retaliation','integrity','corruption','contacts','penaltyYears'])
  s[k]=clip(Number(o[k])||0,0,k==='anger'?60:90);
 s.year1862=o.year1862===true;
 s.notes=Array.isArray(o.notes)?o.notes.filter(x=>typeof x==='string').slice(-20).map(x=>x.slice(0,220)):[];
 s.lastSource=Object.values(SRC).includes(o.lastSource)?o.lastSource:null;
 if(s.active)l.pending='joseon18:'+s.active.id;
 return s;
}
function install(){
 if(!Sim?.Life||!J?.isJoseon||!V2?.ensure||!V4?.summary||!V5?.summary||!V9?.ensure||Sim.Life.prototype.__joseon18)return false;
 const L=Sim.Life,tick=L.prototype.tick,oldChoose=L.prototype.choose,oldGet=L.prototype.getChoice,
   oldReflect=L.prototype.reflect,oldSnap=L.prototype.snapshot,oldRestore=L.restore;
 L.prototype.tick=function(){
  if(!J.inOldEra(this)||this.year>1869)return tick.call(this);
  const was=this.year,ok=tick.call(this);
  if(ok&&this.alive&&this.year!==was)yearly(this,ensure(this));
  return ok;
 };
 L.prototype.getChoice=function(){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon18:'))return prompt(this);
  return oldGet.call(this);
 };
 L.prototype.choose=function(index){
  if(J.isJoseon(this)&&typeof this.pending==='string'&&this.pending.startsWith('joseon18:'))return choose(this,index);
  const ok=oldChoose.call(this,index);
  if(ok&&isEra(this))promote(this,ensure(this));
  return ok;
 };
 L.prototype.reflect=function(t){const ok=oldReflect.call(this,t);if(ok&&isEra(this))promote(this,ensure(this));return ok;};
 L.prototype.snapshot=function(){
  const s=oldSnap.call(this);if(J.isJoseon(this))s.joseon18=JSON.parse(JSON.stringify(ensure(this)));return s;
 };
 L.restore=function(data){
  const l=oldRestore.call(this,data);if(l&&J.isJoseon(l))hydrate(l,data);return l;
 };
 Object.defineProperty(L.prototype,'__joseon18Carry',{value:inherit});
 Object.defineProperty(L.prototype,'__joseon18',{value:true});return true;
}
install();
return Object.freeze({EVENTS,SRC,ensure,summary,yearly,choose,hydrate,inherit,prompt,intensity,install});
});
