/** @typedef {{ dateISO: string }} TxnLike */

const MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * Month key relative to an anchor (e.g. snapshot `monthPrefix`).
 * @param {string} anchorMonthKey `YYYY-MM`
 * @param {number} [offset=0] 0 = anchor, -1 = previous calendar month, +1 = next
 * @returns {string}
 */
export function getMonthKey(anchorMonthKey, offset = 0) {
  if (!MONTH_RE.test(anchorMonthKey)) return anchorMonthKey;
  const [y, m] = anchorMonthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}-${mm}`;
}

/**
 * Prior calendar month key.
 * @param {string} currentMonth `YYYY-MM`
 */
export function getPreviousMonth(currentMonth) {
  return getMonthKey(currentMonth, -1);
}

/**
 * Rows whose `dateISO` falls in the given `YYYY-MM` month.
 * @param {TxnLike[]} transactions
 * @param {string} month `YYYY-MM`
 */
export function filterByMonth(transactions, month) {
  const prefix = month;
  return transactions.filter((r) => String(r.dateISO || "").startsWith(prefix));
}
