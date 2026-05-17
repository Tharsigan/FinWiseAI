import { getDb } from "../db/sqlite.js";

/** @typedef {{ user_id: string; first_name: string; last_name: string; mobile: string; district: string; institution_name: string; theme: string; avatar_path: string | null; updated_at: number }} ProfileRow */

/** @returns {ProfileRow | undefined} */
export function getProfile(userId) {
  const db = getDb();
  return /** @type {ProfileRow | undefined} */ (
    db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId)
  );
}

/**
 * Inserts defaults if missing; returns persisted row.
 * @returns {ProfileRow}
 */
export function ensureProfile(userId) {
  const existing = getProfile(userId);
  if (existing) return existing;
  const db = getDb();
  const t = Date.now();
  db.prepare(
    `INSERT INTO user_profiles (
       user_id, first_name, last_name, mobile, district, institution_name, theme,
       avatar_path, updated_at
     ) VALUES (@user_id, '', '', '', '', '', 'light', NULL, @updated_at)`,
  ).run({ user_id: userId, updated_at: t });

  const row = getProfile(userId);
  if (!row) throw new Error("PROFILE_INSERT_FAILED");
  return row;
}

/**
 * @param {Partial<Pick<ProfileRow, "first_name" | "last_name" | "mobile" | "district" | "institution_name" | "theme">>} patch
 */
export function patchProfile(userId, patch) {
  ensureProfile(userId);
  const db = getDb();
  const keys = [];
  /** @type {Record<string, string | number | null>} */
  const params = { user_id: userId, updated_at: Date.now() };

  if (patch.first_name !== undefined) {
    keys.push("first_name = @first_name");
    params.first_name = patch.first_name;
  }
  if (patch.last_name !== undefined) {
    keys.push("last_name = @last_name");
    params.last_name = patch.last_name;
  }
  if (patch.mobile !== undefined) {
    keys.push("mobile = @mobile");
    params.mobile = patch.mobile;
  }
  if (patch.district !== undefined) {
    keys.push("district = @district");
    params.district = patch.district;
  }
  if (patch.institution_name !== undefined) {
    keys.push("institution_name = @institution_name");
    params.institution_name = patch.institution_name;
  }
  if (patch.theme !== undefined) {
    keys.push("theme = @theme");
    params.theme = patch.theme;
  }

  if (keys.length === 0) {
    db.prepare(`UPDATE user_profiles SET updated_at = @updated_at WHERE user_id = @user_id`).run(params);
    return /** @type {ProfileRow} */ (getProfile(userId));
  }

  keys.push("updated_at = @updated_at");
  db.prepare(
    `UPDATE user_profiles SET ${keys.join(", ")} WHERE user_id = @user_id`,
  ).run(params);
  return /** @type {ProfileRow} */ (getProfile(userId));
}

/**
 * @returns {ProfileRow}
 */
export function setAvatarFilename(userId, filenameOrNull) {
  ensureProfile(userId);
  const db = getDb();
  db.prepare(
    `UPDATE user_profiles SET avatar_path = @avatar_path, updated_at = @updated_at WHERE user_id = @user_id`,
  ).run({
    user_id: userId,
    avatar_path: filenameOrNull,
    updated_at: Date.now(),
  });
  return /** @type {ProfileRow} */ (getProfile(userId));
}
