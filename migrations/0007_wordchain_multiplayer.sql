CREATE TABLE IF NOT EXISTS wordchain_match_state (
  room_id TEXT PRIMARY KEY,
  current_word TEXT NOT NULL DEFAULT '',
  current_slot INTEGER,
  turn_no INTEGER NOT NULL DEFAULT 0,
  turn_deadline TEXT,
  history_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES multiplayer_rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wordchain_used_words (
  room_id TEXT NOT NULL,
  word TEXT NOT NULL,
  student_id TEXT,
  turn_no INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (room_id, word),
  FOREIGN KEY (room_id) REFERENCES multiplayer_rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wordchain_used_room_turn
  ON wordchain_used_words (room_id, turn_no);

CREATE TABLE IF NOT EXISTS wordchain_actions (
  room_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (room_id, action_id),
  FOREIGN KEY (room_id) REFERENCES multiplayer_rooms(id) ON DELETE CASCADE
);
