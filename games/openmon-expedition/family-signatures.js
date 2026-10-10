/* Kidscade KIDSMON: 47 researched family signatures.
 * Every signature is original to KidsCade; source sprite/evolution attribution is unchanged.
 * Levels 1 / 14 / 26 represent starter, evolved and final growth respectively.
 */
(function(w){
"use strict";
const DB=w.OPENMON_DEX,TB=w.OPENMON_TURN_BATTLE;
if(!DB?.families||!TB?.registerFamilyMoves)throw Error("Load roster and turn-battle before family-signatures");
const specs=[
 // key, opening technique, battle identity, advanced name, final name
 ["set1-rodent","관성 질주","swift","운동량 돌파"],
 ["set1-mantis","자연선택 베기","weaken","적응 진화격"],
 ["set1-seed","유전 씨앗","twin","우성 유전자탄"],
 ["set1-beetle","몰의 방패","shield","아보가드로 장갑"],
 ["starter-2","광합성 파동","drain","엽록 파동","태양 광합성"],
 ["starter-3","파스칼 압력파","weaken","유체 압력격","임계 압력파"],
 ["starter-4","피보 연격","twin","황금비 연격","무한 피보 연격"],
 ["set2-0-0","다윈의 선택","buff","진화 적응"],
 ["set2-0-1","엽록 궤적","drain","빛의 궤도"],
 ["set2-0-2","부력 도약","swift","아르키 상승"],
 ["set2-0-3","아르키 방패","shield","밀어올림"],
 ["set2-1-0","베르누이 분사","weaken","유속 역류"],
 ["set2-1-1","해류 소용돌이","slow","거대 해류"],
 ["set2-1-2","지층 압축","shield","퇴적 장벽"],
 ["set2-2-0","파스칼 방울탄","twin","압력 물방울"],
 ["set2-2-1","압력 팽창","buff","임계 팽창"],
 ["set4-butterfly","프랙탈 날갯짓","twin","자기 닮음 폭풍"],
 ["set4-0-0","보일 압축","weaken"],
 ["set4-0-1","기체 부피막","shield"],
 ["set4-0-2","나선 공명","twin"],
 ["set4-0-3","엔트로피 불씨","burn"],
 ["set4-1-2","볼타 충격","swift"],
 ["set4-1-3","자력 반발","shield"],
 ["set4-2-0","저항 파동","weaken"],
 ["set4-2-1","자기장 검격","swift"],
 ["set4-2-2","쿨롱 척력","slow"],
 ["set4-2-3","응결 기류","slow"],
 ["set5-0-0","유체 가속","swift","급류 가속격"],
 ["set5-0-1","뉴런 발화","buff","신경 회로"],
 ["set5-0-2","낙하 가속","swift","갈릴레이 강하"],
 ["set5-1-0","우성 유전자","buff","유전자 발현"],
 ["set5-1-1","프랙탈 진동","twin","반복 무늬 연격"],
 ["set5-1-2","절대 냉각","slow","켈빈 동결"],
 ["set5-2-0","궤도 추적","swift","케플러 회전"],
 ["set5-2-1","도플러 잔향","weaken","진동 공명"],
 ["set5-2-2","영하 포옹","shield","빙하 내피"],
 ["set5-3-0","퇴적 돌진","burst","지층 충격"],
 ["set5-3-1","피타고라스 도약","swift","직각 궤도"],
 ["set5-3-2","빙점 폭발","slow","절대영도 파동"],
 ["set5-electric","전류 방패","shield","암페어 장벽"],
 ["set5-4-2","푸리에 변환","twin"],
 ["set5-4-3","카르노 순환","drain"],
 ["set5-4-4","열평형","heal"],
 ["set5-4-5","자기 닮음","twin"],
 ["set5-firebat","열역 폭주","burn","에너지 변환","열역 폭발"],
 ["set5-fibobird","수열 연격","twin","황금비 비행","피보 최종식"],
 ["shibu-main","분기 확률","buff","분화 진화격"]
];
const branchTitles=[
 "자연 선택","유전 정보","유클리드 기하","수압 전달","전위 차이","자기 공명",
 "빛 에너지","관성 낙하","뉴턴의 법칙","열 교환","마찰 전하",
 "피보나치 회전","주파수 변화","기체 압축","가우스 분포","프랙탈 반복",
 "타원 궤도","양자 요동"
];
const styles=["burst","twin","swift","weaken","slow","drain","twin","shield"];
const expected=new Set(DB.families.map(f=>f.key));
if(specs.length!==47||new Set(specs.map(s=>s[0])).size!==47||specs.some(s=>!expected.has(s[0])))
 throw Error("Exactly 47 valid unique family signatures required");
const branch=DB.families.find(f=>f.key==="shibu-main");
const specialBranches=branch.parts.slice(1).map((id,i)=>{
 const sp=DB.species.find(x=>x.id===id);
 return {id,name:branchTitles[i]+"의 힘",style:styles[i%styles.length],type:sp.type};
});
for(const [key,name,style,advancedName,ultimateName] of specs){
 TB.registerFamilyMoves({key,name,style,advancedName,ultimateName,
  branches:key==="shibu-main"?specialBranches:null});
}
w.KIDSMON_FAMILY_SIGNATURES={count:specs.length,definitions:specs.map(s=>({key:s[0],name:s[1],style:s[2]})),branchCount:specialBranches.length};
})(window);
