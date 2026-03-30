const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "signals.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS signals (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    symbol TEXT NOT NULL,
    action TEXT NOT NULL,
    confidence REAL,
    source TEXT,
    event_name TEXT,
    event_type TEXT,
    title TEXT,
    description TEXT,
    payload TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp DESC)
`);

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO signals (id, timestamp, symbol, action, confidence, source, event_name, event_type, title, description, payload)
  VALUES (@id, @timestamp, @symbol, @action, @confidence, @source, @eventName, @eventType, @title, @description, @payload)
`);

function insertSignal(signal) {
  insertStmt.run({
    ...signal,
    payload: JSON.stringify(signal.payload),
  });
}

const selectPageStmt = db.prepare(
  `SELECT * FROM signals ORDER BY timestamp DESC LIMIT ? OFFSET ?`
);

function getSignals(limit = 50, offset = 0) {
  const rows = selectPageStmt.all(limit, offset);
  return rows.map((row) => ({
    ...row,
    eventName: row.event_name,
    eventType: row.event_type,
    confidence: row.confidence,
    payload: JSON.parse(row.payload),
  }));
}

const countStmt = db.prepare(`SELECT COUNT(*) as count FROM signals`);
function getCount() {
  return countStmt.get().count;
}

module.exports = { insertSignal, getSignals, getCount, db };
