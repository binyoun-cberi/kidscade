/* Byeokrando native-trade journal and contextual merchant talk.
 * GPL-free independent code. Existing prices, sailing, inventory and missions are untouched.
 */
(() => {
  'use strict';
  if (window.__byeokrandoTradeIntelV1) return;
  const bridge = window.__byeokrandoBridge;
  const core = window.ByeokrandoTradeIntelCore;
  if (!bridge || !core) return;
  window.__byeokrandoTradeIntelV1 = true;
  const KEY = 'kidscade_byeokrando_trade_intel_v1';
  const byId = id => document.getElementById(id);
  const gameState = () => { try { return bridge.getState?.() || null; } catch (_) { return null; } };
  const goods = () => { try { return bridge.getGoods?.() || {}; } catch (_) { return {}; } };
  const ports = () => { try { return bridge.getPorts?.() || {}; } catch (_) { return {}; } };
  const cargo = s => ({ ...(s?.cargo && typeof s.cargo === 'object' ? s.cargo : {}) });
  const port = s => core.portName(ports(), s?.place);
  function el(tag, cls, value) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(journal)); } catch (_) { /* disabled storage */ }
  }
  let journal;
  try { journal = core.normalizeJournal(JSON.parse(localStorage.getItem(KEY) || 'null')); }
  catch (_) { journal = core.normalizeJournal(null); }
  let previous = gameState();
  let previousMode = previous?.mode;
  let previousPort = previous?.place;
  let tab = 'journal';
  let conversationPlace = 'tavern';
  let question = 'trade';

  const style = el('style');
  style.textContent = [
    '#byeokIntelOpen{position:fixed;bottom:85px;left:12px;z-index:86;padding:7px 10px;border:1px solid #bd9854;border-radius:6px;background:rgba(39,29,20,.94);color:#f4dba4;font:700 12px system-ui,"Noto Sans KR",sans-serif;cursor:pointer}',
    '#byeokIntelSheet{position:fixed;left:12px;top:60px;z-index:217;display:none;flex-direction:column;width:min(374px,calc(100vw - 24px));max-height:min(75vh,670px);overflow:hidden;border:1px solid #c6a46b;border-radius:10px;background:#f0dfb9;color:#31251a;box-shadow:0 14px 48px #000b;font:13px/1.55 system-ui,"Noto Sans KR",sans-serif}',
    '#byeokIntelSheet.is-open{display:flex}',
    '#byeokIntelSheet .intelHead{display:flex;align-items:center;gap:6px;padding:10px 13px;background:#dec48d}',
    '#byeokIntelSheet h2{margin:0;flex:1;font:700 17px Georgia,"Noto Serif KR",serif}',
    '#byeokIntelSheet button{font:inherit;cursor:pointer}',
    '#byeokIntelSheet .intelClose{padding:6px;border:0;border-radius:5px;background:#f8eacc;color:#493720}',
    '#byeokIntelSheet .intelTabs{display:flex;gap:6px;padding:8px 12px;border-bottom:1px solid #cab083}',
    '#byeokIntelSheet .intelTab{padding:6px 10px;border:1px solid #ba9b67;border-radius:5px;background:#f7eacc;color:#43301a}',
    '#byeokIntelSheet .intelTab[aria-selected=true]{background:#56412a;color:#fff1d0}',
    '#byeokIntelSheet .intelBody{padding:13px;min-height:100px;overflow-y:auto;overscroll-behavior:contain}',
    '#byeokIntelSheet p{margin:4px 0 8px}',
    '#byeokIntelSheet .intelIntro{font-size:12px;color:#624b2d}',
    '#byeokIntelSheet .intelEntry{padding:9px 0;border-top:1px solid #c6ab7e}',
    '#byeokIntelSheet .intelEntry strong{display:block}',
    '#byeokIntelSheet .intelEntry small{font-size:10px;color:#7c6444}',
    '#byeokIntelSheet .intelAnswer{white-space:pre-line;padding:12px;border-left:3px solid #98783f;background:#e5cfa1}',
    '#byeokIntelSheet .intelQuestion{display:block;width:100%;margin:7px 0;text-align:left;padding:9px;border:1px solid #b89b68;border-radius:5px;background:#f8eccc;color:#322718}',
    '#byeokIntelSheet .intelFoot{padding:8px 12px;border-top:1px solid #c7ab7c;color:#695237;font-size:11px}',
    '#byeokIntelOpen:focus-visible,#byeokIntelSheet button:focus-visible,.byeokTalkButton:focus-visible{outline:2px solid #9b6726;outline-offset:2px}',
    '.byeokTalkButton{display:inline-block;margin:6px;padding:7px 11px;border:1px solid #c19a55;border-radius:5px;background:#f6e5c0;color:#362716;font:700 12px system-ui,"Noto Sans KR",sans-serif;cursor:pointer}',
    '@media(max-width:620px){#byeokIntelOpen{left:8px;bottom:82px}#byeokIntelSheet{top:8px;left:8px;width:calc(100vw - 16px);max-height:calc(100dvh - 16px)}}'
  ].join('\n');
  document.head.appendChild(style);
  const openBtn = el('button', '', '상행일지');
  openBtn.id = 'byeokIntelOpen';
  openBtn.type = 'button';
  openBtn.setAttribute('aria-controls', 'byeokIntelSheet');
  openBtn.setAttribute('aria-expanded', 'false');
  openBtn.title = '객주 이야기와 실제 화물 거래를 살펴봅니다.';
  const sheet = el('section');
  sheet.id = 'byeokIntelSheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', '상인의 항해일지');
  const head = el('div', 'intelHead');
  const heading = el('h2', '', '상인의 항해일지');
  const close = el('button', 'intelClose', '닫기');
  close.type = 'button';
  head.append(heading, close);
  const tabs = el('div', 'intelTabs');
  tabs.setAttribute('role', 'tablist');
  const journalTab = el('button', 'intelTab', '항해일지');
  const talkTab = el('button', 'intelTab', '상인 이야기');
  journalTab.type = talkTab.type = 'button';
  journalTab.setAttribute('role', 'tab');
  talkTab.setAttribute('role', 'tab');
  tabs.append(journalTab, talkTab);
  const body = el('div', 'intelBody');
  const foot = el('div', 'intelFoot', '가격·화물·항해는 원래 게임 규칙을 따릅니다. 이 기록은 현재 브라우저에 저장됩니다.');
  sheet.append(head, tabs, body, foot);
  document.body.append(openBtn, sheet);

  function record(entry) {
    journal = core.appendEntry(journal, { ...entry, at: Date.now() });
    save();
    if (sheet.classList.contains('is-open')) render();
  }
  function open(view, place) {
    tab = view;
    if (place) conversationPlace = place;
    sheet.classList.add('is-open');
    openBtn.setAttribute('aria-expanded', 'true');
    render();
    close.focus();
  }
  function hide() {
    sheet.classList.remove('is-open');
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.focus();
  }
  openBtn.addEventListener('click', () => sheet.classList.contains('is-open') ? hide() : open('journal'));
  close.addEventListener('click', hide);
  journalTab.addEventListener('click', () => { tab = 'journal'; render(); });
  talkTab.addEventListener('click', () => { tab = 'talk'; render(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet.classList.contains('is-open')) {
      e.stopPropagation();
      hide();
    }
  }, true);

  function renderJournal() {
    body.appendChild(el('p', 'intelIntro', '실제 화물칸 수량이 바뀐 거래와 항해를 기록합니다. 확인되지 않은 소문이나 예상 수익을 사실처럼 적지 않습니다.'));
    if (!journal.entries.length) {
      body.appendChild(el('p', 'intelIntro', '아직 상행 기록이 없습니다. 첫 거래를 마치거나 객주에서 소문을 들어보세요.'));
      return;
    }
    for (const entry of [...journal.entries].reverse().slice(0, 30)) {
      const item = el('div', 'intelEntry');
      const category = {
        trade: entry.direction === 'sell' ? '화물 판매' : '화물 매입',
        rumor: '객주에서 들은 소문',
        visit: '객주 방문',
        arrival: '입항',
        departure: '출항'
      }[entry.kind];
      item.appendChild(el('strong', '', category + (entry.port ? ' · ' + entry.port : '')));
      const description = entry.kind === 'trade'
        ? entry.name + ' ' + entry.qty + '개 ' + (entry.direction === 'sell' ? '판매' : '매입')
        : entry.text;
      if (description) item.appendChild(el('p', '', description));
      if (entry.at) {
        const time = new Date(entry.at);
        if (Number.isFinite(time.getTime())) item.appendChild(el('small', '', time.toLocaleString('ko-KR')));
      }
      body.appendChild(item);
    }
  }

  const PORT_INSIGHTS = Object.freeze({
    byeokrando:'고려청자·인삼·고려지를 찾아온 상인이 많습니다.',
    donghae:'어업과 소금 교역이 중심인 작은 연안항입니다.',
    namhae:'고려의 남쪽 바닷길이 이어지는 중계항입니다.',
    dengzhou:'철과 북방 물산이 드나드는 송의 북방항입니다.',
    mingzhou:'비단과 차가 모이는 송의 국제항입니다.',
    quanzhou:'향신료 등 먼 바다의 물산이 들어오는 항구입니다.',
    hakata:'공예품과 유황 등이 거래되는 규슈의 항구입니다.',
    tsushima:'목재와 연안 물자가 오가는 작은 중계항입니다.',
    liaodong:'철·가죽·말과 육상 운송이 눈에 띄는 항구입니다.',
    nuzhen:'모피·약초·말이 모이는 북방 교역장입니다.'
  });

  function reply(topic) {
    const s = gameState();
    const carried = Object.entries(cargo(s)).filter(([, qty]) => Number(qty) > 0)
      .slice(0, 3).map(([id]) => core.goodsName(goods(), id));
    const newestTrade = [...journal.entries].reverse().find(x => x.kind === 'trade');
    const newestRumor = [...journal.entries].reverse().find(x => x.kind === 'rumor');
    const localHint = PORT_INSIGHTS[s?.place] || '이곳의 교역전에서 거래 조건을 살펴보세요.';
    const nativeRumor = core.nativeRumor(s);
    if (topic === 'trade') {
      return carried.length
        ? '“' + localHint + '\\n짐칸에 ' + carried.join(', ') + '이 있군요. 현지 가격과 항해에 드는 식량을 함께 따져보세요.”'
        : '“' + localHint + '\\n지금은 짐칸이 비어 있으니 가격을 비교한 뒤 화물을 골라보세요.”';
    }
    if (topic === 'memory') {
      return newestTrade
        ? '“마지막 거래는 ' + newestTrade.port + '에서 ' + newestTrade.name + ' ' + newestTrade.qty + '개를 ' + (newestTrade.direction === 'sell' ? '판 것' : '산 것') + '이지요. 항해일지를 펼쳐 보세요.”'
        : '“아직 장부에 남은 거래가 없군요. 매입이나 판매가 실제로 이루어지면 기억해 두겠습니다.”';
    }
    return (newestRumor || nativeRumor)
      ? '“얼마 전 객주에서 이렇게 들었지요.\n‘' + (newestRumor?.text || nativeRumor) + '’\n다만 지금도 맞는지는 교역전의 가격으로 확인해야 합니다.”'
      : '“소문을 들었다면 값이 변했는지 교역전에서 살펴보세요. 소문은 정보일 뿐, 이익을 보장하지는 않으니까요.”';
  }
  function renderTalk() {
    body.appendChild(el('p', 'intelIntro', (conversationPlace === 'market' ? '교역전 상인' : '객주 상인') + '에게 묻습니다. 답변은 내 화물과 거래 기록을 바탕으로 달라집니다.'));
    const questions = [
      ['trade', '지금 어떤 물품을 살펴볼까요?'],
      ['rumor', '들었던 소문을 믿어도 될까요?'],
      ['memory', '지난 거래를 기억하나요?']
    ];
    for (const [id, label] of questions) {
      const button = el('button', 'intelQuestion', label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(question === id));
      button.addEventListener('click', () => { question = id; render(); });
      body.appendChild(button);
    }
    const answer = el('div', 'intelAnswer', reply(question));
    answer.setAttribute('aria-live', 'polite');
    body.appendChild(answer);
  }
  function render() {
    heading.textContent = tab === 'journal' ? '상인의 항해일지' : '상인 이야기';
    journalTab.setAttribute('aria-selected', String(tab === 'journal'));
    talkTab.setAttribute('aria-selected', String(tab === 'talk'));
    body.replaceChildren();
    if (tab === 'journal') renderJournal();
    else renderTalk();
  }

  function installTalkButtons() {
    const rumourButton = byId('drinkRumorBtn');
    if (rumourButton && !byId('byeokTalkTavern')) {
      const btn = el('button', 'byeokTalkButton', '상인에게 묻기');
      btn.id = 'byeokTalkTavern';
      btn.type = 'button';
      btn.addEventListener('click', e => { e.stopPropagation(); question = 'trade'; open('talk', 'tavern'); });
      rumourButton.insertAdjacentElement('afterend', btn);
    }
    const market = byId('marketModal');
    if (market && !byId('byeokTalkMarket')) {
      const anchor = market.querySelector('.modalHeader,.modalTitle,h2,h3') || market.firstElementChild;
      if (!anchor) return;
      const btn = el('button', 'byeokTalkButton', '상인에게 묻기');
      btn.id = 'byeokTalkMarket';
      btn.type = 'button';
      btn.addEventListener('click', e => { e.stopPropagation(); question = 'trade'; open('talk', 'market'); });
      anchor.insertAdjacentElement('afterend', btn);
    }
  }

  // Observe the native click BEFORE inventory mutation; confirm after the click handler finishes.
  function onTrade(event) {
    const btn = event.target.closest('#goodsGrid .card .buy, #goodsGrid .card .sell');
    if (!btn || btn.disabled) return false;
    const initialState = gameState();
    if (!initialState) return true;
    const before = cargo(initialState);
    const location = port(initialState);
    const direction = btn.classList.contains('sell') ? 'sell' : 'buy';
    const visibleName = btn.closest('.card')?.querySelector('h3')?.textContent?.trim();
    setTimeout(() => {
      const changes = core.cargoChanges(before, cargo(gameState()));
      for (const change of changes) {
        if (direction === 'buy' && change.delta <= 0) continue;
        if (direction === 'sell' && change.delta >= 0) continue;
        const name = core.goodsName(goods(), change.id);
        if (visibleName && changes.length > 1 && !visibleName.includes(name)) continue;
        record({ kind:'trade', port:location, direction, name, qty:Math.abs(change.delta) });
      }
    }, 120);
    return true;
  }
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    if (onTrade(event)) return;
    const rumour = event.target.closest('#drinkRumorBtn');
    if (rumour && !rumour.disabled) {
      const before = core.nativeRumor(gameState());
      const location = port(gameState());
      setTimeout(() => {
        const after = core.nativeRumor(gameState());
        if (after && after !== before) record({ kind:'rumor', port:location, text:after });
        else record({ kind:'visit', port:location, text:'객주에서 이야기를 들었습니다. 자세한 내용은 객주 화면에서 확인하세요.' });
      }, 120);
      return;
    }
    const departure = event.target.closest('#departBtn');
    if (departure && !departure.disabled) {
      const before = gameState();
      const origin = port(before);
      const destination = core.portName(ports(), before?.destination);
      setTimeout(() => {
        if (gameState()?.mode === 'sail')
          record({ kind:'departure', port:origin, text:destination + ' 방향으로 출항했습니다.' });
      }, 120);
    }
  }, true);

  function poll() {
    const s = gameState();
    if (!s) return;
    // Keep sailing controls unobstructed; the journal is available again at the port.
    openBtn.style.display = s.mode === 'port' ? '' : 'none';
    if (s.mode === 'sail' && sheet.classList.contains('is-open')) {
      sheet.classList.remove('is-open');
      openBtn.setAttribute('aria-expanded', 'false');
    }
    if (previousMode === 'sail' && s.mode === 'port' && s.place !== previousPort)
      record({ kind:'arrival', port:port(s), text:port(s) + '에 도착했습니다.' });
    previousMode = s.mode;
    previousPort = s.place;
    installTalkButtons();
  }
  poll();
  const timer = window.setInterval(poll, 1000);
  window.addEventListener('pagehide', () => window.clearInterval(timer), { once:true });

  window.byeokrandoTradeIntelDebug = {
    read: () => JSON.parse(JSON.stringify(journal)),
    open: () => open('journal')
  };
})();