(function(g){
'use strict';
const W=960,H=540,FLOOR=448;
const STAGES=[
 {title:'첫 발자국',chapter:'조작 연습',description:'오른쪽 문까지 걸어가 보세요. 막힐 때는 점프!',tip:'← → 또는 A·D로 이동, 스페이스로 점프',kind:'walk',spawn:64},
 {title:'어둠 너머의 문',chapter:'밝기',description:'문이 어둠에 잠겼어요. 밝기를 올리면 길이 보여요.',tip:'설정에서 밝기를 70 이상으로 올려 보세요.',kind:'dark',spawn:64},
 {title:'조용히 지나가기',chapter:'소리',description:'소리를 듣는 감시자가 있어요. 작은 소리는 잘 들리지 않아요.',tip:'소리를 20 이하로 줄이면 안전하게 지나갈 수 있어요.',kind:'sound',spawn:64},
 {title:'창을 딛고',chapter:'드래그',description:'길이 끊어졌어요. 작은 설정 창을 잡아 끌어 발판으로 사용하세요.',tip:'게임 화면 속 작은 창을 틈 가운데로 끌고, 점프해서 건너세요.',kind:'platform',spawn:64},
 {title:'화면의 끝을 늘려라',chapter:'화면 크기',description:'화면 가장자리가 길이 될 수 있어요. 화면 너비를 늘려 보세요.',tip:'화면 너비를 늘려 빛나는 다리를 연장하세요.',kind:'frame',spawn:64},
 {title:'날아오는 신호',chapter:'창 방패',description:'발사 장치가 신호탄을 쏩니다. 설정 창을 끌어 그 앞을 막아 보세요.',tip:'설정 창으로 신호탄을 두 번 막으면 문이 열려요.',kind:'shield',spawn:64},
 {title:'모든 설정의 열쇠',chapter:'마지막 퍼즐',description:'밝기, 소리, 화면 너비를 모두 조절해 마지막 문으로 향하세요.',tip:'밝기 68 이상, 소리 20 이하, 화면 너비 75 이상이 필요해요.',kind:'final',spawn:64}
];
function clamp(n,a,b){return Math.min(b,Math.max(a,Number(n)||0))}
function guardRadius(sound){return 26+clamp(sound,0,100)*1.75}
function bridgeWidth(frame){return Math.round(365*clamp(frame,0,100)/100)}
function canExit(stage,s,intercepts){
 switch(STAGES[stage]?.kind){
 case 'dark':return s.brightness>=70;
 case 'sound':return s.volume<=20;
 case 'frame':return s.frame>=72;
 case 'shield':return intercepts>=2;
 case 'final':return s.brightness>=68&&s.volume<=20&&s.frame>=75;
 default:return true;
 }
}
function floorParts(stage,s){
 const kind=STAGES[stage]?.kind;
 if(kind==='platform')return [{x:0,y:FLOOR,w:344,h:H-FLOOR},{x:677,y:FLOOR,w:W-677,h:H-FLOOR}];
 if(kind==='frame'||kind==='final')return [
 {x:0,y:FLOOR,w:355,h:H-FLOOR},
 {x:690,y:FLOOR,w:W-690,h:H-FLOOR},
 {x:354,y:FLOOR,w:bridgeWidth(s.frame),h:12,bridge:true}
 ];
 return [{x:0,y:FLOOR,w:W,h:H-FLOOR}];
}
function defaultSettings(){return {brightness:35,volume:70,frame:25}}
function isGuardActive(stage,s){return (STAGES[stage]?.kind==='sound'||STAGES[stage]?.kind==='final')&&s.volume>20}
function interceptsShield(shot,panel){
 return shot.x+shot.r>=panel.x&&shot.x-shot.r<=panel.x+panel.w&&shot.y+shot.r>=panel.y&&shot.y-shot.r<=panel.y+panel.h;
}
g.RuleSettingsModeConfig={W,H,FLOOR,STAGES,clamp,guardRadius,bridgeWidth,canExit,floorParts,defaultSettings,isGuardActive,interceptsShield};
})(typeof window!=='undefined'?window:globalThis);
