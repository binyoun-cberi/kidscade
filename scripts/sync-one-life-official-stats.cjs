'use strict';
/**
 * Deterministic, source-labelled offline snapshot for One Life.
 * World Bank Indicators API v2 redistributes indicators from UN, UNESCO UIS,
 * ILO ILOEST, WHO GHO and UNICEF/UN IGME. No person-level data is downloaded.
 */
const fs=require('node:fs');
const path=require('node:path');
const game=path.resolve(__dirname,'../games/high_one_life');
const Sim=require(path.join(game,'engine.js'));
const ENDPOINT='https://api.worldbank.org/v2';
const SERIES={
  population:{code:'SP.POP.TOTL',source:'UN/World Bank',unit:'persons'},
  crudeBirthRate:{code:'SP.DYN.CBRT.IN',source:'UN DESA / national statistics via World Bank',unit:'births per 1000'},
  sexRatioBirth:{code:'SP.POP.BRTH.MF',source:'UN DESA / national statistics via World Bank',unit:'male births per female birth'},
  urbanPercent:{code:'SP.URB.TOTL.IN.ZS',source:'UN DESA / World Bank',unit:'%'},
  primaryCompletion:{code:'SE.PRM.CMPT.ZS',source:'UNESCO UIS',unit:'gross rate %'},
  unemployment:{code:'SL.UEM.TOTL.ZS',source:'ILO modelled estimate',unit:'%'},
  under5Mortality:{code:'SH.DYN.MORT',source:'UN IGME / UNICEF, WHO, UN, World Bank',unit:'deaths per 1000 live births'},
  healthCoverage:{code:'SH.UHC.SRVS.CV.XD',source:'WHO GHO',unit:'0-100 index'},
  physiciansPerThousand:{code:'SH.MED.PHYS.ZS',source:'WHO Global Health Workforce / OECD / national statistics',unit:'doctors per 1000'},
  lifeExpectancy:{code:'SP.DYN.LE00.IN',source:'UN DESA / national statistics via World Bank',unit:'years'}
};
const slugFromFlag=flag=>Array.from(flag||'').map(ch=>String.fromCharCode(ch.codePointAt(0)-0x1f1e6+65)).join('');
const expectedCodes=Object.fromEntries(Sim.COUNTRIES.map(c=>[c[0],slugFromFlag(c[1])]));
if(Object.keys(expectedCodes).length!==103||new Set(Object.values(expectedCodes)).size!==103)throw new Error('Country catalogue or flag ISO2 mapping changed');
async function download(url){
  let last;
  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'Kidscade-One-Life-Statistics/1.0'},signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw new Error('HTTP '+response.status+' '+url);
      const parsed=await response.json();
      if(!Array.isArray(parsed)||!Array.isArray(parsed[1]))throw new Error('Unexpected World Bank API payload '+url);
      return parsed[1];
    }catch(err){last=err;if(attempt<2)await new Promise(ok=>setTimeout(ok,900*(attempt+1)));}
  }
  throw last;
}
async function collect(){
  const metadata=await download(ENDPOINT+'/country?format=json&per_page=400');
  const iso3To2=new Map(metadata.filter(x=>x.id&&x.iso2Code&&x.iso2Code.length===2).map(x=>[x.id,x.iso2Code]));
  const rows=await Promise.all(Object.entries(SERIES).map(async ([key,desc])=>{
    const url=ENDPOINT+'/country/all/indicator/'+desc.code+'?format=json&date=2019:2026&per_page=20000';
    try{return [key,await download(url)];}
    catch(error){
      if(key==='healthCoverage'){
        console.warn('WHO UHC indicator temporarily unavailable; no values will be inferred:',error.message);
        return [key,[]];
      }
      throw error;
    }
  }));
  const indexes={};
  for(const [key,records] of rows){
    const index=new Map();
    for(const item of records){
      if(item.value===null||!Number.isFinite(Number(item.value)))continue;
      const iso2=iso3To2.get(item.countryiso3code)||item.country?.id;
      if(!iso2||iso2.length!==2)continue;
      const year=Number(item.date),value=Number(item.value);
      if(!Number.isInteger(year)||year<2019||year>2026)continue;
      let group=index.get(iso2);if(!group){group=new Map();index.set(iso2,group);}
      group.set(year,value);
    }
    indexes[key]=index;
  }
  const countries={};
  const coverage={};
  for(const [name,iso2] of Object.entries(expectedCodes)){
    const profile={iso2};
    for(const [key,desc] of Object.entries(SERIES)){
      const set=indexes[key].get(iso2);
      const years=[...(set?.keys()||[])].sort((a,b)=>b-a);
      if(years.length){profile[key]={value:Number(set.get(years[0]).toFixed(5)),year:years[0]};coverage[key]=(coverage[key]||0)+1;}
    }
    const pop=indexes.population.get(iso2),rate=indexes.crudeBirthRate.get(iso2);
    const common=[...(pop?.keys()||[])].filter(y=>rate?.has(y)).sort((a,b)=>b-a);
    if(common.length){
      const year=common[0],estimated=pop.get(year)*rate.get(year)/1000;
      if(estimated>0){profile.estimatedBirths={value:Math.round(estimated),year,kind:'derived: population × crude birth rate'};
        coverage.estimatedBirths=(coverage.estimatedBirths||0)+1;}
    }
    countries[name]=profile;
  }
  if((coverage.estimatedBirths||0)<85 || (coverage.under5Mortality||0)<85 || (coverage.unemployment||0)<80)
    throw new Error('Insufficient verified source coverage: '+JSON.stringify(coverage));
  const output={schema:1,updatedAt:new Date().toISOString(),source:'World Bank Indicators API v2 (upstream: UN, UNESCO, ILO, WHO, UNICEF/UN IGME)',
    definitions:SERIES,coverage,countries};
  for(const [country,data] of Object.entries(countries)){
    if(data.estimatedBirths && !(data.estimatedBirths.value>0))throw new Error('Invalid births '+country);
    for(const k of ['primaryCompletion','unemployment','urbanPercent','under5Mortality','healthCoverage','physiciansPerThousand']){
      if(data[k] && (data[k].value<0||data[k].value>(k==='under5Mortality'?1000:k==='primaryCompletion'?250:k==='physiciansPerThousand'?30:100)))
        throw new Error('Out-of-range '+country+' '+k+' '+data[k].value);
    }
  }
  return output;
}
async function main(){
  const snapshot=await collect();
  const serialized=JSON.stringify(snapshot);
  const js='/* Generated by scripts/sync-one-life-official-stats.cjs; do not hand-edit. */\n'+
    '(function(root){\'use strict\';const snapshot='+serialized+';'+
    'if(typeof module!==\'undefined\'&&module.exports)module.exports=snapshot;'+
    'if(root)root.OneLifeOfficialStats=snapshot;})(typeof window!==\'undefined\'?window:null);\n';
  fs.writeFileSync(path.join(game,'official-data.js'),js);
  // Bump only the official snapshot URL when the source snapshot changes.
  // A retained browser tab should never silently keep last month's statistics.
  const htmlPath=path.join(game,'index.html');
  const html=fs.readFileSync(htmlPath,'utf8');
  const stamp=snapshot.updatedAt.replace(/[-:TZ.]/g,'').slice(0,12);
  const bumped=html.replace(/official-data\.js\?v=[0-9]+/,'official-data.js?v='+stamp);
  if(bumped===html&& !html.includes('official-data.js?v='+stamp))
    throw new Error('Official data script tag missing from index');
  if(bumped!==html)fs.writeFileSync(htmlPath,bumped);
  console.log('Verified official data snapshot:',JSON.stringify({updatedAt:snapshot.updatedAt,coverage:snapshot.coverage,countries:Object.keys(snapshot.countries).length}));
}
if(require.main===module)main().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
module.exports={collect,SERIES,slugFromFlag};
