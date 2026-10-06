(() => {
  'use strict';
  const SIZE=37,DATA_BYTES=108,EC_BYTES=26;
  function mul(x,y){let z=0;for(let i=7;i>=0;i-=1){z=(z<<1)^(((z>>>7)&1)*0x11d);if(((y>>>i)&1)!==0)z^=x;}return z;}
  function divisor(n){const r=Array(n).fill(0);r[n-1]=1;let root=1;for(let i=0;i<n;i+=1){for(let j=0;j<n;j+=1){r[j]=mul(r[j],root);if(j+1<n)r[j]^=r[j+1];}root=mul(root,2);}return r;}
  function remainder(data,div){const r=Array(div.length).fill(0);for(const value of data){const factor=value^r.shift();r.push(0);for(let i=0;i<r.length;i+=1)r[i]^=mul(div[i],factor);}return r;}
  function addBits(value,length,bits){for(let i=length-1;i>=0;i-=1)bits.push((value>>>i)&1);}
  function codewords(text){
    const bytes=Array.from(new TextEncoder().encode(String(text||'')));
    if(bytes.length>106)throw new Error('payload_too_long');
    const bits=[];addBits(4,4,bits);addBits(bytes.length,8,bits);
    for(const value of bytes)addBits(value,8,bits);
    for(let i=0;i<Math.min(4,DATA_BYTES*8-bits.length);i+=1)bits.push(0);
    while(bits.length%8)bits.push(0);
    const data=[];
    for(let i=0;i<bits.length;i+=8){let value=0;for(let j=0;j<8;j+=1)value=(value<<1)|bits[i+j];data.push(value);}
    for(let pad=0;data.length<DATA_BYTES;pad+=1)data.push((pad&1)?0x11:0xec);
    return data.concat(remainder(data,divisor(EC_BYTES)));
  }
  function matrix(text){
    const m=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
    const f=Array.from({length:SIZE},()=>Array(SIZE).fill(false));
    const set=(x,y,d)=>{if(x<0||y<0||x>=SIZE||y>=SIZE)return;m[y][x]=!!d;f[y][x]=true;};
    const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy+=1)for(let dx=-4;dx<=4;dx+=1){const dist=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,dist!==2&&dist!==4);}};
    const align=(cx,cy)=>{for(let dy=-2;dy<=2;dy+=1)for(let dx=-2;dx<=2;dx+=1)set(cx+dx,cy+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);};
    const format=()=>{const data=8;let rem=data;for(let i=0;i<10;i+=1)rem=(rem<<1)^(((rem>>>9)&1)*0x537);const bits=((data<<10)|rem)^0x5412,bit=i=>((bits>>>i)&1)!==0;for(let i=0;i<=5;i+=1)set(8,i,bit(i));set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));for(let i=9;i<15;i+=1)set(14-i,8,bit(i));for(let i=0;i<8;i+=1)set(SIZE-1-i,8,bit(i));for(let i=8;i<15;i+=1)set(8,SIZE-15+i,bit(i));set(8,SIZE-8,true);};
    finder(3,3);finder(SIZE-4,3);finder(3,SIZE-4);
    for(let i=0;i<SIZE;i+=1){if(!f[6][i])set(i,6,i%2===0);if(!f[i][6])set(6,i,i%2===0);}
    align(30,30);format();
    const data=codewords(text);let k=0;
    for(let right=SIZE-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<SIZE;vert+=1)for(let j=0;j<2;j+=1){const x=right-j,up=((right+1)&2)===0,y=up?SIZE-1-vert:vert;if(!f[y][x]&&k<data.length*8){m[y][x]=((data[k>>>3]>>>(7-(k&7)))&1)!==0;k+=1;}}}
    for(let y=0;y<SIZE;y+=1)for(let x=0;x<SIZE;x+=1)if(!f[y][x]&&((x+y)&1)===0)m[y][x]=!m[y][x];
    format();return m;
  }
  function svg(text){
    const m=matrix(text),q=4,n=SIZE+q*2;let d='';
    for(let y=0;y<SIZE;y+=1)for(let x=0;x<SIZE;x+=1)if(m[y][x])d+=`M${x+q} ${y+q}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#111827"/></svg>`;
  }
  window.KidscadeQrRenderer=Object.freeze({svg});
})();
