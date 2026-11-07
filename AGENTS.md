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

## Continuity across ordinary Chat requests

The user's default intent for a Kidscade implementation/improvement request is to complete
as much of **analysis -> plan -> implement -> real verification -> re-evaluation** as is
feasible in that one Chat turn. Do not stop at a plan if code tools and evidence permit
implementation. Do not ask whether to continue after every step. The existing **maximum
three evidence-driven iterations** and all cost, security, deployment, and PR restrictions
above still apply; this instruction does not authorize background work.

At the **start** of a game task:

1. Read the latest relevant code, this `AGENTS.md`,
   `docs/CHAT_AGENT_WORKFLOW.md`, and
   `docs/improvement-logs/README.md`.
2. Resolve the exact game ID from `data/games.json`. If
   `docs/improvement-logs/<game-id>.md` exists, read it before planning.
3. Carry forward the user's standing constraints and the log's **next starting point**.
   Verify previous claims against code/test evidence; never assume an old claimed test passed.
4. Treat a brainstorming-only request as **no code changes** unless requested otherwise.

At the **end** of an implementation task:

1. Create or update `docs/improvement-logs/<game-id>.md` using
   `docs/improvement-logs/TEMPLATE.md`; update its `INDEX.md` entry.
2. Record only work actually done: baseline, changed paths, each attempted iteration,
   exact tests/results, visual playthrough status, regressions, unresolved issues, next
   concrete step, branch, PR, and explicit merge/deploy status.
3. Never fabricate a browser playthrough, successful CI, or an earlier development history.
   Never write private student data or credentials to the log.
4. Include the updated log in the topic branch's PR. If tools cannot write GitHub,
   say so explicitly and provide the findings in the current response rather than
   falsely reporting persistence.

The copyable ChatGPT project-instruction text is at
`docs/CHATGPT_PROJECT_INSTRUCTIONS.md`. Its existence in GitHub does **not**
automatically update ChatGPT Project settings; the user must paste it in the Project UI.
