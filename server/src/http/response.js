import { API_PHASE, API_VERSION } from "../config/constants.js";

/**
 * Successful JSON envelope — stable across mock, bank stubs, and future live data.
 * @param {import('express').Response} res
 * @param {unknown} data
 * @param {{
 *   status?: number;
 *   source?: string;
 *   meta?: Record<string, unknown>;
 * }} [options]
 */
export function success(res, data, options = {}) {
  const { status = 200, source = "mock", meta = {} } = options;

  res.status(status).json({
    ok: true,
    apiVersion: API_VERSION,
    source,
    meta: {
      phase: API_PHASE,
      requestId: res.locals.requestId,
      ...meta,
    },
    data,
  });
}

/**
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [extra]
 */
export function failure(res, status, code, message, extra = {}) {
  res.status(status).json({
    ok: false,
    apiVersion: API_VERSION,
    meta: {
      phase: API_PHASE,
      requestId: res.locals.requestId,
    },
    code,
    message,
    ...extra,
  });
}
