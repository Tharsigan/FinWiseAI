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
} from "../lib/transactionAnalytics.js";
import { getDemoTransactions } from "./demoLedgerService.js";
import { buildSmartAlerts } from "./smartAlertsService.js";

export function buildDashboardSnapshot() {
  const normalized = normalizeTransactions([
    ...getDemoTransactions(),
    ...mockTransactions,
  ]);
  const monthPrefix = mockCurrentMonth;
  const budgets = budgetsWithUsage(normalized, monthPrefix);

  const availableLKR = ledgerAvailableAfterMonth(
    normalized,
    monthPrefix,
    MOCK_LEDGER_BEFORE_MONTH_LKR,
  );

  const cashflowEstimate = projectedMonthCashflow(normalized, monthPrefix);
  const debitActivityThisMonth = totalDebitsInMonth(normalized, monthPrefix);

  const alertResult = buildSmartAlerts({
    transactions: normalized,
    monthPrefix,
    availableLKR,
    savingsGoal: mockSavingsGoal,
    plannedMonthlyIncome: mockPlannedMonthlyIncome,
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
    alerts: alertResult.alerts,
    alertSummary: alertResult.summary,
    alertSource: "fallback_mock",
    profile: mockProfile,
    account: mockAccount,
  };
}
