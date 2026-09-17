# Kidscade game records setup

Game-record leaderboards use the existing student account session and D1 database.

## Apply migration 0004

Run the SQL from `migrations/0004_game_records.sql` once against the `kidscade-stats` D1 database.

```sql
CREATE TABLE IF NOT EXISTS game_records (
  student_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'default',
  value INTEGER NOT NULL DEFAULT 0,
  details_json TEXT NOT NULL DEFAULT '{}',
  achieved_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, game_id, metric, mode),
  FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_records_leaderboard
  ON game_records (game_id, metric, mode, value DESC);

CREATE INDEX IF NOT EXISTS idx_game_records_student
  ON game_records (student_id, game_id);
```

No additional Worker Secret is required.

## Classroom War 3D v4

The first connected leaderboard is `교실전쟁 3D`.

- official metric: highest score
- scope: students in the same Kidscade class
- display: nickname only; login IDs are not exposed
- stored result details: survival time, defeated enemies, boss defeats, destroyed hazards, maximum army
- only a student's personal best is retained for the leaderboard
- guest/local play still keeps the game's existing local best score, but does not enter the class leaderboard

The Cloudflare build injects the record client into the built `교실전쟁 3D.html` so the large legacy game source remains untouched.
