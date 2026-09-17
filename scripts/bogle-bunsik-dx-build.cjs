const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'dist', 'data', 'games.json');
const gamePath = 'games/job_bogle_bunsik/보글보글 분식집.html';
const versionedHref = `${gamePath}?v=1`;

if (!fs.existsSync(catalogPath)) throw new Error('Missing built game catalog: data/games.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const game = (catalog.games || []).find(item => item && item.id === 'job_bogle_bunsik');
if (!game) throw new Error('Missing job_bogle_bunsik catalog entry');

const builtGame = path.join(root, 'dist', gamePath);
const builtAlias = path.join(root, 'dist', '보글보글 분식집.html');
if (!fs.existsSync(builtGame)) throw new Error(`Missing built Bogle Bunsik DX file: ${gamePath}`);
if (!fs.existsSync(builtAlias)) throw new Error('Missing legacy Bogle Bunsik root alias');

game.href = versionedHref;
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
console.log(`[bogle-bunsik-dx] catalog href set to ${versionedHref}`);
