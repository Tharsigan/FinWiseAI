import {
  mockCategoryBudgets,
  MOCK_LEDGER_BEFORE_MONTH_LKR,
  mockPlannedMonthlyIncome,
} from "../data/mockData.js";

/** @typedef {{ id:string, dateISO:string, description:string, category:string, debit?:number, credit?:number }} MockTxn */

/** @returns {MockTxn[]} */
export function normalizeTransactions(rows) {
  return rows.map((t) => {
    const debit = Number(t.debit || 0);
    const credit = Number(t.credit || 0);
    return { ...t, debit, credit };
  });
}

/**
 * Spending by category within the scoped month (`YYYY-MM`).
 * Credits are income inflows, so they do not reduce expense budget usage.
 */
export function spendByCategoryInMonth(normalizedRows, monthPrefix) {
  const map = new Map();
  for (const row of normalizedRows) {
    if (!row.dateISO.startsWith(monthPrefix)) continue;
    const debit = Number(row.debit || 0);
    if (debit <= 0) continue;
    map.set(row.category, (map.get(row.category) || 0) + debit);
  }
  return map;
}

export function totalDebitsInMonth(normalizedRows, monthPrefix) {
  return normalizedRows
    .filter((r) => r.dateISO.startsWith(monthPrefix))
    .reduce((sum, r) => sum + Number(r.debit || 0), 0);
}

export function totalCreditsInMonth(normalizedRows, monthPrefix) {
  return normalizedRows
    .filter((r) => r.dateISO.startsWith(monthPrefix))
    .reduce((sum, r) => sum + Number(r.credit || 0), 0);
}

export function budgetsWithUsage(normalizedRows, monthPrefix) {
  const spend = spendByCategoryInMonth(normalizedRows, monthPrefix);
  return mockCategoryBudgets.map((b) => {
    const used = Number(spend.get(b.category) || 0);
    const ratio = b.budget > 0 ? used / b.budget : 0;
    return {
      ...b,
      spent: used,
      ratio,
      remaining: Math.max(b.budget - used, 0),
    };
  });
}

/** Current month net cashflow (planned income − debits). Credits not added to income to keep demo simple. */
export function projectedMonthCashflow(normalizedRows, monthPrefix) {
  const debits = totalDebitsInMonth(normalizedRows, monthPrefix);
  return mockPlannedMonthlyIncome - debits;
}

export function ledgerAvailableAfterMonth(
  normalizedRows,
  monthPrefix,
  openingGuess = MOCK_LEDGER_BEFORE_MONTH_LKR,
) {
  const openingNumber = Number(openingGuess);
  const netCredits = totalCreditsInMonth(normalizedRows, monthPrefix);
  const debits = totalDebitsInMonth(normalizedRows, monthPrefix);
  return openingNumber + netCredits - debits;
}
