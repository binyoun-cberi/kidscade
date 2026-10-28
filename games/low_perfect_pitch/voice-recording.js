/* Optional microphone recordings stay in this browser; no network upload. */
(function(root,factory){const api=factory(root);if(typeof module==='object')module.exports=api;if(root)root.PitchVoice=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
function capture(stream,Recorder=root.MediaRecorder){
  if(!Recorder)throw Error('이 브라우저는 실제 녹음을 지원하지 않아요.');
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(type=>Recorder.isTypeSupported?.(type));
  const recorder=new Recorder(stream,mime?{mimeType:mime,audioBitsPerSecond:64000}:{});
  const chunks=[];let bytes=0,failed=false,complete=false,resolve;
  const done=new Promise(r=>resolve=r);
  function finalize(){if(complete)return;complete=true;const blob=failed?null:new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||'audio/webm'});resolve({blob:blob?.size?blob:null,error:failed?'녹음에 실패했어요. 선율 기록은 계속 사용할 수 있어요.':null})}
  recorder.ondataavailable=e=>{if(e.data?.size){bytes+=e.data.size;if(bytes<=8*1024*1024)chunks.push(e.data);else{failed=true;if(recorder.state!=='inactive')recorder.stop()}}};
  recorder.onerror=()=>{failed=true;finalize()};recorder.onstop=finalize;
  recorder.start(1000);
  return {stop(){if(!complete&&recorder.state!=='inactive')recorder.stop();return done}};
}
let database;
function open(){if(database)return database;database=new Promise((resolve,reject)=>{if(!root.indexedDB){reject(Error('이 브라우저에서 녹음 저장을 사용할 수 없어요.'));return}const request=root.indexedDB.open('kidscade_pitch_voice_v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('recordings');request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null};resolve(db)};request.onerror=()=>reject(request.error||Error('녹음 저장소를 열지 못했어요.'));request.onblocked=()=>reject(Error('다른 탭을 닫고 다시 저장해 주세요.'))});database.catch(()=>{database=null});return database}
async function operation(mode,fn){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('recordings',mode);let result;const request=fn(tx.objectStore('recordings'));request.onsuccess=()=>{result=request.result};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('녹음을 저장하지 못했어요.'))})}
function put(id,blob){if(!(blob instanceof Blob)||!blob.size||blob.size>8*1024*1024)return Promise.reject(Error('녹음 파일 크기를 확인해 주세요.'));return operation('readwrite',s=>s.put(blob,id))}
function get(id){return operation('readonly',s=>s.get(id))}
function remove(id){return operation('readwrite',s=>s.delete(id))}
async function prune(ids){const db=await open(),keep=new Set(ids);return new Promise((resolve,reject)=>{const tx=db.transaction('recordings','readwrite'),request=tx.objectStore('recordings').openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(!keep.has(cursor.key))cursor.delete();cursor.continue()};tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('이전 녹음을 정리하지 못했어요.'))})}
return {capture,put,get,remove,prune};
});
