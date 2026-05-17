import { filterByMonth, getMonthKey } from "../lib/dateUtils.js";

/**
 * Timeline-style copy for UI (read-only, snapshot-backed).
 * @param {ReturnType<import("./intelligenceContext.js").buildIntelligenceContext>} ctx
 */
export function buildFinancialNarrative(ctx) {
  const { snap } = ctx;
  const month = snap.monthPrefix;
  const rows = snap.normalized;
  const inMonth = filterByMonth(rows, month);

  /** @type {string[]} */
  const lines = [];

  const w1 = filterByDateRangeInMonth(inMonth, 1, 10);
  const w2 = filterByDateRangeInMonth(inMonth, 11, 17);
  const w3 = filterByDateRangeInMonth(inMonth, 18, 31);

  const t1 = debitSumByCategory(w1, "Transport");
  const t2 = debitSumByCategory(w2, "Transport");
  const t3 = debitSumByCategory(w3, "Transport");
  if (t1 > 0 || t2 > 0 || t3 > 0) {
    if (t3 < t1 * 0.85 && t1 > 500) {
      lines.push("Transport spending decreased this week");
    } else if (t3 > t1 * 1.2 && t1 > 0) {
      lines.push("Transport spending increased later in the month");
    }
  }

  const foodEarly = debitSumByCategory(
    filterByDateRangeInMonth(inMonth, 1, 15),
    "Food",
  );
  const foodLate = debitSumByCategory(
    filterByDateRangeInMonth(inMonth, 16, 31),
    "Food",
  );
  if (foodLate > foodEarly * 1.25 && foodEarly > 0) {
    lines.push("Food spending spiked mid-month");
  }

  const savingsRows = inMonth.filter((r) => r.category === "Savings");
  const sweeps = savingsRows.length;
  if (sweeps >= 2) {
    lines.push("Savings consistency improved");
  }

  const prevMonth = getMonthKey(month, -1);
  const prevSavings = debitSumByCategory(
    filterByMonth(rows, prevMonth),
    "Savings",
  );
  const curSavings = debitSumByCategory(inMonth, "Savings");
  if (curSavings > prevSavings * 1.05 && prevSavings > 0) {
    lines.push("You directed more toward savings than the prior month");
  }

  if (lines.length === 0) {
    lines.push("Spending patterns look steady for the current demo month");
  }

  return { lines };
}

/**
 * @param {{ dateISO: string }[]} rows
 * @param {number} startDay
 * @param {number} endDay
 */
function filterByDateRangeInMonth(rows, startDay, endDay) {
  return rows.filter((r) => {
    const day = Number(String(r.dateISO || "").slice(8, 10));
    return day >= startDay && day <= endDay;
  });
}

/**
 * @param {{ category: string, debit?: number }[]} rows
 * @param {string} category
 */
function debitSumByCategory(rows, category) {
  return rows
    .filter((r) => r.category === category)
    .reduce((s, r) => s + Number(r.debit || 0), 0);
}
