/* One Life presentation helpers. Pure functions: no game state mutation. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OneLifeUIFlow=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const gcd=(a,b)=>{while(b){const r=a%b;a=b;b=r;}return a;};
  function rouletteIndex(turn,count){
    if(!Number.isInteger(count)||count<1||!Number.isFinite(turn))return 0;
    if(count===1)return 0;
    let stride=Math.max(1,Math.floor(count/2));
    // A stride that shares a divisor with the option count can freeze or
    // skip regions (the old seven-step roulette on seven Goryeo regions).
    while(gcd(stride,count)!==1)stride++;
    return (((Math.floor(turn)*stride)%count)+count)%count;
  }
  function decisionKey(life,choice,reflection){
    if(!life||(!choice&&!reflection))return null;
    const marker=choice?'choice':'reflection';
    // Immutable event identity, not the freshly reconstructed options array.
    return [life.birthYear,life.year,life.age,life.pending||marker,
      choice?.title||'',reflection||''].join('|');
  }
  return Object.freeze({rouletteIndex,decisionKey});
});
