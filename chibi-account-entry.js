// Account-specific Chibi profile, sharing the existing 2D avatar atelier.
// The pixel avatar, save format and preview stay independent.
import {sanitizeChibiAccountAvatar,isChibiAccountClothed} from './chibi/account-avatar-policy.mjs';
const PREVIEW='/teacher/character-3d-studio.html?mode=preview';
let saving=false,previewRevision=0;
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
  const style=el('style');style.id='kc-chibi-account-style';
  style.textContent=`
    #kc-chibi-account-card{margin:10px 0 0;padding:12px;border:1px solid rgba(124,92,255,.18);
      border-radius:14px;background:rgba(249,247,255,.92);display:grid;gap:8px}
    #kc-chibi-account-card .cca-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
    #kc-chibi-account-card .cca-title{font-size:.83rem;font-weight:900;color:#382969}
    #kc-chibi-account-card .cca-desc{font-size:.71rem;line-height:1.55;color:#64748b;margin:0}
    #kc-chibi-account-card button{border:0;border-radius:11px;background:#6753c4;color:white;
      padding:11px 14px;min-height:43px;font-weight:900;cursor:pointer}
    #kc-chibi-account-card .cca-preview{height:220px;border-radius:13px;overflow:hidden;background:#17202a}
    #kc-chibi-account-card .cca-preview iframe{border:0;width:100%;height:100%;display:block}
  `;
  document.head.appendChild(style);
}
function open(){
  if(!account())return window.KidscadeAccount?.login?.();
  window.KidscadeAvatarStudio?.open?.('3d');
}
function render(){
  const host=document.querySelector('#avatar-plaza');
  if(!host)return;
  let card=document.getElementById('kc-chibi-account-card');
  if(!account()){card?.remove();return;}
  ensureStyle();
  if(!card){card=el('section');card.id='kc-chibi-account-card';host.append(card);}
  card.replaceChildren();
  const head=el('div','cca-head');
  head.append(el('strong','cca-title','3D Chibi 캐릭터'));
  card.append(head);
  const valid=isChibiAccountClothed(current());
  card.append(el('p','cca-desc',valid
    ?'2D와 별도로 저장된 3D 캐릭터예요. 의상은 항상 착용해요.'
    :'기존 2D 캐릭터는 그대로 두고, 나만의 3D 캐릭터도 꾸며 보세요.'));
  if(valid){
    const view=el('div','cca-preview'),iframe=el('iframe');
    iframe.title='내 3D Chibi 캐릭터';
    iframe.loading='lazy';
    iframe.src=PREVIEW+'&v=20261011-account2-r'+previewRevision;
    view.append(iframe);card.append(view);
  }
  const button=el('button',null,valid?'3D 캐릭터 수정':'3D 캐릭터 만들기');
  button.type='button';button.addEventListener('click',open);
  card.append(button);
}
window.addEventListener('message',async event=>{
  const studio=window.KidscadeAvatarStudio;
  if(event.origin!==location.origin||!studio?.frame||
     event.source!==studio.frame.contentWindow||studio.mode!=='3d'||
     event.data?.type!=='kidscade:account-chibi-save'||saving||!account())return;
  const result=sanitizeChibiAccountAvatar(event.data.avatar);
  if(!isChibiAccountClothed(result))return;
  saving=true;
  const previous=store()?.getJson?.('chibiAvatar',null);
  try{
    store()?.setJson?.('chibiAvatar',result);
    const synced=await window.KidscadeAccount?.sync?.();
    if(!synced){
      if(previous===null||previous===undefined)store()?.remove?.('chibiAvatar');
      else store()?.setJson?.('chibiAvatar',previous);
      studio.frame?.contentWindow?.postMessage({
        type:'kidscade:account-chibi-result',ok:false
      },location.origin);
      return;
    }
    previewRevision++;
    studio.close();
    render();
  }catch(error){
    if(previous===null||previous===undefined)store()?.remove?.('chibiAvatar');
    else store()?.setJson?.('chibiAvatar',previous);
    studio.frame?.contentWindow?.postMessage({
      type:'kidscade:account-chibi-result',ok:false
    },location.origin);
  }finally{saving=false;}
});
document.addEventListener('kidscade:account-changed',render);
document.addEventListener('kidscade:storage-changed',event=>{
  if(String(event.detail?.key||'').includes('chibi_avatar'))render();
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});
else render();
