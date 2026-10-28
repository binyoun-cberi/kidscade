/* Independent practice rules; no third-party site code. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.VocalTraining=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const hz=m=>440*2**((m-69)/12),midi=f=>69+12*Math.log2(f/440);
function cents(f,target,octave=false){let d=1200*Math.log2(f/hz(target));if(octave)d=((d+600)%1200+1200)%1200-600;return d}
function name(m){const notes=['도','도♯','레','레♯','미','파','파♯','솔','솔♯','라','라♯','시'];return notes[(Math.round(m)%12+12)%12]+(Math.floor(Math.round(m)/12)-1)}
function validRange(r){return r&&Number.isInteger(r.low)&&Number.isInteger(r.high)&&r.low>=39&&r.high<=83&&r.high>=r.low}
class Hold{
 constructor(){this.reset()}
 reset(){this.start=null;this.last=null;this.values=[]}
 update(error,now,tolerance=40){if(!Number.isFinite(error)||Math.abs(error)>tolerance||(this.last!==null&&(now<=this.last||now-this.last>120))){this.reset();if(!Number.isFinite(error)||Math.abs(error)>tolerance)return 0}if(this.start===null)this.start=now;this.last=now;this.values.push(error);if(this.values.length>100)this.values.shift();return now-this.start}
 get average(){return this.values.length?this.values.reduce((a,b)=>a+Math.abs(b),0)/this.values.length:0}
}
class RangeMeter{
 constructor(){this.hold=new Hold();this.candidate=null;this.notes=new Set()}
 update(f,now){if(!f){this.candidate=null;this.hold.reset();return null}const m=Math.round(midi(f));if(m<39||m>83){this.hold.reset();return null}if(m!==this.candidate){this.candidate=m;this.hold.reset()}const duration=this.hold.update(cents(f,m),now,35);if(duration>=600&&!this.notes.has(m)){this.notes.add(m);return m}return null}
 result(){const notes=[...this.notes];return notes.length?{low:Math.min(...notes),high:Math.max(...notes)}:null}
}
function sequence(round,length,range){const low=validRange(range)?range.low:55,high=validRange(range)?range.high:72;const intervals=[[0,2,4],[4,2,0],[0,4,7],[7,4,2],[2,0,4]][round%5];const span=Math.min(7,high-low),root=Math.min(high-span,Math.max(low,Math.round((low+high-span)/2)));return intervals.slice(0,length).map(n=>root+Math.min(span,n))}
function clip(take,start,end){if(!take||!Array.isArray(take.frames)||!Number.isFinite(start)||!Number.isFinite(end)||end-start<.2||start<0||end>take.duration+.001)return null;let first=null;for(const f of take.frames){if(f.t<=start)first=f.hz;else break}return {start,end,duration:end-start,frames:[{t:0,hz:first},...take.frames.filter(f=>f.t>start&&f.t<end).map(f=>({t:f.t-start,hz:f.hz}))]}}
return {hz,midi,cents,name,validRange,Hold,RangeMeter,sequence,clip};
});
