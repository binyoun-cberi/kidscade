# History quiz realtime v2

## Scope and routing

History LIVE now uses a single realtime authority: the `HistoryQuizRoom` Durable Object.
New rooms are always created in the v2 namespace (`0xxxxx`). The percentage pilot flags
and the legacy D1 room fallback are removed from the production route. Old non-v2 room
codes are treated as expired/not found rather than reviving the polling engine.

Solo history stays local. The public question bank remains a static asset.

## Deployment

Use `npm run deploy:cloudflare`: build assets, apply D1 migrations, then deploy the
Worker. Wrangler applies both Durable Object migration history and the D1 result-summary
migration. GitHub Pages publication alone does not deploy Worker/D1/DO changes.

Bindings: `HISTORY_ROOMS`, `DB`; rate limit bindings
`HISTORY_CREATE_LIMIT`, `HISTORY_REQUEST_LIMIT`, `HISTORY_ANON_LIMIT`.

## Authority, persistence and privacy

HTTP mutations and WebSocket events use one serialized command stream per room. Room
state and alarms commit before acknowledgements. Question contents are pinned once per
round. Player answers deduplicate by participant and round/question identity. Host
commands are request-id/version guarded.

Gameplay state lives in Durable Object storage. D1 is no longer polled for room state;
it receives only final round summaries through the bounded result outbox. Failed result
exports remain recoverable from the Durable Object and can be retried explicitly.

Question-phase views do not expose current correctness or awarded points. WebSocket
progress pushes for current answers are teacher-only. Joining new players is restricted
to the waiting phase, while saved bearer tokens can reconnect existing participants.

## Transport and lifecycle

WebSocket pushes replace regular state polling. A 60-second single-use ticket authorizes
the upgrade so the long-lived bearer token never appears in a WebSocket URL. Origin is
checked, one socket per identity is kept, and Cloudflare WebSocket hibernation is used.
There is no server interval. Durable alarms handle question deadlines, result retries
and expiry. HTTP fallback always addresses the same Durable Object room.

## Validation

Run:

`node --test tests/history-live.test.mjs tests/history-room.test.mjs tests/history-realtime-client.test.mjs`

Optional workerd/SQLite/D1/WebSocket smoke test:

`node --test tests/history-room-runtime.test.mjs`

Before raising classroom load, compare Worker requests/CPU, D1 rows read/written, DO
messages/storage, latency, disconnects, and missing/duplicate submissions. Because the
cutover is now complete, rollback means deploying a previous Worker version while
preserving the Durable Object binding/class long enough for any already-running v2 room
to finish.
