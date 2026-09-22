CREATE TABLE IF NOT EXISTS history_live_rooms (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  question_order_json TEXT NOT NULL,
  current_question INTEGER NOT NULL DEFAULT -1,
  question_count INTEGER NOT NULL DEFAULT 15,
  seconds_per_question INTEGER NOT NULL DEFAULT 12,
  question_started_at TEXT,
  question_deadline_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS history_live_players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  joined_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY(room_id) REFERENCES history_live_rooms(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_live_players_room ON history_live_players(room_id);

CREATE TABLE IF NOT EXISTS history_live_answers (
  room_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  option_index INTEGER NOT NULL,
  answered_at TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(room_id, player_id, question_index),
  FOREIGN KEY(room_id) REFERENCES history_live_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY(player_id) REFERENCES history_live_players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_live_answers_room_q ON history_live_answers(room_id, question_index);
