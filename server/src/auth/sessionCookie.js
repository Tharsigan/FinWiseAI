import { env } from "../config/env.js";

/**
 * @param {import("express").Request} req
 * @returns {string | undefined}
 */
export function readSessionCookie(req) {
  const raw = req.cookies?.[env.auth.sessionCookieName];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}

/**
 * @param {import("express").Response} res
 * @param {string} plaintextToken
 * @param {number} maxAgeMs
 */
export function attachSessionCookie(res, plaintextToken, maxAgeMs) {
  const { sessionCookieName, cookieSecure } = env.auth;
  res.cookie(sessionCookieName, plaintextToken, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    maxAge: maxAgeMs,
    path: "/",
  });
}

/**
 * @param {import("express").Response} res
 */
export function clearSessionCookie(res) {
  const { sessionCookieName, cookieSecure } = env.auth;
  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: cookieSecure,
    sameSite: "lax",
    path: "/",
  });
}
