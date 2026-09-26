-- Compatibility migration.
-- Production already received state_json before D1 migration tracking was enabled.
-- Fresh databases get the column from 0005_multiplayer_rooms.sql.
SELECT 1;
