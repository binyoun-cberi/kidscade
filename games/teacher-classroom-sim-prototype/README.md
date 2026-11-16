# 우리 반 — 담임교사 시뮬레이터

`index.html` loads `school-day-game.js`; `game.js` is a legacy prototype, not the active entry point.

## v77: classroom continuity and care HUD

- Day-end saves include friendships, unresolved relationships, learned focus capacity, trust, and the last five care notes per student. New-day actors restore learned capacity; transient focus and daily health still reset.
- New campaigns fix personal grade goals at enrollment. Existing v2 saves keep previously assigned goals and grades. Missing care/subject fields migrate without erasing progress.
- `subjectMastery` records learning in each of the six subjects. The existing aggregate mastery still determines campaign exam grades.
- `student-care.mjs` contains observation wording, care outcomes, daily briefings, memory normalization, and attention priority. Briefings are guidance; the underlying six-period timetable remains the same.
- Nearby questions and focus interventions open a paused choice dialog. Encouragement, hints, and examples have different focus/learning outcomes. The dialog supports Escape, keyboard focus trapping, and focus restoration.
- The HUD separates lesson progress, the attention queue, roster, and observation records. SDK menu controls share pause/mute state with the game.

## Verification

```sh
node --test tests/teacher-classroom-v73.test.mjs tests/teacher-classroom-v74.test.mjs tests/teacher-classroom-v76-sound.test.mjs tests/teacher-classroom-v77.test.mjs
node tests/teacher-classroom-v77-browser.cjs
```

The browser check requires Playwright and Chrome (optionally set `CHROME_EXECUTABLE`), starts a local static server, and uses the real character models. It checks five viewport sizes, care pause/resume, SDK controls, and next-day restoration. Browser-only instrumentation is injected by the test and is not exposed by the shipped game. Software-rendered QA reduces 3D resolution and shadows; it is not a GPU performance benchmark.
