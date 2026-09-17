const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index_base.html');
const BOOTSTRAP = path.join(ROOT, 'main-bootstrap.js');

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: start marker not found`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`${label}: end marker not found`);
  return source.slice(0, start) + replacement + source.slice(end);
}

let html = fs.readFileSync(INDEX, 'utf8');

if (!html.includes('<script src="seed-wallet.js"></script>')) {
  const playtimeTag = '    <script src="playtime-state.js"></script>';
  if (!html.includes(playtimeTag)) throw new Error('playtime script tag not found');
  html = html.replace(playtimeTag, `${playtimeTag}\n    <script src="seed-wallet.js"></script>`);
}

const oldCoinsInit = "            let coins = Math.max(0, parseInt(localStorage.getItem('kidscade_coins') || '0', 10) || 0);";
const newCoinsInit = "            let coins = window.KidscadeSeedWallet?.get?.() ?? Math.max(0, parseInt(localStorage.getItem('kidscade_coins') || '0', 10) || 0);";
if (!html.includes(newCoinsInit)) {
  if (!html.includes(oldCoinsInit)) throw new Error('legacy coins initializer not found');
  html = html.replace(oldCoinsInit, newCoinsInit);
}

const walletFunctions = `            function readSeedBalance() {
                if (window.KidscadeSeedWallet?.get) return window.KidscadeSeedWallet.get();
                const stored = parseInt(localStorage.getItem('kidscade_coins') || '0', 10);
                return Number.isFinite(stored) ? Math.max(0, stored) : 0;
            }

            function renderCoinUI() {
                coinDisplay.innerText = \`🌱 \${coins.toLocaleString()} 씨앗\`;
                if (typeof updateAvatarCurrency === 'function') updateAvatarCurrency();
            }

            function updateCoinUI() {
                coins = readSeedBalance();
                renderCoinUI();
                return coins;
            }

            function getPersistedCoins() {
                return readSeedBalance();
            }

            function changeSeeds(amount, reason = '', options = {}) {
                const delta = Math.trunc(Number(amount) || 0);
                if (delta === 0) return true;

                const wallet = window.KidscadeSeedWallet;
                if (wallet?.change) {
                    const result = wallet.change(delta, { reason, source: 'index-base' });
                    coins = Math.max(0, Math.round(Number(result.balance) || 0));
                    renderCoinUI();
                    if (!result.ok) return false;
                } else {
                    // seed-wallet.js가 누락된 직접 실행에서도 기존 저장값을 잃지 않는 최소 fallback.
                    const persisted = getPersistedCoins();
                    const next = persisted + delta;
                    if (next < 0) return false;
                    coins = next;
                    localStorage.setItem('kidscade_coins', String(coins));
                    renderCoinUI();
                }

                if (options.toast !== false && reason) {
                    const sign = delta > 0 ? '+' : '';
                    showToast(\`\${reason} (\${sign}\${delta.toLocaleString()} 씨앗)\`, true);
                }
                return true;
            }

`;

html = replaceBetween(
  html,
  '            function renderCoinUI() {',
  '            function showToast(msg, isCoin = false) {',
  walletFunctions,
  'seed wallet functions'
);

const walletSync = `            function addCoins(amount, reason) {
                return changeSeeds(Math.abs(Math.trunc(Number(amount) || 0)), reason, { toast: true });
            }

            // 지갑이 모든 저장/동기화를 전담하고 index_base는 레거시 coins 미러만 유지합니다.
            if (window.KidscadeSeedWallet?.subscribe) {
                window.KidscadeSeedWallet.subscribe(detail => {
                    const next = Math.max(0, Math.round(Number(detail?.balance) || 0));
                    if (next === coins) return;
                    coins = next;
                    renderCoinUI();
                }, { immediate: false });
            } else {
                // 직접 index_base.html을 여는 비정상/복구 경로의 호환 fallback.
                window.addEventListener('storage', (event) => {
                    if (event.key === 'kidscade_coins') {
                        coins = Math.max(0, parseInt(event.newValue || '0', 10) || 0);
                        renderCoinUI();
                    }
                });
            }
`;

html = replaceBetween(
  html,
  '            function addCoins(amount, reason) {',
  '            // =====================================\n            // 👤 씨앗 아바타 옷장',
  `${walletSync}\n\n`,
  'seed wallet synchronization'
);

fs.writeFileSync(INDEX, html, 'utf8');

let bootstrap = fs.readFileSync(BOOTSTRAP, 'utf8');
const versionNeedle = `    html = html.replace('src="playtime-state.js"', 'src="' + withVersion('playtime-state.js') + '"');`;
const seedVersionLine = `    html = html.replace('src="seed-wallet.js"', 'src="' + withVersion('seed-wallet.js') + '"');`;
if (!bootstrap.includes(seedVersionLine)) {
  if (!bootstrap.includes(versionNeedle)) throw new Error('bootstrap playtime version line not found');
  bootstrap = bootstrap.replace(versionNeedle, `${versionNeedle}\n${seedVersionLine}`);
}
fs.writeFileSync(BOOTSTRAP, bootstrap, 'utf8');

console.log('Seed wallet extraction complete');
