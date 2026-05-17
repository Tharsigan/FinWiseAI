import { getDb } from "../db/sqlite.js";

/** @typedef {{ id: string; email: string }} UserPublic */

/** @typedef {{ id: string; email: string; password_hash: string }} UserRecord */

/** @typedef {{ expires_at: number; user_id: string }} SessionLookup */

/** @typedef {{ user_id: string }} ResetRow */

/** @returns {number} */
export function nowMs() {
  return Date.now();
}

/** @returns {UserRecord | undefined} */
export function findUserByEmail(email) {
  const db = getDb();
  return /** @type {UserRecord | undefined} */ (
    db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email)
  );
}

/** @returns {UserRecord | undefined} */
export function findUserById(userId) {
  const db = getDb();
  return /** @type {UserRecord | undefined} */ (
    db
      .prepare("SELECT id, email, password_hash FROM users WHERE id = ?")
      .get(userId)
  );
}

/**
 * @param {{ id: string; email: string; password_hash: string; created_at: number }} row
 */
export function insertUser(row) {
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at)
     VALUES (@id, @email, @password_hash, @created_at)`,
  ).run(row);
}

/**
 * @param {{ id: string; user_id: string; token_hash: string; expires_at: number; created_at: number }} row
 */
export function insertSession(row) {
  const db = getDb();
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
     VALUES (@id, @user_id, @token_hash, @expires_at, @created_at)`,
  ).run(row);
}

/**
 * @returns {(SessionLookup & { token_hash?: string }) | undefined}
 */
export function findActiveSessionByTokenHash(tokenHash) {
  const db = getDb();
  const t = nowMs();
  return db
    .prepare(
      `SELECT user_id, expires_at FROM sessions
       WHERE token_hash = ? AND expires_at > ?`,
    )
    .get(tokenHash, t);
}

/**
 * @returns {boolean}
 */
export function deleteSessionByTokenHash(tokenHash) {
  const db = getDb();
  const r = db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  return r.changes > 0;
}

/**
 * @returns {void}
 */
export function deleteSessionsForUser(userId) {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

/**
 * @returns {void}
 */
export function updateUserPassword(userId, password_hash) {
  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    password_hash,
    userId,
  );
}

/**
 * @returns {void}
 */
export function updateUserEmail(userId, email) {
  const db = getDb();
  db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email, userId);
}

/**
 * @returns {void}
 */
export function deleteOutstandingResetTokensForUser(userId) {
  const db = getDb();
  db.prepare(
    `DELETE FROM password_reset_tokens
     WHERE user_id = ? AND used_at IS NULL`,
  ).run(userId);
}

/**
 * @param {{ id: string; user_id: string; token_hash: string; expires_at: number; created_at: number }} row
 */
export function insertResetToken(row) {
  const db = getDb();
  db.prepare(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES (@id, @user_id, @token_hash, @expires_at, @created_at)`,
  ).run(row);
}

/** @returns {ResetRow | undefined} */
export function findOutstandingResetRow(tokenHash) {
  const db = getDb();
  const t = nowMs();
  return db
    .prepare(
      `SELECT user_id FROM password_reset_tokens
       WHERE token_hash = ?
         AND expires_at > ?
         AND used_at IS NULL`,
    )
    .get(tokenHash, t);
}

/**
 * Marks all matching outstanding tokens consumed (normally one row).
 * @returns {boolean}
 */
export function consumeResetToken(tokenHash) {
  const db = getDb();
  const t = nowMs();
  const r = db
    .prepare(
      `UPDATE password_reset_tokens SET used_at = ?
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?`,
    )
    .run(t, tokenHash, t);
  return r.changes > 0;
}

/**
 * Periodic hygiene (optional lightweight cleanup).
 * @returns {void}
 */
export function deleteExpiredSessions() {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowMs());
}
