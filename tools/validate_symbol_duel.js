const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('딱 하나! 그림 대결.html','utf8');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)){if(m[1].trim())new vm.Script(m[1]);}
const q=5,cards=[];const affine=(x,y)=>x*q+y,inf=m=>q*q+m,vertical=q*q+q;
for(let m=0;m<q;m++)for(let b=0;b<q;b++){const c=[inf(m)];for(let x=0;x<q;x++)c.push(affine(x,(m*x+b)%q));cards.push(c)}
for(let x=0;x<q;x++){const c=[vertical];for(let y=0;y<q;y++)c.push(affine(x,y));cards.push(c)}
cards.push(Array.from({length:q+1},(_,i)=>q*q+i));
if(cards.length!==31)throw new Error('deck count');
for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){const n=cards[i].filter(x=>cards[j].includes(x)).length;if(n!==1)throw new Error(`pair ${i},${j}: ${n}`)}
if(!html.includes("easy:{seconds:10")||!html.includes("normal:{seconds:5")||!html.includes("hard:{seconds:3"))throw new Error('difficulty timers missing');
console.log('symbol duel syntax/deck/timers OK');
