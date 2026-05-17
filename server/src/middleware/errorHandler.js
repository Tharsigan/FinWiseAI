import { API_PHASE, API_VERSION } from "../config/constants.js";
import { HttpError } from "../http/errors.js";

/** @type {import('express').ErrorRequestHandler} */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    res.status(err.status).json({
      ok: false,
      apiVersion: API_VERSION,
      meta: {
        phase: API_PHASE,
        requestId: res.locals.requestId,
      },
      code: err.code,
      message: err.message,
    });
    return;
  }

  console.error("[finwise-api]", err);
  res.status(500).json({
    ok: false,
    apiVersion: API_VERSION,
    meta: {
      phase: API_PHASE,
      requestId: res.locals.requestId,
    },
    code: "INTERNAL_ERROR",
    message: "Something went wrong on the API surface.",
  });
}
