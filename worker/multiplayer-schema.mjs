const MULTIPLAYER_SCHEMA_STATEMENTS = Object.freeze([
  `CREATE TABLE IF NOT EXISTS multiplayer_rooms (
    id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL UNIQUE COLLATE NOCASE,
    game_id TEXT NOT NULL,
    created_by_student_id TEXT,
    seed INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    max_players INTEGER NOT NULL DEFAULT 2,
    duration_sec INTEGER NOT NULL DEFAULT 180,
    start_at TEXT,
    end_at TEXT,
    winner_student_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_multiplayer_rooms_code
    ON multiplayer_rooms (room_code)`,
  `CREATE INDEX IF NOT EXISTS idx_multiplayer_rooms_status_expiry
    ON multiplayer_rooms (status, expires_at)`,
  `CREATE TABLE IF NOT EXISTS multiplayer_room_players (
    room_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    slot INTEGER NOT NULL,
    nickname TEXT NOT NULL DEFAULT '새싹 게이머',
    ready INTEGER NOT NULL DEFAULT 0,
    current_value INTEGER NOT NULL DEFAULT 0,
    best_value INTEGER NOT NULL DEFAULT 0,
    state_json TEXT,
    finished_at TEXT,
    last_seen_at TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    PRIMARY KEY (room_id, student_id),
    UNIQUE (room_id, slot),
    FOREIGN KEY (room_id) REFERENCES multiplayer_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES student_accounts(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_multiplayer_players_student
    ON multiplayer_room_players (student_id, last_seen_at)`,
  `CREATE INDEX IF NOT EXISTS idx_multiplayer_players_room
    ON multiplayer_room_players (room_id, slot)`
]);

const MULTIPLAYER_SCHEMA_SQL = `${MULTIPLAYER_SCHEMA_STATEMENTS.join(';\n')};`;
const REQUIRED_TABLES = Object.freeze(['multiplayer_rooms', 'multiplayer_room_players']);
const schemaPromises = new WeakMap();

async function getExistingMultiplayerTables(db) {
  const result = await db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name IN ('multiplayer_rooms', 'multiplayer_room_players')
  `).all();
  return new Set((result?.results || []).map(row => String(row?.name || '')));
}

export async function ensureMultiplayerSchema(env) {
  const db = env?.DB;
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') {
    throw new Error('multiplayer-database-not-configured');
  }

  let pending = schemaPromises.get(db);
  if (!pending) {
    pending = (async () => {
      const existing = await getExistingMultiplayerTables(db);
      if (REQUIRED_TABLES.every(name => existing.has(name))) return;
      const statements = MULTIPLAYER_SCHEMA_STATEMENTS.map(sql => db.prepare(sql));
      await db.batch(statements);
    })().catch(error => {
      schemaPromises.delete(db);
      throw error;
    });
    schemaPromises.set(db, pending);
  }

  await pending;
}

export async function multiplayerDatabaseHealth(env) {
  await ensureMultiplayerSchema(env);
  await env.DB.batch([
    env.DB.prepare('SELECT 1 AS ok FROM multiplayer_rooms LIMIT 1'),
    env.DB.prepare('SELECT 1 AS ok FROM multiplayer_room_players LIMIT 1')
  ]);
  return { ok: true, database: 'ready' };
}

export { MULTIPLAYER_SCHEMA_SQL, MULTIPLAYER_SCHEMA_STATEMENTS };
