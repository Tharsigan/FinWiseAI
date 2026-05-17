import { deriveMockAlerts } from "./mockAlerts.js";
import {
  MOCK_LEDGER_BEFORE_MONTH_LKR,
  mockAccount,
  mockCurrentMonth,
  mockPlannedMonthlyIncome,
  mockProfile,
  mockSavingsGoal,
  mockTransactions,
} from "../data/mockData.js";
import {
  budgetsWithUsage,
  ledgerAvailableAfterMonth,
  normalizeTransactions,
  projectedMonthCashflow,
  totalDebitsInMonth,
} from "./transactionAnalytics.js";

export function getPhaseTwoSnapshot() {
  const normalized = normalizeTransactions(mockTransactions);
  const monthPrefix = mockCurrentMonth;
  const budgets = budgetsWithUsage(normalized, monthPrefix);

  const availableLKR = ledgerAvailableAfterMonth(
    normalized,
    monthPrefix,
    MOCK_LEDGER_BEFORE_MONTH_LKR,
  );

  const cashflowEstimate = projectedMonthCashflow(normalized, monthPrefix);
  const debitActivityThisMonth = totalDebitsInMonth(normalized, monthPrefix);

  const alerts = deriveMockAlerts(normalized, monthPrefix, {
    availableLKR,
  });

  return {
    normalized,
    monthPrefix,
    budgets,
    availableLKR,
    cashflowEstimate,
    debitActivityThisMonth,
    plannedMonthlyIncome: mockPlannedMonthlyIncome,
    savingsGoal: mockSavingsGoal,
    ledgerOpening: MOCK_LEDGER_BEFORE_MONTH_LKR,
    alerts,
    profile: mockProfile,
    account: mockAccount,
  };
}
