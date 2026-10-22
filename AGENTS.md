# Kidscade: Chat-led development rules

These instructions apply to automated or assistant-led changes in this repository.
The intended low-cost mode is **one ordinary Chat session** performing distinct review
roles in sequence. This is NOT a continuously running swarm or multiple independent agents.

## Mandatory security and cost limits

- Never read, print, copy, upload, log, expose, or commit any secret or API key.
  Do not inspect `.env`, credentials, secret values, Cloudflare tokens or GitHub Secrets.
- Never add paid model/API calls, hosted autonomous agents, paid runners, new billing
  services, Copilot, or a dependency that sends code or data to a third-party AI service.
- Only use the repository's existing test/build tooling without new paid services.
- Do not deploy, apply remote D1 migrations, call `npm run deploy:cloudflare`,
  change billing/account settings, push directly to `main`, or auto-merge a PR.
- Work on a topic branch. Submit a PR and wait for a human to approve merging.
- Do not use `pull_request_target` for scripts or untrusted PR contents.
- Keep GitHub Actions permissions at the minimum necessary (normally `contents: read`).
- If this repository is made private, do not schedule the added quality-audit workflow.
  Confirm new billing implications with the owner before changing this constraint.

## One-Chat review loop (maximum 3 iterations)

1. **Analyst**: Identify the game, source files, real defect, and evidence.
2. **Designer**: Explain the smallest improvement to player actions and feedback.
3. **Implementer**: Change the least necessary files; preserve game IDs, URLs,
   student data, records, assets, touch controls and existing game progress.
4. **Skeptical reviewer**: Challenge unclear goals, repetitive mechanics, unused
   assets, misleading UI, classroom suitability, regressions and accessibility.
5. **Tester**: Run targeted tests and, if the environment supports it, real-browser
   playthroughs/screenshots. Clearly distinguish simulated checks from actual play.
6. **Coordinator**: Compare against acceptance criteria; repeat only for a specific
   failed check, at most three times, and stop if evidence is insufficient.

Never claim that an AI opinion proves a game is fun; validate with real users when possible.
Never claim that a test passed unless the test actually ran successfully.

## Standard verification

- `node --test tests/chat-quality-report.test.cjs` for this report.
- `node scripts/chat-quality-report.cjs` for a local, offline advisory snapshot.
- For game changes, prefer relevant targeted tests, then existing
  `npm run health:strict`, `npm run test:ci`, and `npm run build` in CI.
- Some browser audits run as dedicated GitHub workflows; inspect their actual results.
- Include exact checks run and any incomplete tests in the PR description.

## Required PR report

Describe: defect before change, files changed, visible gameplay improvement,
assets reused, tests actually run, limitations, and whether keys, billing,
deployment, and student records were untouched. Never include credential values.


## Optional independent AI review (manual, local, no hosted services)

Only when the owner explicitly chooses actual independent-model comparison, use
`node scripts/local-multi-ai-review.cjs` as an **opt-in local review tool**.
It connects exclusively to an already running **Ollama on 127.0.0.1:11434**.
It neither installs/pulls models nor calls a third-party hosted model/API.
At least two different installed local models are required; the defaults
use four distinct models and separate, unseen first-round contexts.
A second round lets each reviewer see and challenge the other reports.

- Do not describe the earlier single-Chat multi-role process as independent AI.
- Never say an independent AI ran merely because local runner unit tests passed;
  those tests use mocked model responses and are **not** AI reviews.
- Reviewing pixel aesthetics requires an actual screenshot passed with --image
  and a vision-capable local model. Without one, report it as unverified.
- Do not schedule this runner in GitHub Actions or use external network endpoints.
- Reports are local in .local-ai-reviews/ and ignored from git.
- The local reviewers can suggest changes but **do not write game code, deploy,
  approve, or merge**; implementation and tests remain separate reviewed work.
- The paid/secret/security limits above remain fully in force.
