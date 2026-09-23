# History quiz realtime v2 (phase 2, first game)

## Scope and routing

History only. Wordchain and Tower retain phase-1 transport. Solo history stays local.
New UI requests v2 rooms. HISTORY_LIVE_V2=true and HISTORY_LIVE_V2_PERCENT=10 admit
approximately 10% of new rooms to the pilot. Other new rooms and all old rooms retain
the legacy D1 engine. A v2 code begins with 0, which legacy code generation excludes.
Existing v2 codes ALWAYS route to their Durable Object, even after disabling new v2
creation. Never switch a running room's authority or remove the binding for rollback.

## Deployment

Use the existing `npm run deploy:cloudflare` workflow: it builds assets, applies D1
migrations (including 0010_history_live_v2_results.sql), then deploys the Worker.
Wrangler applies the SQLite Durable Object class migration history-room-v1. Keep its
migration tag in subsequent deployments. GitHub Pages publication alone does NOT
deploy the Worker or its D1/DO bindings. A supported Cloudflare account and deployment
credentials are required; no claim is made that a repository commit deploys production.

Bindings: HISTORY_ROOMS, DB; rate limit bindings HISTORY_CREATE_LIMIT (20/minute),
HISTORY_REQUEST_LIMIT (120/minute per token), HISTORY_ANON_LIMIT (600/minute per shared
IP). Rate-limit namespace IDs 9232601–9232603 use hashed identity keys (no raw bearer
tokens in keys/logs). Verify these namespaces do not conflict with existing account
configuration. Limits are per Cloudflare location, not a global billing cap.

## Authority, persistence and privacy

HTTP mutations and WebSocket events use a serialized per-room command queue. Room
state and the next alarm commit atomically; acknowledgements follow the commit.
Immutable question contents are pinned separately once per round, not rewritten for
each answer. Answers/scores are updated in one state transaction. Current question
answers deduplicate by participant; stale round/question requests fail closed. Host
commands carry requestId, roundId and expected version. The last 256 host command IDs
are retained, with version validation preventing older commands from executing again.

Gameplay state is in DO storage; D1 stores only final round summaries, uniquely keyed
by room UUID + round UUID. Export uses an outbox with six bounded attempts. Failed
exports stay in DO storage; new rounds are blocked if eight results are pending.
POST /api/history-live/retry-results with code and host bearer token explicitly retries
the retained outbox, including for a closed room. Successful or abandoned empty rooms
expire after six hours; failed exports are retained for operator recovery, not silently
deleted. Retention is not an automatic deletion policy for final D1 summaries.

Question-phase views expose scores from BEFORE the question and never expose current
correctness/points. The HTTP answer acknowledgement also excludes correctness, even
on duplicate requests. Teacher-only progress pushes avoid N-by-N answer broadcasts.
The shared public practice question bank remains public; this is not an exam secrecy
system. Nickname/playerId alone cannot reclaim an existing identity. Lost bearer tokens
cannot be recovered automatically; instructor-mediated recovery UI is not yet shipped.
Joining new participants is limited to the waiting phase. Existing participants can
reconnect at any phase with their saved token. This prevents last-second roster changes
from changing the current question's all-answered condition.

## Transport and lifecycle

Commands use authenticated HTTP. WebSocket pushes replace regular state polling when
connected. A 60-second single-use ticket authorizes the upgrade; long-lived bearer
tokens never enter WebSocket URLs. Origin is checked. Tickets are capped at one per
identity; sockets at one per identity. Replacing a socket stops the old UI, but bearer
tokens still authorize HTTP requests: this is not a separate-device identity lock.
`acceptWebSocket`, serialized attachments, and automatic ping/pong permit hibernation.
There is no server interval. One durable alarm covers question deadline, result-export
retry and room expiry. Its handler is safe under duplicate delivery. HTTP fallback uses
the SAME room, not legacy D1 state. UI timers derive from the server deadline.

## Validation and rollout gate

Run `node --test tests/history-live.test.mjs tests/history-room.test.mjs tests/history-realtime-client.test.mjs`.
Optional real workerd/SQLite/D1/WebSocket smoke test:
`npm install --no-save miniflare@4 esbuild` then
`node --test tests/history-room-runtime.test.mjs`.
An isolated dependency directory can be supplied with HISTORY_TEST_DEPS. The installed
v4 test runtime defaults to compatibility date 2026-08-06; HISTORY_TEST_DATE overrides
it for newer binaries. Production config retains its existing date 2026-09-15. Full
browser/device testing and production deployment verification remain deployment gates.

The runtime test exercises ticket replay rejection, teacher-only progress, 26-player
concurrent submission, five questions, round rollover and one final D1 result. Mock
storage tests cover commit failure and restart, stale answers and duplicate alarms.
Client transport tests cover initial snapshot readiness, ping, retry and tab replacement.

Before increasing pilot percentage, compare identical 26-player/40-question sessions:
Worker requests/CPU, D1 reads/writes, DO input messages, DO active duration, DO storage
reads/writes, command latency, disconnect rate and missing/duplicate submissions. Record
measured cost, not just HTTP request reduction. Increase 10 -> 50 -> 100 only after no
lost acknowledged answers, no duplicate scoring, acceptable latency, and reduced total
resource usage. On regression set HISTORY_LIVE_V2=false for NEW rooms; preserve bindings
and class implementation so already-running v2 rooms finish normally.
