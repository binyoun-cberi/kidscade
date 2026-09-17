const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'dist', 'data', 'games.json');
const gamePath = 'games/job_maratang_simulator/마라탕 한 그릇.html';
const versionedHref = `${gamePath}?v=5`;

if (!fs.existsSync(catalogPath)) throw new Error('Missing built game catalog: data/games.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const game = (catalog.games || []).find(item => item && item.id === 'job_maratang_simulator');
if (!game) throw new Error('Missing job_maratang_simulator catalog entry');
if (!fs.existsSync(path.join(root, 'dist', gamePath))) throw new Error(`Missing built Maratang Selfbar file: ${gamePath}`);

game.href = versionedHref;
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`[maratang-selfbar] catalog href set to ${versionedHref}`);
