import { mockSavingsGoal } from "../data/mockData.js";
import { computeSavingsPlan } from "../lib/savingsMath.js";
import {
  budgetsWithUsage,
  normalizeTransactions,
  totalCreditsInMonth,
  totalDebitsInMonth,
} from "../lib/transactionAnalytics.js";

const LOW_BALANCE_DANGER_LKR = 5_000;
const LOW_BALANCE_WARNING_LKR = 10_000;
const MONTHLY_SPEND_WARNING_RATIO = 0.8;
const MONTHLY_SPEND_DANGER_RATIO = 1;
const BUDGET_WARNING_RATIO = 0.85;
const BUDGET_DANGER_RATIO = 1;
const LARGE_DEBIT_LKR = 12_000;

const SEVERITY_RANK = {
  danger: 3,
  warning: 2,
  info: 1,
};

const TYPE_RANK = {
  low_balance: 6,
  category_budget: 5,
  monthly_spend: 4,
  savings_goal: 3,
  large_debit: 2,
  positive: 1,
};

function formatLKR(value) {
  return `${Math.round(Number(value) || 0).toLocaleString("en-LK")} LKR`;
}

function inferMonthPrefix(rows, fallbackMonthPrefix) {
  if (fallbackMonthPrefix) return fallbackMonthPrefix;
  const latest = [...rows]
    .map((row) => String(row.dateISO || "").slice(0, 10))
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()
    .at(-1);
  return latest ? latest.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

function monthsUntil(targetDateISO) {
  const deadline = new Date(`${targetDateISO}T00:00:00`);
  if (Number.isNaN(deadline.getTime())) return 1;
  const diffMs = deadline.getTime() - Date.now();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)));
}

function makeAlert({
  id,
  type,
  severity,
  title,
  message,
  recommendation,
  metricLabel,
  metricValue,
  generatedAt,
}) {
  return {
    id,
    type,
    severity,
    title,
    message,
    recommendation,
    metricLabel,
    metricValue,
    generatedAt,
  };
}

/**
 * Rule-based Smart Alerts Engine for budget pacing, liquidity, and savings risk.
 * @param {{
 *   transactions: Array<Record<string, unknown>>;
 *   monthPrefix?: string;
 *   availableLKR: number;
 *   savingsGoal?: typeof mockSavingsGoal;
 *   plannedMonthlyIncome: number;
 *   maxAlerts?: number;
 *   generatedAt?: string;
 * }} input
 */
