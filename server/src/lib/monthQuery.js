import { HttpError } from "../http/errors.js";

/** @param {string | undefined} raw */
export function parseMonthOrDefault(raw, fallback) {
  if (raw === undefined) return fallback;
  if (typeof raw !== "string" || !/^\d{4}-\d{2}$/.test(raw)) {
    throw new HttpError(
      400,
      "INVALID_MONTH",
      "Query `month` must look like YYYY-MM (e.g. 2026-05).",
    );
  }
  return raw;
}
