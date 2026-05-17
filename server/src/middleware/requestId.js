import crypto from "node:crypto";

/** @type {import('express').RequestHandler} */
export function requestIdMiddleware(req, res, next) {
  const incoming = req.get("x-request-id");
  res.locals.requestId =
    incoming && /^[a-zA-Z0-9-]{8,128}$/.test(incoming.trim())
      ? incoming.trim()
      : crypto.randomUUID();
  res.setHeader("x-request-id", res.locals.requestId);
  next();
}
