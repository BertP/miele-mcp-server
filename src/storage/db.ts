import sqlite3 from 'sqlite3';
import { config } from '../config';
import { Logger } from '../utils/logger';

const db = new sqlite3.Database(config.DATABASE_PATH, (err) => {
  if (err) {
    Logger.error('Failed to open SQLite database', { error: err.message });
  } else {
    Logger.info(`✅ Connected to SQLite database at ${config.DATABASE_PATH}`);
  }
});

// Initialize database schema
const initDb = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS tokens (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS oauth_states (
        state TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        consumed_at INTEGER
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS operation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        allowed INTEGER NOT NULL,
        executed INTEGER NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL
      )
    `);
  });
};

initDb();

export { db };
