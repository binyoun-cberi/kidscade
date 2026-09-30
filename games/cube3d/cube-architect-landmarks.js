/* Cube Architect: detailed, math-readable voxel landmark plans.
   Separate from the game runtime so missions can grow without changing controls. */
(()=>{
  'use strict';
  function plan(name,tip,build){
    const voxels=new Map();
    const key=(x,y,z)=>x+','+y+','+z;
    const add=(x,y,z,role='body',paint='#d8c8a4')=>{
      if(x<0||x>=32||z<0||z>=32||y<0||y>=28)return;
      voxels.set(key(x,y,z),{p:[x,y,z],role,paint});
    };
    const box=(x,z,w,d,h,y=0,role='body',paint='#d8c8a4')=>{
      for(let a=x;a<x+w;a++)for(let c=z;c<z+d;c++)for(let b=y;b<y+h;b++)add(a,b,c,role,paint);
    };
    const cut=(x,z,w,d,h,y=0)=>{
      for(let a=x;a<x+w;a++)for(let c=z;c<z+d;c++)for(let b=y;b<y+h;b++)voxels.delete(key(a,b,c));
    };
    const tier=(cx,cz,radius,y0,levels,role,paint)=>{
      for(let y=0;y<levels;y++){
        const r=Math.max(0,radius-Math.floor(y*radius/levels));
        box(cx-r,cz-r,r*2+1,r*2+1,1,y0+y,role,paint);
      }
    };
    const tower=(cx,cz,width,y,h,role='tower',paint='#d9d0b4')=>{
      const r=Math.floor(width/2);
      box(cx-r,cz-r,width,width,h,y,role,paint);
    };
    build({add,box,cut,tier,tower});
    const blocks=[],colors={},roles={};
    for(const [k,v] of voxels){blocks.push(v.p);colors[k]=v.paint;roles[k]=v.role}
    return {name:'랜드마크 · '+name,kind:'랜드마크형',tip,blocks,colors,roles};
  }
  window.CubeArchitectLandmarks=()=>[
    plan('타지마할','넓은 기단, 깊은 아치 입구, 중심 돔, 작은 돔과 네 모서리 미나렛을 먼저 찾아보세요.',({box,cut,tier,tower,add})=>{
      box(4,5,24,22,2,0,'base','#c8c0b4');
      box(7,8,18,16,6,2,'body','#eee7d8');
      box(10,6,12,2,1,2,'base','#d9ccae');
      // façade portals: a tall central entrance and two flanking arches
      cut(14,22,4,2,5,3);cut(15,21,2,1,5,3);
      box(15,21,2,1,4,3,'arch','#536478');
      for(const x of [9,21]){cut(x,22,2,1,3,3);box(x,22,2,1,2,3,'arch','#6f7d86')}
      // façade bands / cornice
      box(7,8,18,16,1,8,'roof','#e0d4ba');
      box(8,9,16,14,1,9,'roof','#efe8db');
      box(12,12,8,8,2,10,'dome','#d5c9b3');
      tier(15,15,4,12,7,'dome','#f5f1e9');
      box(15,15,2,2,2,19,'spire','#d5b976');
      // four slender minarets with multiple balconies
      for(const x of [5,26])for(const z of [6,25]){
        tower(x,z,1,2,13,'tower','#e8e0cf');
        for(const y of [6,11,15])box(x-1,z-1,3,3,1,y,'detail','#d2c6ac');
        tower(x,z,1,16,3,'spire','#e2d2b3');add(x,19,z,'spire','#d0af69');
      }
      for(const x of [9,22]){
        tier(x,12,2,10,4,'dome','#f3ede0');
        tier(x,20,2,10,4,'dome','#f3ede0');
      }
      for(const x of [9,11,20,22])box(x,23,1,1,2,5,'window','#8294a1');
    }),
    plan('사그라다 파밀리아','전면의 여러 아치, 양쪽 첨탑 군, 중앙의 가장 높은 첨탑과 후면 탑을 구분하세요.',({box,cut,tier,tower,add})=>{
      box(5,6,22,21,2,0,'base','#998879');
      box(7,8,18,16,7,2,'body','#b9a58d');
      box(8,23,16,2,2,5,'roof','#96877c');
      // front portals and stained-glass windows (front: +Z)
      for(const x of [10,15,20]){cut(x,22,3,2,5,2);box(x+1,21,1,1,3,3,'arch','#4b5a6e')}
      for(const x of [9,13,19,23])box(x,23,1,1,3,6,'window','#4e718c');
      // staggered spires: several mid-height towers and one high central tower
      [[8,9,12],[13,9,15],[19,9,15],[24,9,12],
       [8,22,16],[13,22,20],[19,22,20],[24,22,16],
       [16,14,23]].forEach(([x,z,h])=>{
        tower(x,z,x===16?3:2,5,h-5,'tower','#a98f77');
        for(const yy of [9,13,17,21])if(yy<h-2)box(x-1,z-1,3,3,1,yy,'detail','#ccaf90');
        tier(x,z,x===16?2:1,h,Math.max(2,27-h),'spire','#c7a48b');
      });
      box(10,11,12,10,1,9,'roof','#918375');
      for(const x of [9,11,21,23])for(const z of [11,17])box(x,z,1,1,2,9,'detail','#cfbdad');
    }),
    plan('에펠탑','아래로 벌어진 네 다리 사이를 비우고, 1층과 2층 전망대, 위로 좁아지는 탑을 복원하세요.',({box,tier,add})=>{
      box(3,3,26,26,1,0,'base','#a39e95');
      // four legs gradually converge as they rise
      for(let y=1;y<=9;y++){
        const t=Math.floor((y-1)/3),a=6+t,b=25-t;
        for(const x of [a,b])for(const z of [a,b])box(x,z,2,2,1,y,'tower','#75695e');
      }
      // vertical struts and side braces
      for(const y of [3,5,7]){const t=Math.floor((y-1)/3);
        for(const x of [7+t,24-t])box(x,8+t,1,16-2*t,1,y,'detail','#8d7b6b');
        for(const z of [7+t,24-t])box(8+t,z,16-2*t,1,1,y,'detail','#8d7b6b');
      }
      box(8,8,16,16,2,10,'roof','#807363');
      for(let y=12;y<18;y++){
        const r=Math.max(2,7-Math.floor((y-12)/2));
        for(const x of [16-r,16+r])for(const z of [16-r,16+r])box(x,z,1,1,1,y,'tower','#7b6b5d');
      }
      box(11,11,10,10,1,18,'roof','#8e8170');
      for(let y=19;y<25;y++){
        const r=Math.max(0,3-Math.floor((y-19)/2));
        box(16-r,16-r,2*r+1,2*r+1,1,y,'tower','#8c7d6b');
      }
      box(16,16,1,1,3,25,'spire','#615950');
    }),
    plan('타워 브리지','긴 다리 상판·쌍둥이 탑·위쪽 연결 통로와 지붕의 계단형 실루엣을 관찰하세요.',({box,cut,tier,tower})=>{
      box(1,12,30,8,2,3,'base','#a7a49c');
      // two distinct towers, four corner turrets per tower
      for(const cx of [9,23]){
        box(cx-3,10,7,12,13,4,'body','#c8b8a2');
        cut(cx-1,21,3,1,6,5);box(cx-1,20,3,1,5,5,'arch','#667788');
        box(cx-3,10,7,12,1,17,'roof','#7e888e');
        tier(cx,16,3,18,4,'roof','#77828b');
        for(const x of [cx-3,cx+3])for(const z of [11,20]){
          tower(x,z,1,17,4,'tower','#c7b9a6');box(x-1,z-1,3,3,1,20,'roof','#667782');
        }
        for(const x of [cx-2,cx+2])box(x,21,1,1,3,11,'window','#64869c');
      }
      // enclosed upper-level walkways
      box(13,12,7,2,1,14,'roof','#7c7f83');
      box(13,18,7,2,1,14,'roof','#7c7f83');
      box(13,12,7,1,2,12,'body','#c5b6a0');
      box(13,19,7,1,2,12,'body','#c5b6a0');
      for(let x=3;x<30;x+=2){box(x,12,1,1,1,5,'detail','#9eabb2');box(x,19,1,1,1,5,'detail','#9eabb2')}
    }),
    plan('히메지성','석축 위에 겹겹이 돌출되는 어두운 지붕, 높은 중앙 천수와 낮은 망루를 구분하세요.',({box,tier})=>{
      box(4,5,24,22,2,0,'base','#aaa6a0');
      box(6,7,20,18,3,2,'body','#f3f0e6');
      box(5,6,22,20,1,5,'roof','#545b60');
      box(8,8,16,15,4,6,'body','#f2eee4');
      box(7,7,18,17,1,10,'roof','#59636b');
      box(10,9,12,12,4,11,'body','#f2eee4');
      box(9,8,14,14,1,15,'roof','#535d66');
      box(12,11,8,8,3,16,'body','#f2eee4');
      box(11,10,10,10,1,19,'roof','#525c66');
      tier(15,15,3,20,3,'roof','#69737c');
      // auxiliary turrets attached to the main keep
      for(const [x,z] of [[7,8],[22,8],[7,21],[22,21]]){
        box(x,z,3,3,5,3,'tower','#f6f2e9');
        box(x-1,z-1,5,5,1,8,'roof','#555f68');
      }
      for(const [left,right,front,y] of [[8,24,24,3],[10,22,22,7],[12,20,20,12],[13,19,18,17]]){
        for(let x=left;x<right;x+=2)box(x,front,1,1,1,y,'window','#526978');
      }
    }),
    plan('앙코르와트','겹겹이 쌓인 기단·긴 회랑·가운데 가장 높은 탑과 주변 네 탑의 대칭 구조를 찾으세요.',({box,cut,tier,tower})=>{
      box(2,3,28,26,2,0,'base','#9d9481');
      box(4,5,24,22,2,2,'base','#b2a993');
      // raised concentric galleries and open courtyards
      box(6,7,20,18,2,4,'body','#b9ae97');
      cut(10,11,12,10,2,4);
      box(9,10,14,12,2,6,'base','#bdb39b');
      box(10,11,12,10,2,8,'body','#b0a68e');
      box(11,12,10,8,1,10,'roof','#857e70');
      for(const [x,z,h] of [[8,9,13],[23,9,13],[8,22,13],[23,22,13],[16,16,20]]){
        tower(x,z,3,6,h-6,'tower','#a69a83');
        tier(x,z,2,h,Math.max(2,22-h),'spire','#847b68');
      }
      // repeated relief pillars and entrance path
      for(let x=5;x<28;x+=3){box(x,5,1,1,3,4,'detail','#d0c0a5');box(x,26,1,1,3,4,'detail','#d0c0a5')}
      box(14,26,5,4,1,1,'base','#c9bea6');
    })
  ];
})();
