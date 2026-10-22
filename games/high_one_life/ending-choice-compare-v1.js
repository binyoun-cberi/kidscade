/* Compare two complete life-choice histories; never drop repeated same-age choices.
 * Read-only, framework-independent and safe for saved snapshots without choices. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.OneLifeEndingChoiceCompare=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  function groupByAge(records){
    const grouped=new Map();
    if(!Array.isArray(records))return grouped;
    for(const item of records){
      const age=Number(item?.age),label=typeof item?.label==='string'?item.label.trim():'';
      if(!Number.isSafeInteger(age)||age<0||!label)continue;
      if(!grouped.has(age))grouped.set(age,[]);
      grouped.get(age).push(label);
    }
    return grouped;
  }
  function rows(previous,current){
    const before=groupByAge(previous),after=groupByAge(current);
    const ages=[...new Set([...before.keys(),...after.keys()])].sort((a,b)=>a-b);
    return ages.map(age=>{
      const first=before.get(age)||[],second=after.get(age)||[];
      return {age,before:[...first],after:[...second],
        changed:first.length!==second.length||first.some((choice,index)=>choice!==second[index])};
    });
  }
  function summary(previous,current){
    const entries=rows(previous,current);
    const sum=list=>entries.reduce((total,entry)=>total+entry[list].length,0);
    return Object.freeze({
      before:sum('before'),after:sum('after'),
      comparedAges:entries.length,
      changedAges:entries.filter(entry=>entry.changed).length,
      unchangedAges:entries.filter(entry=>!entry.changed).length
    });
  }
  function summaryText(result){
    return '이전 선택 '+result.before+'건 · 이번 선택 '+result.after+
      '건 · 달라진 나이 '+result.changedAges+'곳';
  }
  function readable(choices){
    return choices.length?choices.map((s,i)=>(choices.length>1?String(i+1)+'. ':'')+s).join(' / ')
      :'그 나이에 기록된 선택 없음';
  }
  return Object.freeze({groupByAge,rows,summary,summaryText,readable});
});