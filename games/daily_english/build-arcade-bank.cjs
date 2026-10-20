// Rebuild the English-only curriculum from the legacy World Language Arcade.
// Japanese and Chinese data remain in their original game.
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../language_arcade/월드 랭귀지 아케이드.html'), 'utf8');
const line = source.split('\n').find(s => s.startsWith('const DATA='));
if (!line || !line.trimEnd().endsWith(';')) throw new Error('Cannot locate arcade language bank');
const all = JSON.parse(line.slice('const DATA='.length).trim().replace(/;$/, ''));
const english = {engWords: all.engWords, engSentences: all.engSentences};
for (const key of Object.keys(english)) {
  if (!Array.isArray(english[key]) || !english[key].length) throw new Error('Missing ' + key);
  if (!english[key].every(v => typeof v.word === 'string' && typeof v.desc === 'string')) throw new Error('Invalid ' + key);
}
const content = `// Generated from World Language Arcade by build-arcade-bank.cjs; do not edit by hand.\n` +
  `(function(root,data){if(typeof module==='object'&&module.exports)module.exports=data;if(root)root.DailyEnglishArcadeBank=data;})(typeof window==='undefined'?null:window,${JSON.stringify(english)});\n`;
fs.writeFileSync(path.join(__dirname, 'arcade-bank.js'), content);
console.log(`English arcade bank: ${english.engWords.length} words, ${english.engSentences.length} sentences`);
