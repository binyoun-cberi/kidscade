'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { localPath, buildReport, toMarkdown } = require('../scripts/chat-quality-report.cjs');

test('local paths reject remote URLs and traversal', () => {
  assert.equal(localPath('games/demo/index.html?v=2'), 'games/demo/index.html');
  assert.equal(localPath('../private.env'), null);
  assert.equal(localPath('%2e%2e/private.env'), null);
  assert.equal(localPath('/etc/passwd'), null);
  assert.equal(localPath('https://example.com/cover.webp'), null);
  assert.equal(localPath('C:\\secrets'), null);
});

test('offline report detects broken entries, covers and rework without scanning secrets', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kidscade-chat-audit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const put = (relative, contents) => {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, contents);
  };
  put('games/ready/index.html', '<h1>ok</h1>');
  put('assets/ready.webp', 'fixture');
  put('data/game-cover-overrides.json', JSON.stringify({ ready: 'assets/ready.webp' }));
  put('data/games.json', JSON.stringify({ games: [
    { id: 'ready', title: 'Ready', href: 'games/ready/index.html', qualityStatus: 'standard' },
    { id: 'broken', title: 'Broken', href: 'games/missing/index.html', qualityStatus: 'rework' },
    { id: 'external', title: 'External', href: 'games/ready/index.html', cover: 'https://example.test/cover.webp', qualityStatus: 'standard' },
    { id: 'invalid', title: 'Invalid', href: 'games/ready/index.html', cover: 'assets/ready.webp', qualityStatus: 'unknown' },
    { id: 'disabled', title: 'Disabled', disabled: true, href: 'missing.html' }
  ] }));
  const report = buildReport(root);
  assert.equal(report.gameCount, 5);
  assert.equal(report.enabledCount, 4);
  assert.equal(report.missingEntryCount, 1);
  assert.equal(report.missingCoverCount, 1);
  assert.equal(report.invalidQualityCount, 1);
  assert.equal(report.reworkCount, 1);
  assert.equal(report.externalCoverCount, 1);
  assert.equal(report.candidates[0].id, 'broken');
  const markdown = toMarkdown(report);
  assert.match(markdown, /실행 파일 누락/);
  assert.match(markdown, /Broken/);
  assert.match(markdown, /실제 플레이 재미/);
});
