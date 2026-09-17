const fs = require('node:fs');

const htmlPath = 'index_base.html';
const bootstrapPath = 'main-bootstrap.js';
let html = fs.readFileSync(htmlPath, 'utf8');
let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');

function requireText(text, needle, label) {
  if (!text.includes(needle)) throw new Error(`Missing ${label}: ${needle}`);
}

if (!html.includes('<script src="shop-state.js"></script>')) {
  requireText(html, '<script src="achievement-state.js"></script>', 'achievement state script');
  html = html.replace(
    '<script src="achievement-state.js"></script>',
    '<script src="achievement-state.js"></script>\n    <script src="shop-state.js"></script>'
  );
}

const initOld = `            let inventory = safeParseStorage('kidscade_inventory', {emoji:['e_basic'], title_p:['tp_basic'], title_n:['tn_basic'], theme:['th_basic']});
            let equipped = safeParseStorage('kidscade_equipped', {emoji:'e_basic', title_p:'tp_basic', title_n:'tn_basic', theme:'th_basic'});`;
const initNew = `            const initialShopState = window.KidscadeShopState?.load?.() || {
                inventory: safeParseStorage('kidscade_inventory', {emoji:['e_basic'], title_p:['tp_basic'], title_n:['tn_basic'], theme:['th_basic'], land:['land_basic'], card:['card_basic'], badge:['badge_basic']}),
                equipped: safeParseStorage('kidscade_equipped', {emoji:'e_basic', title_p:'tp_basic', title_n:'tn_basic', theme:'th_basic', land:'land_basic', card:'card_basic', badge:'badge_basic'})
            };
            let inventory = initialShopState.inventory;
            let equipped = initialShopState.equipped;`;
requireText(html, initOld, 'legacy shop state initialization');
html = html.replace(initOld, initNew);

const normalizeOld = `            if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) inventory = {emoji:['e_basic'], title_p:['tp_basic'], title_n:['tn_basic'], theme:['th_basic']};
            if (!equipped || typeof equipped !== 'object' || Array.isArray(equipped)) equipped = {emoji:'e_basic', title_p:'tp_basic', title_n:'tn_basic', theme:'th_basic'};
            if (!petItems || typeof petItems !== 'object' || Array.isArray(petItems)) petItems = {};

            if (!inventory.land) inventory.land = ['land_basic'];
            if (!inventory.card) inventory.card = ['card_basic'];
            if (!inventory.badge) inventory.badge = ['badge_basic'];
            if (!equipped.land) equipped.land = 'land_basic';
            if (!equipped.card) equipped.card = 'card_basic';
            if (!equipped.badge) equipped.badge = 'badge_basic';
            localStorage.setItem('kidscade_inventory', JSON.stringify(inventory));
            localStorage.setItem('kidscade_equipped', JSON.stringify(equipped));`;
const normalizeNew = `            if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) inventory = {emoji:['e_basic'], title_p:['tp_basic'], title_n:['tn_basic'], theme:['th_basic'], land:['land_basic'], card:['card_basic'], badge:['badge_basic']};
            if (!equipped || typeof equipped !== 'object' || Array.isArray(equipped)) equipped = {emoji:'e_basic', title_p:'tp_basic', title_n:'tn_basic', theme:'th_basic', land:'land_basic', card:'card_basic', badge:'badge_basic'};
            if (!petItems || typeof petItems !== 'object' || Array.isArray(petItems)) petItems = {};

            if (window.KidscadeShopState?.ensureDefaults) {
                const normalizedShopState = window.KidscadeShopState.ensureDefaults();
                inventory = normalizedShopState.inventory;
                equipped = normalizedShopState.equipped;
            } else {
                if (!inventory.land) inventory.land = ['land_basic'];
                if (!inventory.card) inventory.card = ['card_basic'];
                if (!inventory.badge) inventory.badge = ['badge_basic'];
                if (!equipped.land) equipped.land = 'land_basic';
                if (!equipped.card) equipped.card = 'card_basic';
                if (!equipped.badge) equipped.badge = 'badge_basic';
                localStorage.setItem('kidscade_inventory', JSON.stringify(inventory));
                localStorage.setItem('kidscade_equipped', JSON.stringify(equipped));
            }`;
requireText(html, normalizeOld, 'legacy shop state normalization');
html = html.replace(normalizeOld, normalizeNew);

const helperOld = `            function isOwnedShopItem(category, item) {
                return (inventory[category] || []).includes(item.id);
            }

            function getEquippedShopId(category) {
                return equipped[category];
            }

            function buyItem(category, item) {
                if (category === 'reward') { claimDailyReward(item); return; }
                if (!inventory[category]) inventory[category] = [];
                if (isOwnedShopItem(category, item)) { showToast('이미 가지고 있는 꾸미기예요.'); return; }
                if (coins < item.price) { showToast(\`씨앗이 부족해요! (\${item.price}개 필요)\`); playUISound('click'); return; }
                if (!changeSeeds(-item.price, '', { toast: false })) return;
                inventory[category].push(item.id);
                equipped[category] = item.id;
                localStorage.setItem('kidscade_inventory', JSON.stringify(inventory));
                localStorage.setItem('kidscade_equipped', JSON.stringify(equipped));
                showToast(\`\${item.name}을(를) 얻고 바로 적용했어요!\`);
                playUISound('print');
                applyEquipped();
            }

            function equipItem(category, item) {
                playUISound('click');
                equipped[category] = item.id;
                localStorage.setItem('kidscade_equipped', JSON.stringify(equipped));
                showToast(\`\${item.name} 적용 완료!\`);
                applyEquipped();
            }`;
