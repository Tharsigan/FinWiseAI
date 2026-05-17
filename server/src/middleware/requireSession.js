import { resolveSessionUser } from "../auth/sessionFlow.js";
import { failure } from "../http/response.js";

/**
 * Loads `req.authUser = { id, email }`, or responds 401.
 * @type {import("express").RequestHandler}
 */
export function requireSession(req, res, next) {
  const user = resolveSessionUser(req, res, { clearInvalidCookie: true });
  if (!user) {
    failure(res, 401, "UNAUTHORIZED", "Not signed in.");
    return;
  }
  req.authUser = { id: user.id, email: user.email };
  next();
}
