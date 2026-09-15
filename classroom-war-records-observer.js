(() => {
  'use strict';

  let lastKey = '';

  const numberFrom = text => {
    const value = String(text || '').replace(/[^0-9]/g, '');
    return value ? Number(value) : 0;
  };

  function readMini(panel, label) {
    const mini = [...panel.querySelectorAll('.mini')].find(node => String(node.textContent || '').trim().startsWith(label));
    return mini ? numberFrom(String(mini.textContent || '').slice(label.length)) : 0;
  }

  function parseResult(panel) {
    if (!panel?.querySelector('#restartBtn')) return null;
    const lead = String(panel.querySelector('.lead')?.textContent || '');
    const timeMatch = lead.match(/생존\s*(\d{1,3}):(\d{2})/);
    if (!timeMatch) return null;

    const displayedSeconds = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
    const kills = numberFrom(lead.match(/적\s*([\d,]+)명/)?.[1]);
    const bossKills = numberFrom(lead.match(/보스\s*([\d,]+)명/)?.[1]);
    const hazardsDestroyed = numberFrom(lead.match(/전선\s*위협\s*([\d,]+)개/)?.[1]);
    const maxArmy = readMini(panel, '최대 전체 병력');
    const score = readMini(panel, '점수');
    if (!score || !maxArmy || bossKills > kills) return null;

    // The game displays whole seconds but its score includes tenths of a second.
    // Derive a compatible tenths value from the exact displayed score so the
    // server can recompute and validate the same result without exposing game internals.
    const otherFloor = Math.floor(kills * 18 + bossKills * 260 + hazardsDestroyed * 75 + maxArmy / 20);
    const survivalTenths = score - otherFloor;
    if (!Number.isFinite(survivalTenths) || survivalTenths < 0) return null;
    if (Math.abs(survivalTenths / 10 - displayedSeconds) > 2) return null;

    return { score, survivalTenths, kills, bossKills, hazardsDestroyed, maxArmy };
  }

  function inspect() {
    const panel = document.getElementById('panel');
    const result = parseResult(panel);
    if (!result) return;
    const key = [result.score, result.survivalTenths, result.kills, result.maxArmy].join(':');
    if (key === lastKey) return;
    lastKey = key;
    window.dispatchEvent(new CustomEvent('kidscade:classroom-war-finished', { detail: result }));
  }

  function start() {
    const panel = document.getElementById('panel');
    if (!panel) return;
    new MutationObserver(() => setTimeout(inspect, 0)).observe(panel, { childList:true, subtree:true });
    inspect();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
