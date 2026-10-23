/* Central politics of royal relatives and ranking Joseon officials, v3.46 */
(function(root){
 'use strict';
 const core=root.OneLifeSocial346,J=root.OneLifeJoseon,V5=root.OneLifeJoseon5,
  Paths=root.OneLifeJoseon325;
 if(!core)return;
 const C=(label,note,result,meters,money=0,stats={})=>({label,note,result,delta:{meters,money,stats}});
 core.register('court',{
  label:'조정의 권력과 당쟁',
  arrival:'조정에 드나들게 되자 사소한 말 한마디도 조심스러워졌다. 누구와 손을 잡느냐에 따라 앞날이 달라질 것이다.',
  eligible(l,j,s){return l.age>=24&&l.year<=1869&&
    (s.origin==='왕실 종친'||(j.office&&s.rank>=2&&/양반|역관|서리|의관/.test(s.origin)))&&
    !s.monastic;},
  initial:{influence:25,integrity:40,enemies:15,loyalty:30,people:30},
  cases:[
   {title:'대신들의 인사 청탁',intro:'권세 있는 대신이 친척에게 벼슬을 내려 달라고 청한다. 능력을 따질지, 부탁을 들어줄지 마음이 무겁다.',
    options:[
     C('공적과 자격부터 확인한다','권세가의 부탁을 들어주지 못해 눈총을 받을 수 있다.','실제 맡았던 일과 자격을 확인한 뒤 임용에 관한 의견을 올렸다.',{integrity:10,people:4,enemies:7,influence:-3},-2),
     C('권세가가 부탁한 인물을 지지한다','후원은 늘지만 다른 관료의 반발도 커진다.','권세가의 청탁을 도왔다. 그 자리에 있던 사람들은 인사의 까닭을 수군거렸다.',{influence:9,integrity:-8,enemies:6,loyalty:3},8),
     C('결정에서 빠지고 논의 기록을 남긴다','당장 얻는 것은 없어도 훗날 누가 무슨 말을 했는지 밝힐 수 있다.','직접 추천하지 않고 논의에 오간 이유와 증언을 기록했다.',{integrity:4,loyalty:3,influence:-2},-1)]},
   {title:'국왕 앞에 올릴 세금 개혁',intro:'지방 관리가 흉년의 세금 부담을 낮춰 달라고 보고했다. 나라 곳간도 넉넉하지 않지만 백성의 살림은 더 어렵다.',
    options:[
     C('피해 고을의 장부를 모아 감면을 청한다','백성의 부담을 낮추려면 다른 재원을 찾아야 한다.','세곡과 피해 기록을 비교해 부담을 덜어 달라는 글을 올렸다.',{people:11,integrity:7,loyalty:2,influence:-3},-5),
     C('기존 징수를 유지하도록 한다','재정은 지키지만 어려운 고을의 원망이 커진다.','올해는 종전 세금을 거두도록 주장했다. 힘든 집들은 그대로 징수를 감당했다.',{influence:5,people:-9,enemies:5,loyalty:2},3),
     C('가장 어려운 마을부터 한시적으로 돕는다','모든 집을 돕지는 못하지만 실질적인 구휼을 추진한다.','곡식이 모자란 마을을 먼저 돕도록 건의했다.',{people:7,integrity:5,loyalty:5},-4)]},
   {title:'당파의 탄핵 상소',intro:'한 관료를 탄핵하는 상소가 올라왔다. 과거의 잘못인지 정파가 다른 것이 이유인지 논쟁이 크다.',
    options:[
     C('증언과 혐의를 나누어 검토한다','어느 편에서도 마음에 들어 하지 않을 수 있다.','확인된 증언과 추측을 나누어 다시 조사할 것을 청했다.',{integrity:12,enemies:5,loyalty:5},-2),
     C('자신과 가까운 편의 탄핵에 힘을 싣는다','당장 권력을 얻을 수 있지만 정국이 바뀌면 책임을 져야 한다.','가까운 당파의 탄핵을 지지했다. 반대파의 이름이 장부에 남았다.',{influence:12,enemies:13,integrity:-8},5),
     C('갈등에서 물러나 지방의 일에 집중한다','큰 관직의 기회를 놓칠 수 있다.','상소 논쟁에서 빠져 백성의 일에 힘을 쓰겠다고 했다.',{people:6,enemies:-4,influence:-7,integrity:3},-1)]},
   {title:'왕실의 혼사와 후계 논의',intro:'왕실 친척의 혼사와 자녀 교육 문제를 놓고 여러 가문이 다가온다. 가까이할수록 정치적 위험도 생긴다.',
    options:[
     C('친족에게 신중히 선택하라고 조언한다','혼사를 치를 사람들의 뜻부터 살핀다.','가문의 이익뿐 아니라 당사자의 뜻과 집안 형편을 살펴보자고 말했다.',{integrity:8,loyalty:5,people:5},-3),
     C('유력 가문과의 관계를 넓힌다','관계는 넓어지지만 다른 가문과 갈등이 생긴다.','권세가와 인연을 맺으려 했다. 새로운 청탁도 함께 따라왔다.',{influence:12,enemies:9,integrity:-5},7),
     C('궁중과 거리를 두고 조용히 살아간다','위험을 피하지만 정치적 입지는 약해진다.','혼사에 개입하지 않고 친족의 평온을 지키려 했다.',{enemies:-7,influence:-9,loyalty:2},-1)]}
  ],
  endingTitle:'조정의 평가가 돌아오다',
  endingIntro:'예전에 올렸던 상소와 사람을 추천한 일이 다시 거론된다. 조정에서는 지난 행적을 따져 묻기 시작했다.',
  endingOptions:[
   C('지난 결정의 근거를 공개하고 책임을 진다','불리한 문서까지 확인받아 정국의 평가를 기다린다.','옛 문서를 살펴 책임져야 할 일을 구분했다.',{integrity:9,loyalty:5,enemies:-2},-4),
   C('유력 대신에게 마지막 힘을 빌린다','도움을 받을 수 있지만 빚진 부탁이 늘어난다.','권세 있는 인물에게 도움을 청했다.',{influence:12,enemies:8,integrity:-6},-6),
   C('벼슬을 내려놓고 가족에게 돌아간다','정치에서 멀어지지만 조정의 평가가 저절로 사라지지는 않는다.','조정에서 물러나 가족과 살림을 돌보기로 했다.',{enemies:-10,influence:-10,people:3},0)
  ],
  outcome(l,p,index,r){
   const j=J.ensure(l),soc=V5.ensure(l),m=p.meters;
   const risk=m.enemies*.72-m.integrity*.30-m.influence*.20+(index===1?12:0);
   if(index!==2&&risk>25&&r<Math.min(.85,.18+risk*.014)){
    if(r<.32&&Paths.lockup(l,Paths.ensure(l),'exile',3,'강원도')){
     soc.rank=Math.min(soc.rank,1);
     return {code:'exile',text:'조정에서 과거의 혐의를 문제 삼아 관직을 거두고 유배를 명했다.'};
    }
    j.office=false;j.occupation='파직되어 향리로 돌아온 전직 관료';l.career=j.occupation;
    return {code:'dismissed',text:'조정의 조사 뒤 관직에서 물러나게 됐다. 지난 인연이 다시 문제가 됐다.'};
   }
   if(index===2){j.office=false;j.occupation='향리로 돌아간 전직 관료';l.career=j.occupation;
    return {code:'retired',text:'벼슬에서 물러나 향리의 살림과 글공부를 이어 갔다.'};}
   if(m.influence>=48&&m.loyalty>=29&&risk<35){j.office=true;soc.rank=Math.max(2,soc.rank);
    j.occupation=soc.origin==='왕실 종친'?'조정에 자문하는 왕실 종친':'더 높은 관직을 맡은 관리';l.career=j.occupation;
    return {code:'advanced',text:'오랜 관계와 조정의 평가가 맞물려 정치적 입지가 커졌다. 왕실 사람이라도 왕위와는 거리가 멀었다.'};}
   j.office=!!j.office;
   return {code:'unsettled',text:'정국이 바뀔 때마다 평가도 달라졌다. 가까운 이들조차 모두 같은 편은 아니었다.'};
  },
  fallback:'조정에서 지난 일의 평가가 이어졌다.',
  endings:{exile:'유배된 중앙 관료',dismissed:'파직된 대신',advanced:'중앙 정치의 실세',retired:'향촌에 물러난 왕족·관리',unsettled:'권세와 당쟁 사이의 인생'}
 });
})(typeof window!=='undefined'?window:null);
