((factory) => {
  const root = typeof window !== 'undefined' ? window : null;
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.KidscadeShopUI = Object.freeze(api);
})(root => {
  'use strict';

  function create(options = {}) {
    const doc = options.document || root?.document;
    const storage = options.localStorage || root?.localStorage;
    const shopState = options.shopState || root?.KidscadeShopState || null;
    const shopDB = options.shopDB || {};
    let activeTab = String(options.initialTab || 'land');
    let bound = false;
    let unsubscribe = null;

    const mirrorState = () => options.getMirrors?.() || { inventory:{}, equipped:{} };
    const syncMirrors = state => {
      options.syncMirrors?.(state);
      return state;
    };

    function owns(category, item) {
      const id = String(item?.id || '');
      if (!id) return false;
      if (shopState?.owns) return shopState.owns(category, id);
      const inventory = mirrorState().inventory || {};
      return Array.isArray(inventory[category]) && inventory[category].includes(id);
    }

    function getEquipped(category) {
      if (shopState?.getEquipped) return shopState.getEquipped(category);
      return mirrorState().equipped?.[category] || '';
    }

    function buy(category, item) {
      if (!item) return { ok:false, reason:'invalid-item' };
      if (category === 'reward') {
        options.claimDailyReward?.(item);
        return { ok:true, reason:'daily-reward' };
      }
      if (owns(category, item)) {
        options.showToast?.('이미 가지고 있는 꾸미기예요.');
        return { ok:false, reason:'owned' };
      }
      const price = Math.max(0, Number(item.price) || 0);
      if ((Number(options.getCoins?.()) || 0) < price) {
        options.showToast?.(`씨앗이 부족해요! (${price}개 필요)`);
        options.playSound?.('click');
        return { ok:false, reason:'insufficient-balance' };
      }
      if (!options.changeSeeds?.(-price, '', { toast:false })) {
        return { ok:false, reason:'payment-failed' };
      }

      if (shopState?.grant) {
        syncMirrors(shopState.grant(category, item.id, { equip:true, source:'purchase' }));
      } else {
        const state = mirrorState();
        const inventory = state.inventory || {};
        const equipped = state.equipped || {};
        if (!Array.isArray(inventory[category])) inventory[category] = [];
        inventory[category].push(item.id);
        equipped[category] = item.id;
        try {
          storage?.setItem?.('kidscade_inventory', JSON.stringify(inventory));
          storage?.setItem?.('kidscade_equipped', JSON.stringify(equipped));
        } catch (_) {}
        syncMirrors({ inventory, equipped });
      }

      options.showToast?.(`${item.name}을(를) 얻고 바로 적용했어요!`);
      options.playSound?.('print');
      applyEquipped();
      return { ok:true };
    }

    function equip(category, item) {
      if (!item) return { ok:false, reason:'invalid-item' };
      options.playSound?.('click');
      if (shopState?.equip) {
        const result = shopState.equip(category, item.id, { source:'equip' });
        if (!result?.ok) return result || { ok:false, reason:'equip-failed' };
        syncMirrors(result);
      } else {
        const state = mirrorState();
        const equipped = state.equipped || {};
        equipped[category] = item.id;
        try { storage?.setItem?.('kidscade_equipped', JSON.stringify(equipped)); } catch (_) {}
        syncMirrors({ inventory:state.inventory || {}, equipped });
      }
      options.showToast?.(`${item.name} 적용 완료!`);
      applyEquipped();
      return { ok:true };
    }

    function syncTabs() {
      doc?.querySelectorAll?.('.shop-tab')?.forEach?.(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === activeTab);
      });
    }

    function openTab(tab, config = {}) {
      activeTab = String(tab || 'land');
      syncTabs();
      if (config.sound !== false) options.playSound?.('open');
      if (config.open !== false) doc?.getElementById?.('shop-modal')?.classList?.remove?.('hidden');
      render();
      return activeTab;
    }

    function renderGardenShortcut(container) {
      if (activeTab !== 'land' || !root?.KidscadeGarden) return false;
      const item = doc.createElement('div');
      item.className = 'shop-item';
      item.innerHTML = '<div class="item-icon">🌳</div><div class="item-name">정원 시설 설치</div><div class="item-desc">동물은 게임을 탐험하며 발견하고, 씨앗으로 친구들이 놀 시설을 설치해요.</div><button type="button" class="item-btn btn-buy">정원 시설 보러 가기</button>';
      item.querySelector('button')?.addEventListener('click', () => {
        doc.getElementById('shop-modal')?.classList.add('hidden');
        options.openGardenBuild?.();
      });
      container.append(item);
      return true;
    }

    function render() {
      const container = doc?.getElementById?.('shop-items-container');
      if (!container) return false;
      container.innerHTML = '';
      if (renderGardenShortcut(container)) return true;

      const items = Array.isArray(shopDB[activeTab]) ? shopDB[activeTab] : [];
      const todayClaimed = Boolean(options.isDailyRewardClaimed?.());
      items.forEach(item => {
        const el = doc.createElement('div');
        const owned = activeTab !== 'reward' && owns(activeTab, item);
        const equippedNow = activeTab !== 'reward' && getEquipped(activeTab) === item.id;
        el.className = `shop-item ${owned ? 'owned' : ''}`;
        const priceText = activeTab === 'reward' ? '하루 1개 선택' : `${Number(item.price || 0).toLocaleString()} 씨앗`;
        el.innerHTML = `<div class="item-icon">${item.icon || '✨'}</div><div class="item-name">${item.name}</div><div class="item-desc">${item.desc}</div><div class="item-stock">${priceText}</div>`;

        const btn = doc.createElement('button');
        if (activeTab === 'reward') {
          btn.className = todayClaimed ? 'item-btn btn-equipped' : 'item-btn btn-buy';
          btn.innerText = todayClaimed ? '오늘 선택 완료' : '오늘 보상 받기';
          btn.disabled = todayClaimed;
          btn.onclick = () => options.claimDailyReward?.(item);
        } else if (!owned) {
          btn.className = 'item-btn btn-buy';
          btn.innerText = Number(item.price || 0) === 0 ? '받기' : `구매 (${Number(item.price || 0).toLocaleString()} 씨앗)`;
          btn.onclick = () => buy(activeTab, item);
        } else if (equippedNow) {
          btn.className = 'item-btn btn-equipped';
          btn.innerText = '적용 중';
          btn.disabled = true;
        } else {
          btn.className = 'item-btn btn-equip';
          btn.innerText = '적용하기';
          btn.onclick = () => equip(activeTab, item);
        }
        el.appendChild(btn);
        container.appendChild(el);
      });
      return true;
    }

    function applyEquipped() {
      const badgeItems = Array.isArray(shopDB.badge) ? shopDB.badge : [];
      const badge = badgeItems.find(item => item.id === getEquipped('badge')) || badgeItems[0];
      if (badge) {
        const emoji = doc?.getElementById?.('profile-emoji');
        const prefix = doc?.getElementById?.('profile-prefix');
        const noun = doc?.getElementById?.('profile-noun');
        if (emoji) emoji.innerText = badge.icon || '🐣';
        if (prefix) prefix.innerText = badge.prefix || '신입생';
        if (noun) noun.innerText = badge.noun || '게이머';
      }

      doc?.body?.classList?.remove?.('theme-hacker', 'theme-princess', 'theme-space');
      for (const category of ['card','land']) {
        for (const item of Array.isArray(shopDB[category]) ? shopDB[category] : []) {
          if (item.className) doc?.body?.classList?.remove?.(item.className);
        }
        const selected = (shopDB[category] || []).find(item => item.id === getEquipped(category));
        if (selected?.className) doc?.body?.classList?.add?.(selected.className);
      }

      render();
      options.updatePetUI?.();
      return true;
    }

    function bind() {
      if (bound) return false;
      bound = true;

      doc?.querySelectorAll?.('.shop-tab')?.forEach?.(tab => {
        if (tab.dataset.kcShopBound === '1') return;
        tab.dataset.kcShopBound = '1';
        tab.addEventListener('click', () => {
          options.playSound?.('click');
          activeTab = tab.getAttribute('data-tab') || 'land';
          syncTabs();
          render();
        });
      });

      if (shopState?.subscribe) {
        unsubscribe = shopState.subscribe(detail => {
          syncMirrors(detail);
          applyEquipped();
        }, { immediate:false });
      }

      syncTabs();
      return true;
    }

    function destroy() {
      unsubscribe?.();
      unsubscribe = null;
    }

    return Object.freeze({
      bind,
      destroy,
      render,
      applyEquipped,
      openTab,
      buy,
      equip,
      owns,
      getEquipped,
      syncMirrors,
      getActiveTab: () => activeTab
    });
  }

  return Object.freeze({ create });
});
