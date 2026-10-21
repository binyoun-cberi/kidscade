#!/usr/bin/env node
'use strict';

// Read-only, offline catalog audit for Chat-led development. No API calls or secrets.
const fs = require('node:fs');
const path = require('node:path');

const ALLOWED_QUALITY = new Set(['featured', 'standard', 'rework']);

function readJsonIfPresent(filename, fallback) {
  if (!fs.existsSync(filename)) return fallback;
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function localPath(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const input = value.trim();
  if (input.startsWith('/') || input.startsWith('\\') || /^[a-z][a-z0-9+.-]*:/i.test(input)) return null;
  let decoded;
  try { decoded = decodeURIComponent(input.split(/[?#]/, 1)[0]); }
  catch (_) { return null; }
  const normalized = path.posix.normalize(decoded.replace(/\\/g, '/'));
  if (!normalized || normalized === '.' || normalized === '..' ||
      normalized.startsWith('../') || normalized.startsWith('/')) return null;
  return normalized;
}

function fileExistsInside(root, location) {
  const relative = localPath(location);
  if (!relative) return false;
  const file = path.resolve(root, relative);
  if (!file.startsWith(path.resolve(root) + path.sep)) return false;
  try { return fs.statSync(file).isFile(); }
  catch (_) { return false; }
}

function buildReport(root = path.resolve(__dirname, '..')) {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/games.json'), 'utf8'));
  const overrides = readJsonIfPresent(path.join(root, 'data/game-cover-overrides.json'), {});
  const games = Array.isArray(catalog.games) ? catalog.games : [];
  const results = [];
  for (const game of games) {
    if (game.disabled) continue;
    const id = String(game.id || '');
    const title = String(game.title || id);
    const cover = game.cover || overrides[id] || '';
    const entryMissing = !fileExistsInside(root, game.href);
    // Remote covers are not downloaded or treated as verified local files.
    const coverExternal = typeof cover === 'string' && /^https?:\/\//i.test(cover);
    const coverMissing = !cover || (!coverExternal && !fileExistsInside(root, cover));
    const quality = String(game.qualityStatus || '');
    const qualityInvalid = !ALLOWED_QUALITY.has(quality);
    const needsRework = quality === 'rework';
    const score = (entryMissing ? 100 : 0) + (coverMissing ? 40 : 0) +
      (qualityInvalid ? 30 : 0) + (needsRework ? 10 : 0);
    const notes = [];
    if (entryMissing) notes.push('실행 파일 없음');
    if (coverMissing) notes.push('대문 이미지 없음/손상');
    if (qualityInvalid) notes.push('품질 분류 오류');
    if (needsRework) notes.push('개선 대상으로 분류됨');
    if (coverExternal) notes.push('외부 이미지(미검증)');
    results.push({ id, title, quality, entryMissing, coverMissing, qualityInvalid, needsRework, coverExternal, score, notes });
  }
  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {
    gameCount: games.length,
    enabledCount: results.length,
    missingEntryCount: results.filter(g => g.entryMissing).length,
    missingCoverCount: results.filter(g => g.coverMissing).length,
    invalidQualityCount: results.filter(g => g.qualityInvalid).length,
    reworkCount: results.filter(g => g.needsRework).length,
    externalCoverCount: results.filter(g => g.coverExternal).length,
    candidates: results.filter(g => g.score > 0),
  };
}

function escapeCell(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
    .replace(/[\r\n]/g, ' ').replace(/[<>]/g, '');
}

function toMarkdown(report) {
  const out = [
    '# 키즈케이드 Chat 개발 품질 현황',
    '',
    '> 외부 AI API, 네트워크 요청, Secrets 접근 없이 저장소 파일만 읽었습니다.',
    '> 이 보고서는 정적 카탈로그 점검이며 실제 플레이 재미·성능을 인증하지 않습니다.',
    '',
    '| 지표 | 개수 |', '| --- | ---: |',
    '| 전체 등록 게임 | ' + report.gameCount + ' |',
    '| 활성 게임 | ' + report.enabledCount + ' |',
    '| 실행 파일 누락 | ' + report.missingEntryCount + ' |',
    '| 대문 이미지 누락/손상 | ' + report.missingCoverCount + ' |',
    '| 품질 분류 오류 | ' + report.invalidQualityCount + ' |',
    '| 개선 대상(rework) | ' + report.reworkCount + ' |',
    '| 외부 대문 이미지(미검증) | ' + report.externalCoverCount + ' |',
    '',
    '## 확인 우선순위 (최대 20개)', '',
    '| 게임 ID | 게임 | 점수 | 점검 내용 |',
    '| --- | --- | ---: | --- |',
  ];
  if (!report.candidates.length) out.push('| - | 문제 후보 없음 | - | - |');
  for (const item of report.candidates.slice(0, 20)) {
    out.push('| ' + escapeCell(item.id) + ' | ' + escapeCell(item.title) + ' | ' +
      item.score + ' | ' + escapeCell(item.notes.join(', ')) + ' |');
  }
  out.push('', '우선순위 점수는 결함 점검 순서를 정하는 보조값입니다. 게임 재미 점수가 아닙니다.', '');
  return out.join('\n');
}

if (require.main === module) {
  const report = buildReport();
  process.stdout.write(process.argv.includes('--json')
    ? JSON.stringify(report, null, 2) + '\n'
    : toMarkdown(report));
}

module.exports = { localPath, fileExistsInside, buildReport, toMarkdown };
