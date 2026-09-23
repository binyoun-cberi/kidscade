# Wordchain realtime v2

## Default routing

All newly created online wordchain rooms request transport v2 and use the WORDCHAIN_ROOMS Durable Object binding.
The feature flag WORDCHAIN_LIVE_V2=true enables creation. New v2 room codes begin with 0, keeping routing
unambiguous. The old D1 engine remains only as a compatibility path for an old room code; new rooms do not use it.

## D1 usage

D1 is consulted once when a signed-in student creates or first joins a v2 room so the server can verify the
Kidscade account and nickname. After admission, the room issues a room-scoped bearer token. Ready/start/submit/
state/ticket/leave and WebSocket traffic are authorized by the Durable Object and do not query D1.

The main Worker routes v2 wordchain requests before the legacy multiplayer schema preflight. This is intentional:
an active v2 room must not consume D1 reads merely to prove that legacy multiplayer tables exist.

## Realtime authority

The Durable Object owns roster, ready state, lives, current word, turn number, used words, history, deadlines,
winner state and idempotency records. A storage alarm advances a timed-out turn without client polling. WebSockets
push committed state changes. Hibernation-compatible ping/pong is used so an idle room does not need a server timer.

Dictionary validation still reads the static wordchain assets through ASSETS. It does not use D1.

## Client recovery

The browser stores only the v2 room code and room-scoped token. On reload it requests one state snapshot and opens
a new single-use WebSocket ticket. Replacing the same player's socket closes the older socket. Existing legacy room
storage is still recognized only so a previously issued old room can finish safely.
