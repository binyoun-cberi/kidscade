(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ASSET_ROOT='../../assets/game/2d/platformer-art/';
  const REQUEST=ASSET_ROOT+'expansions/request/';
  const PLAYER=ASSET_ROOT+'base/player/';
  const SPRITES={
    sword:REQUEST+'sword-silver.png',shield:REQUEST+'shield-bronze.png'
  };
  const PORTRAITS=[PLAYER+'p1-front.png',PLAYER+'p2-front.png',PLAYER+'p3-front.png'];
  const PARTS={
    sword:[{name:'칼날',instruction:'칼날의 길이에 맞춰 금속을 다듬어요.'},{name:'손잡이',instruction:'손에 쥘 손잡이의 길이를 맞춰요.'}],
    axe:[{name:'도끼날',instruction:'넓은 도끼날에 쓸 금속을 준비해요.'},{name:'고정 고리',instruction:'도끼 자루에 끼울 쇠고리를 만들어요.'}],
    shield:[{name:'방패 판',instruction:'방패 중심 판을 만들 만큼 금속을 모아요.'},{name:'테두리',instruction:'테두리를 둘러 방패를 튼튼하게 해요.'}],
    spear:[{name:'창끝',instruction:'뾰족한 창끝을 만들 금속을 준비해요.'},{name:'연결쇠',instruction:'자루에 고정할 연결쇠를 만듭니다.'}],
    helmet:[{name:'투구 몸통',instruction:'머리를 감싸는 투구의 몸통을 만들어요.'},{name:'이마 보호대',instruction:'투구 앞쪽 보호대를 덧붙여요.'}],
    dagger:[{name:'짧은 칼날',instruction:'가볍고 날카로운 칼날을 만들어요.'},{name:'손 보호대',instruction:'손을 보호하는 가로막을 더해요.'}],
    hammer:[{name:'쇠망치 머리',instruction:'힘을 견딜 단단한 망치 머리를 만들어요.'},{name:'결합 고리',instruction:'나무 손잡이와 연결할 고리를 만들어요.'}],
    crown:[{name:'왕관 띠',instruction:'머리에 두를 황금빛 금속 띠를 만들어요.'},{name:'장식 받침',instruction:'보석을 얹을 장식 받침을 만들어요.'}]
  };
  const SHAPES={
    sword:'<path class="piece-primary" d="M113 16 126 16 139 126 120 143 101 126Z"/><path class="etched" d="M120 27V122"/><path class="piece-secondary" d="M70 138Q120 123 170 138L165 151H75Z"/><path class="piece-secondary" d="M113 148H127V197L120 209 113 197Z"/>',
    axe:'<path class="piece-secondary" d="M115 40H130V207H115Z"/><path class="piece-primary" d="M85 50Q56 58 37 40V125Q60 109 84 127L143 113V65Z"/><path class="etched" d="M77 60 77 114"/>',
    shield:'<path class="piece-primary" d="M120 15 198 46 189 143Q163 194 120 213Q77 194 51 143L42 46Z"/><path class="piece-secondary" d="M120 35 177 58 170 138Q149 177 120 191Q91 177 70 138L63 58Z"/><path class="etched" d="M120 41V184M80 103H161"/>',
    spear:'<path class="piece-secondary" d="M115 99H126V211H115Z"/><path class="piece-primary" d="M120 11Q148 55 145 94L120 111 95 94Q92 55 120 11Z"/><path class="etched" d="M120 26V99"/>',
    helmet:'<path class="piece-primary" d="M52 111Q57 37 120 33Q183 37 188 111L181 159H59Z"/><path class="piece-secondary" d="M53 125H187L181 153H144L136 191H104L96 153H59Z"/><path class="etched" d="M120 42V127"/>',
    dagger:'<path class="piece-primary" d="M112 28H128L138 116L120 132L102 116Z"/><path class="etched" d="M120 35V118"/><path class="piece-secondary" d="M85 130H155V145H85Z"/><path class="piece-secondary" d="M113 142H127V191L120 203 113 191Z"/>',
    hammer:'<path class="piece-secondary" d="M114 85H128V211H114Z"/><path class="piece-primary" d="M45 41H192L199 103H38Z"/><path class="etched" d="M65 55H170M65 90H170"/>',
    crown:'<path class="piece-primary" d="M41 70 65 115 91 45 120 112 149 43 174 113 201 68 191 177H49Z"/><path class="piece-secondary" d="M52 155H188L185 186H55Z"/><path class="etched" d="M68 170H173"/><circle class="gem" cx="120" cy="146" r="11"/><circle class="gem" cx="77" cy="145" r="7"/><circle class="gem" cx="163" cy="145" r="7"/>'
  };
  const TOOL_SHAPES={
    '+':'<path class="wood" d="M19 14 25 11 51 59 45 62Z"/><path class="steel" d="M9 16 40 0 49 19 19 35Z"/><path class="glint" d="M15 17 39 5"/>',
    '-':'<path class="wood" d="M18 10 25 11 34 66 26 66Z"/><path class="steel" d="M5 9 16 2 30 30 16 36Z"/><path class="glint" d="M11 11 20 27"/>',
    '×':'<path class="wood" d="M9 13 15 9 54 60 48 64Z"/><path class="wood" d="M54 13 48 9 9 60 15 64Z"/><path class="steel" d="M1 8 20 0 29 20 10 28ZM44 0 63 8 54 28 35 20Z"/>',
    '÷':'<path class="wood" d="M24 26H32L36 67H28Z"/><path class="steel" d="M29 0Q6 4 4 30L30 27 42 34 43 2Z"/><path class="glint" d="M25 8 11 25"/>'
  };
  function model(itemId,partCount=2,lengths=[]){
    const shape=SHAPES[itemId]||SHAPES.sword;
    const count=Math.max(0,Math.min(2,partCount));
    // The solved metal lengths influence the finished silhouette. Clamp only
    // the *illustration* size so unusually large correct fractions stay legible.
    const scale=value=>value&&Number.isFinite(value.n/value.d)
      ?Math.max(.76,Math.min(1.25,.73+value.n/value.d*.27)):1;
    const primarySize=scale(lengths[0]),secondarySize=scale(lengths[1]);
    return '<svg class="smith-item-svg" viewBox="0 0 240 224" role="img" aria-label="제작 중인 금속 물건" data-built="'+count+'">'+
      '<g class="item-shadow"><ellipse cx="120" cy="214" rx="66" ry="8"/></g>'+
      '<rect class="forge-ingot" x="42" y="130" width="156" height="34" rx="7" />'+
      '<g class="item-art" style="--primary-size:'+primarySize+';--secondary-size:'+secondarySize+'">'+shape+'</g></svg>';
  }
  function sprite(itemId){return SPRITES[itemId]||''}
  function tool(op){return '<svg class="smith-tool-svg" viewBox="0 0 66 68" aria-hidden="true"><g class="tool-shape">'+(TOOL_SHAPES[op]||TOOL_SHAPES['+'])+'</g></svg>'}
  function customer(number){return PORTRAITS[((number%PORTRAITS.length)+PORTRAITS.length)%PORTRAITS.length]}
  function parts(itemId){return (PARTS[itemId]||PARTS.sword).map(p=>({...p}))}
  return {ASSET_ROOT,REQUEST,PLAYER,SPRITES,PARTS,model,sprite,tool,customer,parts};
});
