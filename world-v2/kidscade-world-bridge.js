/* Kidscade World v2 - compatibility bridge. Read-only toward existing Kidscade systems for phase 1. */
(function(root){
  'use strict';
  const NS=root.KidscadeWorldV2=root.KidscadeWorldV2||{};

  function host(){
    try{if(root.parent&&root.parent!==root&&root.parent.location.origin===root.location.origin)return root.parent;}catch(_){}
    return root;
  }
  function safe(fn,fallback=null){try{return fn()}catch(_){return fallback}}
  function parse(raw,fallback=null){try{return raw?JSON.parse(raw):fallback}catch(_){return fallback}}

  function readGarden(){
    const h=host();
    const api=safe(()=>h.KidscadeGarden,null);
    if(api&&typeof api.snapshot==='function'){
      const s=safe(()=>api.snapshot(),null);if(s)return s;
    }
    return parse(localStorage.getItem('kidscade_garden_v1'),{})||{};
  }

  function readSeeds(){
    const h=host();
    const fn=safe(()=>h.getPersistedCoins,null);
    if(typeof fn==='function'){
      const n=Number(safe(()=>fn(),0));if(Number.isFinite(n))return n;
    }
    const n=Number(localStorage.getItem('kidscade_coins'));return Number.isFinite(n)?n:0;
  }

  function readAvatarSVG(){
    const h=host();
    const fn=safe(()=>h.renderAvatarSVG,null);
    if(typeof fn==='function')return safe(()=>fn(),'')||'';
    return '';
  }

  function snapshot(){
    const garden=readGarden();
    return {
      seeds:readSeeds(),
      avatarSVG:readAvatarSVG(),
      garden:{
        owned:Array.isArray(garden?.owned)?[...garden.owned]:[],
        placed:Array.isArray(garden?.placed)?garden.placed.map(v=>({...v})):[],
        stock:garden?.stock&&typeof garden.stock==='object'?{...garden.stock}:{},
        origins:garden?.origins&&typeof garden.origins==='object'?{...garden.origins}:{},
        facilities:safe(()=>host().KidscadeGarden?.facilities,{})||{}
      },
      capabilities:{
        liveGardenApi:!!safe(()=>host().KidscadeGarden,false),
        liveSeedApi:typeof safe(()=>host().getPersistedCoins,null)==='function',
        liveAvatarApi:typeof safe(()=>host().renderAvatarSVG,null)==='function',
        phase1ReadOnly:true
      }
    };
  }

  NS.Bridge={host,readGarden,readSeeds,readAvatarSVG,snapshot};
})(window);
