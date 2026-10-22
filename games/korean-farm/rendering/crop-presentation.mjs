// Pure display calculations. Do not mutate gameplay, saves or harvest payout.
const STAGE_BOUNDS=Object.freeze([[0,0],[0,.24],[.24,.49],[.49,.83],[.83,1]]);
export function cropGrowthScale(growth,stage){
  if(!Number.isFinite(growth)||!Number.isInteger(stage)||stage<1||stage>4)return 1;
  const [start,end]=STAGE_BOUNDS[stage];
  const progress=Math.max(0,Math.min(1,(growth-start)/(end-start)));
  // Stage assets still carry their own meaningful morphology; gently interpolate
  // scale within each stage instead of jumping only when the model changes.
  return (stage===4?.92:.82)+(stage===4?.12:.18)*progress;
}
export function harvestRewardLabel(produce,quantity){
  const names={rice:'벼',carrot:'당근',corn:'옥수수'};
  if(!Object.hasOwn(names,produce)||!Number.isInteger(quantity)||quantity<=0)return '';
  return names[produce]+' +'+quantity;
}
