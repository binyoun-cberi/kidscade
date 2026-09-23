# Patience Tower realtime v2

All newly created 1:1 tower rooms use the TOWER_ROOMS Durable Object. New room codes begin with 1, which the
legacy room-code alphabet did not use, so routing stays unambiguous.

D1 is used only to verify the signed-in Kidscade student when creating or joining a room. The realtime match itself
does not read or write D1. The Durable Object owns the roster, shared seed, ready state, server start/end times,
final current heights and winner.

Player physics remain local. Each browser sends a small pose packet about eight times per second while visible and
about twice per second in a background tab. TowerRoom relays that packet directly to the opponent over WebSocket.
Pose packets are not committed to Durable Object storage on every update. Hibernation-safe WebSocket attachments
retain the latest height and pose; room storage is committed only on lifecycle events such as ready, disconnect and
finish.

The existing renderer already interpolates opponent target coordinates in setOpponentPose/updateDuelOpponent, so
the opponent remains visually smooth without sending packets at render-frame rate.

The three-minute clock is server authoritative. A Durable Object alarm finalizes the match at endAt, merges the
latest WebSocket attachments, compares currentHeight rather than bestHeight, persists the result and broadcasts the
final state. Explicitly leaving an active match awards the win to the remaining player. Closing or reloading the
browser does not automatically forfeit; the saved room-scoped token can reconnect.
