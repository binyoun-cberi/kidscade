const parts=[
 './topdown-game.js?v=2',
 './topdown-game.part2.txt?v=2',
 './topdown-game.part3.txt?v=2',
 './topdown-game.part4.txt?v=2',
 './topdown-game.part5.txt?v=2',
 './topdown-game.part6.txt?v=2'
];
document.body.classList.add('topdown-code-quest');
Promise.all(parts.map(src=>fetch(src,{cache:'no-store'}).then(r=>{
 if(!r.ok)throw new Error('Top-view engine part failed: '+src);
 return r.text();
}))).then(chunks=>{
 const blob=new Blob([chunks.join('')],{type:'text/javascript'});
 const url=URL.createObjectURL(blob);
 return import(url).finally(()=>URL.revokeObjectURL(url));
}).catch(err=>{
 console.error('[Code Quest top-view loader]',err);
 const title=document.getElementById('execTitle');
 const detail=document.getElementById('execDetail');
 if(title)title.textContent='탑뷰 엔진을 불러오지 못했어요.';
 if(detail)detail.textContent='새로고침 후 다시 시도해 주세요.';
});
