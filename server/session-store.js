import session from "express-session";
import { pool } from "./db.js";

export default class MySQLSessionStore extends session.Store {
  constructor() {
    super();
    this.cleanupTimer = setInterval(() => {
      pool.execute("DELETE FROM sessions WHERE expires <= ?", [Date.now()])
        .catch((error) => console.error("No se pudieron limpiar las sesiones expiradas.", error));
    }, 15 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  static async initialize() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) NOT NULL,
        expires BIGINT UNSIGNED NOT NULL,
        data MEDIUMTEXT NOT NULL,
        PRIMARY KEY (session_id),
        KEY idx_sessions_expires (expires)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  get(sessionId, callback) {
    pool.execute("SELECT expires, data FROM sessions WHERE session_id = ? LIMIT 1", [sessionId])
      .then(async ([rows]) => {
        const row = rows[0];
        if (!row) return callback(null, null);
        if (Number(row.expires) <= Date.now()) {
          await pool.execute("DELETE FROM sessions WHERE session_id = ?", [sessionId]);
          callback(null, null);
          return;
        }
        callback(null, JSON.parse(row.data));
      })
      .catch(callback);
  }

  set(sessionId, sessionData, callback = () => {}) {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + Number(sessionData.cookie?.maxAge || 8 * 60 * 60 * 1000);
    pool.execute(
      `INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
      [sessionId, expires, JSON.stringify(sessionData)]
    ).then(() => callback(null)).catch(callback);
  }

  touch(sessionId, sessionData, callback = () => {}) {
    const expires = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + Number(sessionData.cookie?.maxAge || 8 * 60 * 60 * 1000);
    pool.execute("UPDATE sessions SET expires = ? WHERE session_id = ?", [expires, sessionId])
      .then(() => callback(null))
      .catch(callback);
  }

  destroy(sessionId, callback = () => {}) {
    pool.execute("DELETE FROM sessions WHERE session_id = ?", [sessionId])
      .then(() => callback(null))
      .catch(callback);
  }

  close() {
    clearInterval(this.cleanupTimer);
  }
}
