import { mockCategoryBudgets, mockSavingsGoal } from "../data/mockData.js";
import { budgetsWithUsage } from "./transactionAnalytics.js";

const LOW_BALANCE_GUARD = 6000;

/**
 * Lightweight rule-based alerts for demo UI — replace with `/api/alerts` later.
 * @returns {{ id:string, severity:'info'|'warning'|'danger', title:string, message:string }[]}
 */
export function deriveMockAlerts(
  normalizedRows,
  monthPrefix,
  /** @type {{ availableLKR:number }} */
  snapshot,
) {
  const budgets = budgetsWithUsage(normalizedRows, monthPrefix);
  const alerts = [];

  const push = (
    /** @type {{ id:string, severity:'info'|'warning'|'danger', title:string, message:string }} */
    alert,
  ) => {
    if (!alerts.some((existing) => existing.id === alert.id)) alerts.push(alert);
  };

  /** @type {(s:'info'|'warning'|'danger')=>number} */
  const score = (s) => ({ info: 0, warning: 1, danger: 2 }[s]);

  for (const b of budgets) {
    const template = mockCategoryBudgets.find((x) => x.category === b.category);
    const label = template?.category ?? b.category;
    if (b.ratio >= 1)
      push({
        id: `budget-over-${label}`,
        severity: "danger",
        title: `${label} blew past budget`,
        message: `${label} is roughly ${Math.round(b.ratio * 100)}% used — carve out more next month.`,
      });
    else if (b.ratio >= 0.85)
      push({
        id: `budget-near-${label}`,
        severity: "warning",
        title: `${label} is nearing the limit`,
        message: `${Math.round(b.ratio * 100)}% of this month's ${label} budget is consumed.`,
      });
  }

  const goalGap =
    mockSavingsGoal.targetAmount - mockSavingsGoal.savedAmount;
  const discretionaryBuffer =
    mockSavingsGoal.monthlyIncome - mockSavingsGoal.monthlyExpensesSnapshot;

  push({
    id: "savings-pace",
    severity: discretionaryBuffer >= 9500 ? "info" : "warning",
    title:
      discretionaryBuffer >= 9500
        ? "Education fund is ticking upward"
        : "Tighter cushion for postgraduate goal",
    message:
      discretionaryBuffer >= 9500
        ? `Roughly ${Math.max(
            discretionaryBuffer - 8000,
            1200,
          ).toLocaleString(
            "en-LK",
          )} LKR could still pivot into savings monthly. Roughly ${goalGap.toLocaleString(
            "en-LK",
          )} LKR left to reach your postgraduate target from current savings of ${mockSavingsGoal.savedAmount.toLocaleString(
            "en-LK",
          )} LKR.`
        : `Current estimate leaves ${discretionaryBuffer.toLocaleString(
            "en-LK",
          )} LKR after modeled expenses — consider trimming entertainment or consolidating transport.`,
  });

  if (snapshot.availableLKR < LOW_BALANCE_GUARD)
    push({
      id: "low-balance",
      severity: "danger",
      title: "Low float for bills",
      message: `Headline balance is roughly ${snapshot.availableLKR.toLocaleString(
        "en-LK",
      )} LKR — refill before rent or transport spikes.`,
    });

  alerts.sort((a, b) => score(b.severity) - score(a.severity));

  return alerts.slice(0, 5);
}
