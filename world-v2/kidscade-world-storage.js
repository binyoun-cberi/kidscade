/* Kidscade World v2 - isolated storage and legacy snapshots. */
(function(root){
  'use strict';
  const NS=root.KidscadeWorldV2=root.KidscadeWorldV2||{};
  const KEY='kidscade_world_v2';
  const VERSION=2;

  function parse(raw,fallback=null){try{return raw?JSON.parse(raw):fallback}catch(_){return fallback}}
  function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
  function readKey(key,fallback=null){return parse(localStorage.getItem(key),fallback);}
  function writeKey(key,value){localStorage.setItem(key,JSON.stringify(value));return value;}

  function legacySnapshot(){
    const garden=readKey('kidscade_garden_v1',null);
    const lifeCandidates=['kidscade_life_world_v1','kidscade_life_v1','kidscade_life_world'];
    let life=null,lifeKey=null;
    for(const k of lifeCandidates){const v=readKey(k,null);if(v&&typeof v==='object'){life=v;lifeKey=k;break;}}
    const seedsRaw=localStorage.getItem('kidscade_coins');
    const seeds=Number.isFinite(Number(seedsRaw))?Number(seedsRaw):0;
    return {garden:clone(garden),life:clone(life),lifeKey,seeds};
  }

  function freshState(){
    return {
      version:VERSION,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      player:{x:620,y:520,lastZone:'home-yard'},
      inventory:{wood:0,stone:0,iron:0,crop:0,fish:0,bug:0,potato:0,carrot:0,tomato:0},
      progression:{
        energy:100,maxEnergy:100,
        tools:{},
        seeds:{potato:2,carrot:2,tomato:2},
        crops:{},
        crafted:[],
        food:{},
        fishDex:{},
        kitchen:{pending:null},
        cubePets:{version:1,owned:[],met:[],companion:'',migratedLegacy:false},
        starterKitClaimed:false,
        starterHintSeen:false,
        groundPickups:{},
        town:{
          coins:120,fun:80,jobs:{},friendship:{},talked:{},visits:0,
          delivery:{active:false,target:'cafe',startedDay:0,completedDay:0,reward:95},
          dailyPlay:{arcadePrizeDay:0},libraryDay:0
        }
      },
      world:{flags:{},objects:{}},
      migration:{source:'legacy-readonly',completed:false,lastPreview:null}
    };
  }

  function normalize(raw){
    const base=freshState();
    if(!raw||typeof raw!=='object')return base;
    base.createdAt=typeof raw.createdAt==='string'?raw.createdAt:base.createdAt;
    base.updatedAt=typeof raw.updatedAt==='string'?raw.updatedAt:base.updatedAt;
    if(raw.player&&typeof raw.player==='object')base.player={...base.player,...raw.player};
    if(raw.inventory&&typeof raw.inventory==='object')base.inventory={...base.inventory,...raw.inventory};
    if(raw.progression&&typeof raw.progression==='object'){
      const p=raw.progression;
      base.progression={
        ...base.progression,...p,
        tools:{...base.progression.tools,...(p.tools||{})},
        seeds:{...base.progression.seeds,...(p.seeds||{})},
        crops:{...base.progression.crops,...(p.crops||{})},
        crafted:Array.isArray(p.crafted)?[...p.crafted]:[],
        food:{...base.progression.food,...(p.food||{})},
        fishDex:{...base.progression.fishDex,...(p.fishDex||{})},
        kitchen:{...base.progression.kitchen,...(p.kitchen||{})},
        groundPickups:{...base.progression.groundPickups,...(p.groundPickups||{})}
      };
    }
    if(raw.world&&typeof raw.world==='object')base.world={flags:{...(raw.world.flags||{})},objects:{...(raw.world.objects||{})}};
    if(raw.migration&&typeof raw.migration==='object')base.migration={...base.migration,...raw.migration};
    return base;
  }

  const Storage={
    KEY,VERSION,
    load(){return normalize(readKey(KEY,null));},
    save(state){const n=normalize(state);n.updatedAt=new Date().toISOString();return writeKey(KEY,n);},
    reset(){localStorage.removeItem(KEY);return freshState();},
    snapshotLegacy:legacySnapshot,
    previewMigration(){
      const legacy=legacySnapshot();
      return {
        gardenAnimals:Array.isArray(legacy.garden?.owned)?legacy.garden.owned.length:0,
        gardenFacilities:Array.isArray(legacy.garden?.placed)?legacy.garden.placed.length:0,
        hasLifeSave:!!legacy.life,
        lifeKey:legacy.lifeKey,
        seeds:legacy.seeds
      };
    },
    clone
  };
  NS.Storage=Storage;
})(window);
