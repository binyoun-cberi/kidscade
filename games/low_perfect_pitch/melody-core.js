/* Pitch events only: no microphone audio is stored. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;if(root)root.MelodyCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function videoLink(value){
  try{const u=new URL(value),host=u.hostname.toLowerCase().replace(/^www\./,'');let id;
    if(host==='youtu.be')id=u.pathname.slice(1).split('/')[0];
    else if(['youtube.com','m.youtube.com','music.youtube.com'].includes(host))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    if(!/^https?:$/.test(u.protocol)||!id||!/^[-_a-zA-Z0-9]{11}$/.test(id))return null;
    const raw=u.searchParams.get('t')||u.searchParams.get('start')||'0';const match=raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    const start=/^\d+$/.test(raw)?Number(raw):match?Number(match[1]||0)*3600+Number(match[2]||0)*60+Number(match[3]||0):0;
    return {id,start:Math.min(86400,start)};
  }catch{return null}
}
function midi(hz){return 69+12*Math.log2(hz/440)}
function note(hz){if(!hz)return '—';const m=Math.round(midi(hz)),names=['도','도♯','레','레♯','미','파','파♯','솔','솔♯','라','라♯','시'];return names[(m%12+12)%12]+(Math.floor(m/12)-1)}
function validTake(v){return v&&typeof v.id==='string'&&typeof v.title==='string'&&Number.isFinite(v.duration)&&v.duration>0&&v.duration<=181&&Array.isArray(v.frames)&&v.frames.length<=4600&&v.frames.every((f,i)=>Number.isFinite(f.t)&&f.t>=0&&f.t<=v.duration&&(!i||f.t>v.frames[i-1].t)&&(f.hz===null||(Number.isFinite(f.hz)&&f.hz>=75&&f.hz<=1000)))}
function frameAt(frames,t){let low=0,high=frames.length-1,best=-1;while(low<=high){const mid=(low+high)>>1;if(frames[mid].t<=t){best=mid;low=mid+1}else high=mid-1}return best<0?null:frames[best].hz}
return {videoLink,midi,note,validTake,frameAt};
});
