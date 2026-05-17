import { filterByMonth } from "../lib/dateUtils.js";
import { totalDebitsInMonth } from "../lib/transactionAnalytics.js";

const SEVERITY_WEIGHT = { danger: 0, warning: 0.4, info: 0.7 };

/** @param {ReturnType<import("./intelligenceContext.js").buildIntelligenceContext>} ctx */
export function buildFinancialHealthScore(ctx) {
  const { snap } = ctx;
  const month = snap.monthPrefix;
  const rowsMonth = filterByMonth(snap.normalized, month);

  const planned = Number(snap.plannedMonthlyIncome || 0);
  const debits = totalDebitsInMonth(snap.normalized, month);
  const savingsDebits = rowsMonth
    .filter((r) => r.category === "Savings")
    .reduce((s, r) => s + Number(r.debit || 0), 0);
  const savingsRateScore = planned > 0 ? clamp01(savingsDebits / planned) : 0.5;

  const debitRatio = planned > 0 ? debits / planned : 1;
  const spendingControl = clamp01(1 - Math.max(0, debitRatio - 0.85) / 0.5);

  let alertPenalties = 0;
  let alertCount = 0;
  for (const a of snap.alerts || []) {
    const sev = a.severity;
    if (sev && SEVERITY_WEIGHT[sev] !== undefined) {
      alertPenalties += 1 - SEVERITY_WEIGHT[sev];
      alertCount += 1;
    }
  }
  const alertsImpact =
    alertCount === 0 ? 1 : clamp01(1 - alertPenalties / (alertCount * 1.2));

  const budgets = snap.budgets || [];
  let budgetSum = 0;
  let budgetCount = 0;
  for (const b of budgets) {
    const cap = Number(b.budget || 0);
    if (cap <= 0) continue;
    const ratio = Number(b.ratio || 0);
    budgetSum += clamp01(1 - Math.max(0, ratio - 1));
    budgetCount += 1;
  }
  const budgetScore = budgetCount === 0 ? 0.75 : budgetSum / budgetCount;

  const savingsRateWeighted = savingsRateScore * 0.3;
  const spendingWeighted = spendingControl * 0.3;
  const alertsWeighted = alertsImpact * 0.2;
  const budgetWeighted = budgetScore * 0.2;

  const composite =
    savingsRateWeighted + spendingWeighted + alertsWeighted + budgetWeighted;
  const score = Math.round(clamp01(composite) * 100);

  return {
    score,
    label: scoreLabel(score),
    breakdown: {
      savingsRate: Math.round(savingsRateScore * 100),
      spendingControl: Math.round(spendingControl * 100),
      alertsImpact: Math.round(alertsImpact * 100),
      budgetScore: Math.round(budgetScore * 100),
    },
  };
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function scoreLabel(score) {
  if (score < 40) return "Poor";
  if (score < 60) return "Fair";
  if (score < 80) return "Good";
  return "Excellent";
}
