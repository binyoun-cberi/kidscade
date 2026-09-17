(() => {
  'use strict';
  // Hide only inside an active duel, not inside the Kidscade game launcher.
  if (window.__patienceDuelEmbedded) return;
  const menuCard = document.querySelector('#menu .card');
  if (!menuCard || document.getElementById('patienceDuelEntry')) return;

  const wrap = document.createElement('div');
  wrap.id = 'patienceDuelEntry';
  wrap.style.cssText = 'margin:14px auto 0;display:flex;flex-direction:column;align-items:center;gap:7px;';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '⚔️ 1:1 · 3분 높이 대전';
  button.style.cssText = [
    'font-size:18px',
    'padding:13px 20px',
    'border-radius:18px',
    'background:linear-gradient(135deg,#7dd3fc,#818cf8)',
    'color:#07111f',
    'border:0',
    'font-weight:1000',
    'box-shadow:0 12px 28px rgba(59,130,246,.28)'
  ].join(';');
  button.addEventListener('click', () => {
    window.location.href = '/games/patience-tower-duel/';
  });

  const note = document.createElement('div');
  note.textContent = 'Kidscade 로그인 계정 2명이 같은 방 코드로 참가합니다.';
  note.style.cssText = 'font-size:12px;color:rgba(255,255,255,.66);line-height:1.4;';

  wrap.append(button, note);
  const options = menuCard.querySelector('.options');
  if (options) options.insertAdjacentElement('afterend', wrap);
  else menuCard.appendChild(wrap);
})();
