(function(global){
"use strict";
var EVENTS=[
  {
    id:"goguryeo_cavalry_reform",nation:"goguryeo",turn:7,condition:"expansion",
    title:"북방 기병 정비",eyebrow:"역사에서 착안한 선택",
    desc:"넓어진 영토를 지키려면 빠른 군대와 안정적인 동원 체계 중 하나에 힘을 실어야 합니다.",
    choices:[
      {id:"cavalry",title:"기병 중심 개편",desc:"기병 모집 비용 -2 · 기병 모집 병력 +20",effects:{bonuses:{cavalryDiscount:2,cavalryRecruit:20},resources:{authority:-4}}},
      {id:"balanced",title:"균형 동원",desc:"권위 +8 · 인력 +6",effects:{resources:{authority:8,manpower:6}}}
    ]
  },
  {
    id:"goguryeo_border_forts",nation:"goguryeo",turn:18,condition:"front",
    title:"산성 방어선 강화",eyebrow:"국경의 선택",
    desc:"접경 지역의 긴장이 높아졌습니다. 산성과 요새를 강화할지, 공격군을 정비할지 결정합니다.",
    choices:[
      {id:"forts",title:"산성망 강화",desc:"전체 방어력 +5% · 요새 방어력 추가 +10%",effects:{bonuses:{defenseBonus:.05,fortDefense:.10}}},
      {id:"offense",title:"기동 공격대",desc:"전체 공격력 +5% · 인력 +4",effects:{bonuses:{attackBonus:.05},resources:{manpower:4}}}
    ]
  },
  {
    id:"baekje_western_trade",nation:"baekje",turn:7,condition:"coast",
    title:"서해 교역 확대",eyebrow:"역사에서 착안한 선택",
    desc:"해안 거점이 늘어나면서 교역망을 넓힐 기회가 생겼습니다.",
    choices:[
      {id:"trade",title:"교역항 확대",desc:"해안 영토 재정 +1 · 매 턴 추가 재정 +1",effects:{bonuses:{coastIncome:1,incomeBonus:1}}},
      {id:"army",title:"군량 확보",desc:"식량 +12 · 인력 +6 · 권위 +3",effects:{resources:{food:12,manpower:6,authority:3}}}
    ]
  },
  {
    id:"baekje_han_front",nation:"baekje",turn:18,condition:"front",
    title:"한강 방면 재편",eyebrow:"전선의 선택",
    desc:"한강과 내륙 전선의 압박이 커졌습니다. 공격 준비와 경제 안정 가운데 우선순위를 정합니다.",
    choices:[
      {id:"strike",title:"선제 대응",desc:"전체 공격력 +4% · 신규 모집 병력 +10",effects:{bonuses:{attackBonus:.04,recruitBonus:10}}},
      {id:"wealth",title:"후방 경제 정비",desc:"매 턴 추가 재정 +2",effects:{bonuses:{incomeBonus:2}}}
    ]
  },
  {
    id:"silla_hwarang",nation:"silla",turn:7,condition:"expansion",
    title:"청년 조직 강화",eyebrow:"역사에서 착안한 선택",
    desc:"새 영토를 지킬 인력을 조직적으로 훈련할 필요가 커졌습니다.",
    choices:[
      {id:"training",title:"군사 훈련 강화",desc:"신규 모집 병력 +20 · 전체 공격력 +3%",effects:{bonuses:{recruitBonus:20,attackBonus:.03}}},
      {id:"unity",title:"지방 결속 강화",desc:"권위 +10 · 인력 +5",effects:{resources:{authority:10,manpower:5}}}
    ]
  },
  {
    id:"silla_fortress_network",nation:"silla",turn:18,condition:"front",
    title:"동남부 방어망 정비",eyebrow:"국경의 선택",
    desc:"도시와 산지를 연결하는 방어 체계를 어떻게 정비할지 결정합니다.",
    choices:[
      {id:"fortress",title:"요새망 강화",desc:"전체 방어력 +5% · 요새 방어력 추가 +10%",effects:{bonuses:{defenseBonus:.05,fortDefense:.10}}},
      {id:"markets",title:"도시 기반 강화",desc:"매 턴 추가 재정 +2 · 권위 +4",effects:{bonuses:{incomeBonus:2},resources:{authority:4}}}
    ]
  }
];
function all(){return EVENTS.slice();}
function forNation(nation){return EVENTS.filter(function(e){return e.nation===nation;});}
function get(id){return EVENTS.find(function(e){return e.id===id;})||null;}
function choice(eventId,choiceId){
  var e=get(eventId);return e?e.choices.find(function(c){return c.id===choiceId;})||null:null;
}
global.UnificationWarEvents={all:all,forNation:forNation,get:get,choice:choice};
})(window);
