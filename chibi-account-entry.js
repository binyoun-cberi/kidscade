// Account entry point for optional, school-safe 3D Chibi profiles.
// Existing pixel avatars remain untouched until an account explicitly chooses 3D.
import {sanitizeChibiAccountAvatar,isChibiAccountClothed} from './chibi/account-avatar-policy.mjs';

const EDITOR='/teacher/character-3d-studio.html?mode=account';
const PREVIEW='/teacher/character-3d-studio.html?mode=preview';
let frame=null,dialog=null,saving=false,previewRevision=0;
const account=()=>window.KidscadeAccount?.account||null;
const store=()=>window.KidscadeStorage||null;
const current=()=>sanitizeChibiAccountAvatar(store()?.getJson?.('chibiAvatar',null));
const el=(tag,cls,text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text)node.textContent=text;
  return node;
};

function ensureStyle(){
  if(document.getElementById('kc-chibi-account-style'))return;
  const style=el('style');
  style.id='kc-chibi-account-style';
  style.textContent=`
    #kc-chibi-account-card{margin:10px 0 0;padding:12px;border:1px solid rgba(124,92,255,.18);
      border-radius:14px;background:rgba(249,247,255,.92);display:grid;gap:8px}
    #kc-chibi-account-card .cca-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
    #kc-chibi-account-card .cca-title{font-size:.83rem;font-weight:900;color:#382969}
    #kc-chibi-account-card .cca-desc{font-size:.71rem;line-height:1.55;color:#64748b}
    #kc-chibi-account-card button{border:0;border-radius:11px;background:#6753c4;color:white;
      padding:11px 14px;min-height:43px;font-weight:900;cursor:pointer}
    #kc-chibi-account-card .cca-preview{height:220px;border-radius:13px;overflow:hidden;background:#17202a}
    #kc-chibi-account-card .cca-preview iframe{border:0;width:100%;height:100%;display:block}
    #kc-chibi-account-dialog{position:fixed;inset:0;z-index:2147482000;background:rgba(7,12,29,.84);
      display:grid;grid-template-rows:auto minmax(0,1fr);padding:10px;gap:8px}
    #kc-chibi-account-dialog[hidden]{display:none!important}
    #kc-chibi-account-dialog .cca-toolbar{display:flex;align-items:center;justify-content:space-between;
      color:#fff;font-weight:900;gap:12px}
    #kc-chibi-account-dialog button{min-height:44px;border:1px solid #fff5;background:#fff;
      border-radius:12px;padding:8px 16px;font-weight:900;color:#2f3153}
    #kc-chibi-account-dialog iframe{border:0;border-radius:12px;width:100%;height:100%;background:#fff}
    body.kc-chibi-dialog-open{overflow:hidden!important}
  `;
  document.head.appendChild(style);
}
function close(){
  if(!dialog)return;
  dialog.hidden=true;
  dialog.setAttribute('aria-hidden','true');
  document.body.classList.remove('kc-chibi-dialog-open');
  frame?.remove();frame=null;
}
function open(){
  if(!account())return window.KidscadeAccount?.login?.();
  ensureStyle();
  if(!dialog){
    dialog=el('div');dialog.id='kc-chibi-account-dialog';dialog.hidden=true;
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('aria-label','3D 계정 아바타 꾸미기');
    const toolbar=el('div','cca-toolbar');
    toolbar.append(el('span',null,'3D Chibi · 상의와 하의는 필수예요'));
    const cancel=el('button',null,'닫기');cancel.type='button';
    cancel.addEventListener('click',close);
    toolbar.append(cancel);
    dialog.append(toolbar);
    document.body.append(dialog);
  }
  if(frame)frame.remove();
  frame=el('iframe');frame.title='3D 계정 캐릭터 꾸미기';
  frame.src=EDITOR+'&v=20261011-account1';
  dialog.append(frame);
  dialog.hidden=false;
  dialog.setAttribute('aria-hidden','false');
  document.body.classList.add('kc-chibi-dialog-open');
}
function render(){
  const host=document.querySelector('#avatar-plaza');
  if(!host)return;
  let card=document.getElementById('kc-chibi-account-card');
  if(!account()){
    card?.remove();
    close();
    return;
  }
  ensureStyle();
  if(!card){
    card=el('section');card.id='kc-chibi-account-card';
    host.append(card);
  }
  card.replaceChildren();
  const head=el('div','cca-head');
  head.append(el('strong','cca-title','내 3D Chibi 캐릭터'));
  card.append(head);
  const raw=current();
  const valid=isChibiAccountClothed(raw);
  const note=el('p','cca-desc',valid?
    '계정에 저장된 3D 캐릭터예요. 상의·하의·신발을 항상 착용해요.':
    '3D 캐릭터를 만들어 계정에 저장해 보세요. 기존 2D 아바타는 그대로 유지돼요.');
  card.append(note);
  if(valid){
    const view=el('div','cca-preview');
    const iframe=el('iframe');
    iframe.title='내 3D Chibi 아바타';
    iframe.loading='lazy';
    iframe.src=PREVIEW+'&v=20261011-account1-r'+previewRevision;
    view.append(iframe);
    card.append(view);
  }
  const button=el('button',null,valid?'3D 캐릭터 수정하기':'3D 캐릭터 만들기');
  button.type='button';
  button.addEventListener('click',open);
  card.append(button);
}
window.addEventListener('message',async event=>{
  if(event.origin!==location.origin||!frame||event.source!==frame.contentWindow||
     event.data?.type!=='kidscade:account-chibi-save'||saving)return;
  if(!account())return;
  const result=sanitizeChibiAccountAvatar(event.data.avatar);
  if(!isChibiAccountClothed(result))return;
  saving=true;
  try{
    store()?.setJson?.('chibiAvatar',result);
    const synced=await window.KidscadeAccount?.sync?.();
    if(!synced){
      frame?.contentWindow?.postMessage({type:'kidscade:account-chibi-result',ok:false},location.origin);
      return;
    }
    previewRevision++;
    close();
    render();
  }finally{saving=false;}
});
document.addEventListener('kidscade:account-changed',render);
document.addEventListener('kidscade:storage-changed',event=>{
  if(String(event.detail?.key||'').includes('chibi_avatar'))render();
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});
else render();
