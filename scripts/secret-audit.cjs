#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SELF = 'scripts/secret-audit.cjs';
const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.js', '.mjs', '.cjs', '.json', '.css', '.scss', '.txt',
  '.md', '.yml', '.yaml', '.toml', '.ini', '.conf', '.config', '.xml', '.svg'
]);
const SECRET_ENV_NAMES = new Set(['.env', '.env.local', '.env.production', '.env.development', '.dev.vars']);
const SAFE_ENV_EXAMPLES = new Set(['.env.example', '.env.sample', '.dev.vars.example']);

const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
  ['OpenAI-style secret key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ['GitHub token', /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{20,255}\b/g],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{20,255}\b/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['Stripe live secret', /\bsk_live_[A-Za-z0-9]{16,}\b/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{12,}\b/g],
  ['JWT-like credential', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g],
  ['credential in URL', /https?:\/\/[^\s/:@]+:[^\s/@]+@[^\s/]+/g],
  ['Cloudflare token literal', /\bCLOUDFLARE_(?:API_)?TOKEN\s*[:=]\s*['"`][^'"`\r\n]{20,}['"`]/gi],
  ['database token literal', /\b(?:DB|DATABASE)[_-]?(?:TOKEN|PASSWORD)\s*[:=]\s*['"`][^'"`\r\n]{12,}['"`]/gi],
  ['admin password literal', /\bADMIN[_-]?PASSWORD\s*[:=]\s*['"`][^'"`\r\n]{8,}['"`]/gi],
  ['generic secret literal', /\b(?:api[_-]?key|api[_-]?token|access[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd)\s*[:=]\s*['"`]([^'"`\r\n]{12,})['"`]/gi]
];

const placeholderWords = /(example|sample|placeholder|your[_ -]?|replace[_ -]?me|changeme|dummy|fake|test[_ -]?key|not[_ -]?a[_ -]?secret)/i;

function trackedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' });
  return output.split('\0').filter(Boolean);
}

function isTextCandidate(file) {
  const base = path.basename(file);
  if (SECRET_ENV_NAMES.has(base) || SAFE_ENV_EXAMPLES.has(base)) return true;
  return TEXT_EXTENSIONS.has(path.extname(base).toLowerCase());
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function redact(value) {
  const clean = String(value).replace(/\s+/g, ' ');
  if (clean.length <= 8) return '[redacted]';
  return `${clean.slice(0, 4)}…${clean.slice(-4)}`;
}

const files = trackedFiles();
const findings = [];
const trackedSecretEnv = [];

for (const file of files) {
  if (file === SELF) continue;
  const base = path.basename(file);
  if (SECRET_ENV_NAMES.has(base)) trackedSecretEnv.push(file);
  if (!isTextCandidate(file)) continue;

  const absolute = path.join(ROOT, file);
  let text;
  try {
    const stat = fs.statSync(absolute);
    if (stat.size > 5 * 1024 * 1024) continue;
    text = fs.readFileSync(absolute, 'utf8');
  } catch (_) {
    continue;
  }

  for (const [label, regex] of patterns) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text))) {
      const matched = match[0];
      const candidate = match[1] || matched;
      if (placeholderWords.test(candidate)) continue;
      findings.push({
        file,
        line: lineNumber(text, match.index),
        label,
        preview: redact(matched)
      });
      if (match.index === regex.lastIndex) regex.lastIndex++;
    }
  }
}

console.log('Kidscade tracked secret audit');
console.log(`- tracked files: ${files.length}`);
console.log(`- tracked secret env files: ${trackedSecretEnv.length}`);
console.log(`- credential findings: ${findings.length}`);

if (trackedSecretEnv.length) {
  console.error('\nTracked environment/secret files are not allowed:');
  for (const file of trackedSecretEnv) console.error(`  - ${file}`);
}

if (findings.length) {
  console.error('\nPotential credentials found (values redacted):');
  for (const item of findings) {
    console.error(`  - ${item.file}:${item.line} [${item.label}] ${item.preview}`);
  }
}

if (trackedSecretEnv.length || findings.length) {
  console.error('\nSecret audit FAILED. Put server credentials in Cloudflare Worker Secrets/environment variables, never in static HTML/JS or tracked env files.');
  process.exit(1);
}

console.log('\nNo tracked credential literals detected.');
console.log('Server-only credentials must be stored in Cloudflare Worker Secrets/environment variables.');
