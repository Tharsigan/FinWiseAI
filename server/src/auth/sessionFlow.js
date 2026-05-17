import crypto from "crypto";

import * as repo from "../repos/authRepository.js";
import {
  attachSessionCookie,
  clearSessionCookie,
  readSessionCookie,
} from "./sessionCookie.js";
import { env } from "../config/env.js";
import { hashOpaqueToken, randomOpaqueToken } from "./tokens.js";

/** @typedef {{ id: string; email: string; password_hash: string }} AuthUserRecord */

/**
 * Starts a fresh session row and sends the opaque token cookie.
 * @param {import("express").Response} res
 * @param {string} userId
 */
export function establishSession(res, userId) {
  repo.deleteExpiredSessions();
  const sessionId = crypto.randomUUID();
  const token = randomOpaqueToken(32);
  const token_hash = hashOpaqueToken(token);
  const created = repo.nowMs();
  const ttl = env.auth.sessionTtlMs;
  const expires_at = created + ttl;
  repo.insertSession({
    id: sessionId,
    user_id: userId,
    token_hash,
    expires_at,
    created_at: created,
  });
  attachSessionCookie(res, token, ttl);
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {{ clearInvalidCookie?: boolean }} [options]
 * @returns {AuthUserRecord | null}
 */
export function resolveSessionUser(req, res, options = {}) {
  const clearInvalidCookie = options.clearInvalidCookie !== false;

  const tokenPlain = readSessionCookie(req);
  if (!tokenPlain) return null;

  const token_hash = hashOpaqueToken(tokenPlain);
  const sess = repo.findActiveSessionByTokenHash(token_hash);
  if (!sess) {
    if (clearInvalidCookie) clearSessionCookie(res);
    return null;
  }

  const user = repo.findUserById(sess.user_id);
  if (!user) {
    if (clearInvalidCookie) clearSessionCookie(res);
    return null;
  }

  return user;
}
