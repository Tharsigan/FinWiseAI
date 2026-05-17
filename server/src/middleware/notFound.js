import { failure } from "../http/response.js";

/** @type {import('express').RequestHandler} */
export function notFoundHandler(req, res) {
  failure(res, 404, "NOT_FOUND", `Unknown route ${req.method} ${req.path}`);
}
