CREATE TABLE IF NOT EXISTS wordchain_turn_claims (
  room_id TEXT NOT NULL,
  turn_no INTEGER NOT NULL,
  student_id TEXT,
  action_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (room_id, turn_no),
  FOREIGN KEY (room_id) REFERENCES multiplayer_rooms(id) ON DELETE CASCADE
);
