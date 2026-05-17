import argon2 from "argon2";

/**
 * @param {string} plain
 * @returns {Promise<string>}
 */
export async function hashPassword(plain) {
  return argon2.hash(plain, { type: argon2.argon2id });
}

/**
 * @param {string} hashed
 * @param {string} plain
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(hashed, plain) {
  try {
    return await argon2.verify(hashed, plain);
  } catch {
    return false;
  }
}
