const WEEKS_PER_MONTH = 52 / 12;

/**
 * Deterministic education savings math (do not trust the model for arithmetic).
 * @param {{
 *   targetAmount: number;
 *   currentSavings: number;
 *   monthlyIncome: number;
 *   monthlyExpenses: number;
 *   monthsRemaining: number;
 * }} input
 */
export function computeSavingsPlan(input) {
  const targetAmount = Math.max(0, input.targetAmount);
  const currentSavings = Math.max(0, input.currentSavings);
  const monthlyIncome = Math.max(0, input.monthlyIncome);
  const monthlyExpenses = Math.max(0, input.monthlyExpenses);
  const monthsRemaining = Math.max(1, Math.round(input.monthsRemaining));

  const remaining = Math.max(targetAmount - currentSavings, 0);
  const requiredMonthlySaving = remaining / monthsRemaining;
  const discretionaryMonthly = monthlyIncome - monthlyExpenses;
  const discretionaryGap = discretionaryMonthly - requiredMonthlySaving;
  const progressPercent =
    targetAmount > 0 ? Math.min((currentSavings / targetAmount) * 100, 100) : 100;
  const requiredWeeklySaving = requiredMonthlySaving / WEEKS_PER_MONTH;
  const savingsRatePercent =
    monthlyIncome > 0 ? (discretionaryMonthly / monthlyIncome) * 100 : 0;
  const requiredSavingsRatePercent =
    monthlyIncome > 0 ? (requiredMonthlySaving / monthlyIncome) * 100 : 0;
  const affordabilityRatio =
    requiredMonthlySaving > 0 ? discretionaryMonthly / requiredMonthlySaving : 1;

  let feasibility = /** @type {"complete"|"on_track"|"tight"|"at_risk"} */ ("at_risk");
  if (remaining <= 0) feasibility = "complete";
  else if (discretionaryMonthly + 1e-9 >= requiredMonthlySaving)
    feasibility = "on_track";
  else if (
    requiredMonthlySaving > 0 &&
    discretionaryMonthly >= requiredMonthlySaving * 0.8
  )
    feasibility = "tight";

  return {
    targetAmountLKR: roundMoney(targetAmount),
    currentSavingsLKR: roundMoney(currentSavings),
    remainingGoalLKR: roundMoney(remaining),
    monthsRemaining,
    progressPercent: roundPercent(progressPercent),
    requiredMonthlySavingLKR: roundMoney(requiredMonthlySaving),
    requiredWeeklySavingLKR: roundMoney(requiredWeeklySaving),
    discretionaryMonthlyLKR: roundMoney(discretionaryMonthly),
    discretionaryGapLKR: roundMoney(discretionaryGap),
    savingsRatePercent: roundPercent(savingsRatePercent),
    requiredSavingsRatePercent: roundPercent(requiredSavingsRatePercent),
    affordabilityRatio: Number(affordabilityRatio.toFixed(2)),
    feasibility,
  };
}

/** @param {number} value */
export function roundMoney(value) {
  return Number((Number(value) || 0).toFixed(2));
}

/** @param {number} value */
export function roundPercent(value) {
  return Number((Number(value) || 0).toFixed(1));
}
