(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FractionSmithMath=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function gcd(a,b){a=Math.abs(Math.trunc(a));b=Math.abs(Math.trunc(b));while(b){const t=b;b=a%b;a=t}return a||1}
  function make(n,d=1){
    n=Number(n);d=Number(d);
    if(!Number.isFinite(n)||!Number.isFinite(d)||!Number.isInteger(n)||!Number.isInteger(d))throw new Error('fraction requires integers');
    if(d===0)throw new Error('zero denominator');
    if(d<0){n=-n;d=-d}
    const g=gcd(n,d);return {n:n/g,d:d/g};
  }
  function parse(value){
    if(value&&Number.isInteger(value.n)&&Number.isInteger(value.d))return make(value.n,value.d);
    if(Number.isInteger(value))return make(value,1);
    const s=String(value).trim();
    if(/^[-+]?\d+\/[-+]?\d+$/.test(s)){const [n,d]=s.split('/').map(Number);return make(n,d)}
    if(/^[-+]?(?:\d+\.\d+|\d+)$/.test(s)){
      if(!s.includes('.'))return make(Number(s),1);
      const neg=s.startsWith('-'),clean=s.replace(/^[-+]/,'');
      const [a,b]=clean.split('.');const den=10**b.length;const num=Number(a)*den+Number(b);
      return make(neg?-num:num,den);
    }
    throw new Error('invalid fraction: '+s);
  }
  function add(a,b){a=parse(a);b=parse(b);return make(a.n*b.d+b.n*a.d,a.d*b.d)}
  function sub(a,b){a=parse(a);b=parse(b);return make(a.n*b.d-b.n*a.d,a.d*b.d)}
  function mul(a,b){a=parse(a);b=parse(b);return make(a.n*b.n,a.d*b.d)}
  function div(a,b){a=parse(a);b=parse(b);if(b.n===0)throw new Error('division by zero');return make(a.n*b.d,a.d*b.n)}
  function eq(a,b){a=parse(a);b=parse(b);return a.n===b.n&&a.d===b.d}
  function cmp(a,b){a=parse(a);b=parse(b);return Math.sign(a.n*b.d-b.n*a.d)}
  function abs(a){a=parse(a);return make(Math.abs(a.n),a.d)}
  function key(a){a=parse(a);return a.n+'/'+a.d}
  function isTerminating(a){
    a=parse(a);let d=a.d;
    while(d%2===0)d/=2;while(d%5===0)d/=5;
    return d===1;
  }
  function decimalPlaces(a){
    a=parse(a);if(!isTerminating(a))return Infinity;
    let d=a.d,c2=0,c5=0;while(d%2===0){c2++;d/=2}while(d%5===0){c5++;d/=5}
    return Math.max(c2,c5);
  }
  function toDecimal(a,max=6){
    a=parse(a);if(!isTerminating(a))return null;
    const p=Math.min(decimalPlaces(a),max);
    const s=(a.n/a.d).toFixed(p);return s.includes('.')?s.replace(/0+$/,'').replace(/\.$/,''):s;
  }
  function toFraction(a){a=parse(a);return a.d===1?String(a.n):a.n+'/'+a.d}
  function display(a,prefer='fraction'){
    a=parse(a);
    if(prefer==='decimal'){const s=toDecimal(a);if(s!==null)return s}
    return toFraction(a);
  }
  function apply(op,a,b){
    if(op==='+')return add(a,b);
    if(op==='-')return sub(a,b);
    if(op==='×'||op==='*')return mul(a,b);
    if(op==='÷'||op==='/')return div(a,b);
    throw new Error('unknown op '+op);
  }
  function nice(a,{maxAbs=6,maxDen=24,allowZero=true}={}){
    a=parse(a);return Math.abs(a.n/a.d)<=maxAbs&&a.d<=maxDen&&(allowZero||a.n!==0);
  }
  return {gcd,make,parse,add,sub,mul,div,eq,cmp,abs,key,isTerminating,decimalPlaces,toDecimal,toFraction,display,apply,nice};
});