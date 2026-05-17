import crypto from "crypto";

/**
 * SHA-256 hash of opaque token (hex-encoded for storage/comparison).
 * @param {string} plaintextToken
 * @returns {string}
 */
export function hashOpaqueToken(plaintextToken) {
  return crypto
    .createHash("sha256")
    .update(plaintextToken, "utf8")
    .digest("hex");
}

/**
 * Cryptographically secure random hex string suitable for URLs.
 * @param {number} [byteLen=32]
 * @returns {string}
 */
export function randomOpaqueToken(byteLen = 32) {
  return crypto.randomBytes(byteLen).toString("hex");
}
