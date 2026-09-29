import {SHARED_3D,getShared3D,shared3DProfile} from './shared-community-3d.js';

export const FARM_STATIC_ASSETS=Object.freeze({
  barn:{id:'farm.barn',role:'축사·창고',target:8.8,tier:2},
  chickenCoop:{id:'farm.chickenCoop',role:'닭장',target:4.8,tier:1},
  siloHouse:{id:'farm.siloHouse',role:'사료·곡물 저장',target:6.8,tier:2},
  windmill:{id:'farm.windmill',role:'농장 랜드마크',target:7.2,tier:3},
  fence:{id:'prop.fence',role:'목장 경계',target:2.8,tier:1},
  well:{id:'prop.well',role:'용수 시설',target:2.6,tier:1},
  cornA:{id:'crop.cornA',role:'옥수수 작물',target:1.45,tier:1},
  cornB:{id:'crop.cornB',role:'옥수수 변형',target:1.45,tier:1},
  rice:{id:'crop.rice',role:'벼',target:1.05,tier:2},
  wheat:{id:'crop.wheat',role:'밀',target:1.1,tier:2}
});

export const FARM_ANIMAL_ASSETS=Object.freeze({
  chick:{id:'animal.chick',species:'chicken',stage:'young',target:0.55,tier:1},
  pig:{id:'animal.pig',species:'pig',stage:'adult',target:1.35,tier:2},
  cowA:{id:'animal.cowA',species:'cow',stage:'adult',target:1.85,tier:3},
  cowB:{id:'animal.cowB',species:'cow',stage:'adult-heavy',target:1.9,tier:3},
  bull:{id:'animal.bull',species:'cow',stage:'bull',target:2.05,tier:4},
  sheepA:{id:'animal.sheepA',species:'sheep',stage:'adult-heavy',target:1.45,tier:3},
  sheepB:{id:'animal.sheepB',species:'sheep',stage:'adult',target:1.4,tier:3},
  donkey:{id:'animal.donkey',species:'donkey',stage:'adult',target:1.75,tier:4},
  horse:{id:'animal.horse',species:'horse',stage:'adult',target:2.05,tier:4}
});

export const FARM_ASSET_TIERS=Object.freeze({
  1:Object.freeze(['chickenCoop','fence','well','cornA','cornB','chick']),
  2:Object.freeze(['barn','siloHouse','rice','wheat','pig']),
  3:Object.freeze(['windmill','cowA','cowB','sheepA','sheepB']),
  4:Object.freeze(['bull','donkey','horse'])
});

export function farmAssetRecord(key){
  const def=FARM_STATIC_ASSETS[key]||FARM_ANIMAL_ASSETS[key];if(!def)return null;
  const asset=getShared3D(def.id),qa=shared3DProfile(def.id);
  return Object.freeze({...def,asset,qa,usableNow:qa.state==='approved'||qa.state==='repair'});
}
export function farmStaticReady(){
  return Object.entries(FARM_STATIC_ASSETS).map(([key])=>farmAssetRecord(key));
}
export function farmAnimalsForQA(){
  return Object.entries(FARM_ANIMAL_ASSETS).map(([key])=>farmAssetRecord(key));
}
export function farmTier(n){
  return (FARM_ASSET_TIERS[n]||[]).map(farmAssetRecord).filter(Boolean);
}