const helperNew = `            function syncShopStateMirrors(state) {
                if (!state) return;
                if (state.inventory) inventory = state.inventory;
                if (state.equipped) equipped = state.equipped;
            }

            function isOwnedShopItem(category, item) {
                if (window.KidscadeShopState?.owns) return window.KidscadeShopState.owns(category, item.id);
                return (inventory[category] || []).includes(item.id);
            }

            function getEquippedShopId(category) {
                if (window.KidscadeShopState?.getEquipped) return window.KidscadeShopState.getEquipped(category);
                return equipped[category];
            }

            function buyItem(category, item) {
                if (category === 'reward') { claimDailyReward(item); return; }
                if (isOwnedShopItem(category, item)) { showToast('이미 가지고 있는 꾸미기예요.'); return; }
                if (coins < item.price) { showToast(\`씨앗이 부족해요! (\${item.price}개 필요)\`); playUISound('click'); return; }
                if (!changeSeeds(-item.price, '', { toast: false })) return;

                if (window.KidscadeShopState?.grant) {
                    syncShopStateMirrors(window.KidscadeShopState.grant(category, item.id, { equip: true, source: 'purchase' }));
                } else {
                    if (!inventory[category]) inventory[category] = [];
                    inventory[category].push(item.id);
                    equipped[category] = item.id;
                    localStorage.setItem('kidscade_inventory', JSON.stringify(inventory));
                    localStorage.setItem('kidscade_equipped', JSON.stringify(equipped));
                }
                showToast(\`\${item.name}을(를) 얻고 바로 적용했어요!\`);
                playUISound('print');
                applyEquipped();
            }

            function equipItem(category, item) {
                playUISound('click');
                if (window.KidscadeShopState?.equip) {
                    const result = window.KidscadeShopState.equip(category, item.id, { source: 'equip' });
                    if (!result.ok) return;
                    syncShopStateMirrors(result);
                } else {
                    equipped[category] = item.id;
                    localStorage.setItem('kidscade_equipped', JSON.stringify(equipped));
                }
                showToast(\`\${item.name} 적용 완료!\`);
                applyEquipped();
            }`;
requireText(html, helperOld, 'legacy shop purchase/equip block');
html = html.replace(helperOld, helperNew);

requireText(html, "const badge = shopDB.badge.find(item => item.id === equipped.badge) || shopDB.badge[0];", 'badge equipped lookup');
html = html.replace(
  "const badge = shopDB.badge.find(item => item.id === equipped.badge) || shopDB.badge[0];",
  "const badge = shopDB.badge.find(item => item.id === getEquippedShopId('badge')) || shopDB.badge[0];"
);
requireText(html, "const cardSkin = shopDB.card.find(item => item.id === equipped.card);", 'card equipped lookup');
html = html.replace(
  "const cardSkin = shopDB.card.find(item => item.id === equipped.card);",
  "const cardSkin = shopDB.card.find(item => item.id === getEquippedShopId('card'));"
);
const applyTailOld = `                const landSkin = shopDB.land.find(item => item.id === equipped.land);
                if (landSkin && landSkin.className) document.body.classList.add(landSkin.className);

                localStorage.setItem('kidscade_equipped', JSON.stringify(equipped));`;
const applyTailNew = `                const landSkin = shopDB.land.find(item => item.id === getEquippedShopId('land'));
                if (landSkin && landSkin.className) document.body.classList.add(landSkin.className);`;
requireText(html, applyTailOld, 'applyEquipped land lookup and legacy write');
html = html.replace(applyTailOld, applyTailNew);

const avatarMarker = `            // =====================================
            // 👤 씨앗 아바타 옷장: 기존 게임/기록과 분리된 SVG 레이어 시스템`;
if (!html.includes('KidscadeShopState?.subscribe')) {
  requireText(html, avatarMarker, 'avatar section marker');
  const subscription = `            if (window.KidscadeShopState?.subscribe) {
                window.KidscadeShopState.subscribe(detail => {
                    syncShopStateMirrors(detail);
                    applyEquipped();
                    const shopModal = document.getElementById('shop-modal');
                    if (shopModal && !shopModal.classList.contains('hidden')) renderShop();
                }, { immediate: false });
            }

`;
  html = html.replace(avatarMarker, subscription + avatarMarker);
}

if (!bootstrap.includes("withVersion('shop-state.js')")) {
  requireText(bootstrap, "html = html.replace('src=\"achievement-state.js\"', 'src=\"' + withVersion('achievement-state.js') + '\"');", 'achievement state bootstrap versioning');
  bootstrap = bootstrap.replace(
    "html = html.replace('src=\"achievement-state.js\"', 'src=\"' + withVersion('achievement-state.js') + '\"');",
    "html = html.replace('src=\"achievement-state.js\"', 'src=\"' + withVersion('achievement-state.js') + '\"');\n    html = html.replace('src=\"shop-state.js\"', 'src=\"' + withVersion('shop-state.js') + '\"');"
  );
}

fs.writeFileSync(htmlPath, html);
fs.writeFileSync(bootstrapPath, bootstrap);