export function buildSmartAlerts(input) {
  const normalized = normalizeTransactions(input.transactions || []);
  const monthPrefix = inferMonthPrefix(normalized, input.monthPrefix);
  const savingsGoal = input.savingsGoal || mockSavingsGoal;
  const plannedMonthlyIncome = Math.max(Number(input.plannedMonthlyIncome) || 0, 0);
  const availableLKR = Number(input.availableLKR) || 0;
  const generatedAt = input.generatedAt || new Date().toISOString();

  const budgets = budgetsWithUsage(normalized, monthPrefix);
  const debitActivityThisMonth = totalDebitsInMonth(normalized, monthPrefix);
  const creditActivityThisMonth = totalCreditsInMonth(normalized, monthPrefix);
  const currentMonthRows = normalized.filter((row) =>
    String(row.dateISO || "").startsWith(monthPrefix),
  );
  const maxAlerts = Math.min(Math.max(Number(input.maxAlerts) || 6, 1), 8);
  const alerts = [];

  const push = (alert) => {
    if (!alerts.some((existing) => existing.id === alert.id)) alerts.push(alert);
  };

  if (availableLKR < LOW_BALANCE_DANGER_LKR) {
    push(
      makeAlert({
        id: "low-balance-danger",
        type: "low_balance",
        severity: "danger",
        title: "Balance is below the safety floor",
        message: `Available balance is ${formatLKR(
          availableLKR,
        )}, below the ${formatLKR(LOW_BALANCE_DANGER_LKR)} emergency threshold.`,
        recommendation:
          "Pause non-essential spending and keep enough cash for transport, meals, and rent before the next allowance.",
        metricLabel: "Available",
        metricValue: formatLKR(availableLKR),
        generatedAt,
      }),
    );
  } else if (availableLKR < LOW_BALANCE_WARNING_LKR) {
    push(
      makeAlert({
        id: "low-balance-warning",
        type: "low_balance",
        severity: "warning",
        title: "Balance is getting thin",
        message: `Available balance is ${formatLKR(
          availableLKR,
        )}, which leaves limited room for sudden student expenses.`,
        recommendation:
          "Keep the next few purchases essential-only until fresh income or allowance lands.",
        metricLabel: "Available",
        metricValue: formatLKR(availableLKR),
        generatedAt,
      }),
    );
  }

  for (const budget of budgets) {
    if (budget.ratio >= BUDGET_DANGER_RATIO) {
      push(
        makeAlert({
          id: `category-over-${budget.category}`,
          type: "category_budget",
          severity: "danger",
          title: `${budget.category} budget is over limit`,
          message: `${budget.category} has used ${Math.round(
            budget.ratio * 100,
          )}% of its ${formatLKR(budget.budget)} monthly envelope.`,
          recommendation:
            "Move this category into strict mode for the rest of the month and shift only essential spend here.",
          metricLabel: "Spent",
          metricValue: formatLKR(budget.spent),
          generatedAt,
        }),
      );
    } else if (budget.ratio >= BUDGET_WARNING_RATIO) {
      push(
        makeAlert({
          id: `category-near-${budget.category}`,
          type: "category_budget",
          severity: "warning",
          title: `${budget.category} is close to the limit`,
          message: `${budget.category} is already ${Math.round(
            budget.ratio * 100,
          )}% used with ${formatLKR(budget.remaining)} left.`,
          recommendation:
            "Plan the next few purchases in this category before spending, so the budget does not drift over 100%.",
          metricLabel: "Remaining",
          metricValue: formatLKR(budget.remaining),
          generatedAt,
        }),
      );
    }
  }

  const spendRatio =
    plannedMonthlyIncome > 0 ? debitActivityThisMonth / plannedMonthlyIncome : 0;
  if (spendRatio >= MONTHLY_SPEND_DANGER_RATIO) {
    push(
      makeAlert({
        id: "monthly-spend-over-income",
        type: "monthly_spend",
        severity: "danger",
        title: "Monthly spending has crossed planned income",
        message: `Debits for ${monthPrefix} are ${formatLKR(
          debitActivityThisMonth,
        )}, more than the planned ${formatLKR(plannedMonthlyIncome)} income.`,
        recommendation:
          "Review the top categories today and avoid new discretionary spending until the next income cycle.",
        metricLabel: "Spend ratio",
        metricValue: `${Math.round(spendRatio * 100)}%`,
        generatedAt,
      }),
    );
  } else if (spendRatio >= MONTHLY_SPEND_WARNING_RATIO) {
    push(
      makeAlert({
        id: "monthly-spend-near-income",
        type: "monthly_spend",
        severity: "warning",
        title: "Monthly spend is nearing income",
        message: `Debits have reached ${Math.round(
          spendRatio * 100,
        )}% of planned monthly income.`,
        recommendation:
          "Keep at least one week of allowance untouched so the month does not finish cash-negative.",
        metricLabel: "Debits",
        metricValue: formatLKR(debitActivityThisMonth),
        generatedAt,
      }),
    );
  }

  const savingsPlan = computeSavingsPlan({
    targetAmount: savingsGoal.targetAmount,
    currentSavings: savingsGoal.savedAmount,
    monthlyIncome: savingsGoal.monthlyIncome,
    monthlyExpenses: savingsGoal.monthlyExpensesSnapshot,
    monthsRemaining: monthsUntil(savingsGoal.targetDateISO),
  });

  if (savingsPlan.feasibility === "at_risk") {
    push(
      makeAlert({
        id: "savings-goal-at-risk",
        type: "savings_goal",
        severity: "warning",
        title: "Education savings pace is at risk",
        message: `The goal needs ${formatLKR(
          savingsPlan.requiredMonthlySavingLKR,
        )} per month, but the modeled cushion is ${formatLKR(
          savingsPlan.discretionaryMonthlyLKR,
        )}.`,
        recommendation:
          "Trim the highest flexible category or lower the goal timeline before the gap compounds.",
        metricLabel: "Monthly gap",
        metricValue: formatLKR(Math.abs(savingsPlan.discretionaryGapLKR)),
        generatedAt,
      }),
    );
  } else {
    push(
      makeAlert({
        id: "savings-goal-on-track",
        type: "savings_goal",
        severity: "info",
        title:
          savingsPlan.feasibility === "tight"
            ? "Education savings goal is tight"
            : "Education savings goal is on track",
        message: `Required monthly saving is ${formatLKR(
          savingsPlan.requiredMonthlySavingLKR,
        )} against a modeled cushion of ${formatLKR(
          savingsPlan.discretionaryMonthlyLKR,
        )}.`,
        recommendation:
          savingsPlan.feasibility === "tight"
            ? "Keep a weekly check-in on flexible categories to protect the goal."
            : "Keep the recurring savings transfer active and avoid dipping into the education fund.",
        metricLabel: "Required",
        metricValue: formatLKR(savingsPlan.requiredMonthlySavingLKR),
        generatedAt,
      }),
    );
  }

  const largestDebit = [...currentMonthRows]
    .filter((row) => Number(row.debit || 0) >= LARGE_DEBIT_LKR)
    .sort((a, b) => Number(b.debit || 0) - Number(a.debit || 0))[0];
  if (largestDebit) {
    push(
      makeAlert({
        id: `large-debit-${largestDebit.id}`,
        type: "large_debit",
        severity: "info",
        title: "Large debit spotted",
        message: `${largestDebit.description} posted at ${formatLKR(
          largestDebit.debit,
        )} on ${largestDebit.dateISO}.`,
        recommendation:
          "If this is recurring, add it to a fixed-expense bucket before planning daily spend.",
        metricLabel: largestDebit.category || "Debit",
        metricValue: formatLKR(largestDebit.debit),
        generatedAt,
      }),
    );
  }

  if (!alerts.some((alert) => alert.severity !== "info")) {
    push(
      makeAlert({
        id: "healthy-month",
        type: "positive",
        severity: "info",
        title: "No urgent spending risks detected",
        message:
          "FinWise did not find any budget, balance, or savings guardrail breaches in the current snapshot.",
        recommendation:
          "Keep checking this panel after new bank transactions land.",
        metricLabel: "Status",
        metricValue: "Healthy",
        generatedAt,
      }),
    );
  }

  alerts.sort((a, b) => {
    const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return (TYPE_RANK[b.type] || 0) - (TYPE_RANK[a.type] || 0);
  });

  const visibleAlerts = alerts.slice(0, maxAlerts);

  return {
    alerts: visibleAlerts,
    budgets,
    summary: {
      monthPrefix,
      generatedAt,
      availableLKR,
      debitActivityThisMonth,
      creditActivityThisMonth,
      plannedMonthlyIncome,
      spendRatio,
      totalAlerts: visibleAlerts.length,
      dangerCount: visibleAlerts.filter((alert) => alert.severity === "danger")
        .length,
      warningCount: visibleAlerts.filter((alert) => alert.severity === "warning")
        .length,
      infoCount: visibleAlerts.filter((alert) => alert.severity === "info").length,
      savingsPlan,
    },
  };
}
