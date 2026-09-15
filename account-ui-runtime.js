(() => {
  'use strict';

  const STYLE_ID = 'kidscade-account-runtime-style';
  let attempts = 0;

  function install() {
    if (document.getElementById(STYLE_ID)) return true;
    if (!document.head || !document.getElementById('kc-profile-identity')) return false;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #kc-account-slot{margin-top:8px;display:grid;gap:6px}
      #kc-account-slot .kca-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 9px;border-radius:12px;background:rgba(255,255,255,.72);border:1px solid rgba(124,92,255,.12)}
      body.dark-mode #kc-account-slot .kca-row{background:rgba(30,41,59,.62);border-color:rgba(196,181,253,.16)}
      #kc-account-slot .kca-copy{min-width:0}
      #kc-account-slot .kca-title{font-size:.68rem;font-weight:1000;color:var(--kc-ink,#334155);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #kc-account-slot .kca-sub{margin-top:2px;font-size:.59rem;font-weight:800;color:var(--kc-muted,#64748b);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #kc-account-slot button{flex:none;border:0;border-radius:10px;min-height:32px;padding:0 9px;background:linear-gradient(135deg,#7c5cff,#8b5cf6);color:#fff;font-size:.62rem;font-weight:1000;cursor:pointer}
      #kc-account-slot .kca-logout{background:#eef2f7;color:#64748b}
      body.dark-mode #kc-account-slot .kca-logout{background:#334155;color:#e2e8f0}

      #kc-account-modal{position:fixed!important;inset:0!important;z-index:30000!important;display:grid!important;place-items:center!important;padding:18px!important;background:rgba(15,23,42,.58)!important;backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);box-sizing:border-box;overscroll-behavior:contain}
      #kc-account-modal.hidden{display:none!important}
      #kc-account-modal .kca-modal-card{width:min(420px,100%)!important;max-height:calc(100dvh - 36px);overflow:auto;box-sizing:border-box;border-radius:24px!important;background:#fff!important;padding:22px!important;box-shadow:0 24px 60px rgba(15,23,42,.3)!important;color:#334155!important;margin:0!important}
      body.dark-mode #kc-account-modal .kca-modal-card{background:#1e293b!important;color:#f8fafc!important}
      #kc-account-modal h2{margin:0!important;font-size:1.25rem!important;letter-spacing:-.04em}
      #kc-account-modal p{margin:7px 0 16px!important;color:#64748b!important;font-size:.78rem!important;line-height:1.5!important;font-weight:750!important}
      body.dark-mode #kc-account-modal p{color:#cbd5e1!important}
      #kc-account-modal label{display:grid!important;gap:5px!important;margin-top:10px!important;font-size:.72rem!important;font-weight:950!important;color:inherit!important}
      #kc-account-modal input{display:block!important;width:100%!important;box-sizing:border-box!important;min-height:46px!important;border:1px solid #dbe1ea!important;border-radius:13px!important;padding:0 12px!important;font:inherit!important;font-size:.9rem!important;background:#fff!important;color:#334155!important;text-transform:uppercase!important}
      body.dark-mode #kc-account-modal input{background:#263244!important;border-color:#475569!important;color:#fff!important}
      #kc-account-modal .kca-pin{text-transform:none!important;letter-spacing:.16em!important}
      #kc-account-modal .kca-error{min-height:20px!important;margin-top:8px!important;color:#dc2626!important;font-size:.7rem!important;font-weight:900!important}
      #kc-account-modal .kca-actions{display:grid!important;grid-template-columns:1fr auto!important;gap:8px!important;margin-top:10px!important}
      #kc-account-modal button{min-height:44px!important;border:0!important;border-radius:13px!important;padding:0 14px!important;font-weight:1000!important;cursor:pointer!important}
      #kc-account-modal .kca-login{background:linear-gradient(135deg,#7c5cff,#ec4899)!important;color:#fff!important}
      #kc-account-modal .kca-cancel{background:#eef2f7!important;color:#64748b!important}
      body.dark-mode #kc-account-modal .kca-cancel{background:#334155!important;color:#e2e8f0!important}
      #kc-account-modal .kca-help{margin-top:13px!important;padding-top:12px!important;border-top:1px solid #eef2f7!important;font-size:.65rem!important;color:#94a3b8!important;line-height:1.45!important}

      @media(max-width:620px){
        #kc-account-modal{place-items:end center!important;padding:10px 10px calc(10px + env(safe-area-inset-bottom))!important}
        #kc-account-modal .kca-modal-card{width:100%!important;max-height:min(78dvh,620px)!important;border-radius:24px 24px 18px 18px!important;padding:18px 18px 20px!important}
        #kc-account-modal .kca-modal-card::before{content:"";display:block;width:42px;height:5px;border-radius:999px;background:#dbe1ea;margin:-5px auto 14px}
        body.dark-mode #kc-account-modal .kca-modal-card::before{background:#475569}
        #kc-account-modal h2{font-size:1.18rem!important}
        #kc-account-modal p{font-size:.75rem!important;margin-bottom:12px!important}
        #kc-account-modal input{min-height:48px!important;font-size:1rem!important}
        #kc-account-modal .kca-actions{grid-template-columns:1fr 92px!important}
      }
    `;
    document.head.appendChild(style);
    return true;
  }

  function start() {
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts > 120) clearInterval(timer);
    }, 150);

    window.addEventListener('pageshow', install);
    document.addEventListener('click', event => {
      if (event.target.closest?.('[data-kca-login]')) install();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
