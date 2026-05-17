import { mockPlannedMonthlyIncome, mockSavingsGoal } from "../data/mockData.js";
import { buildSmartAlerts } from "../services/smartAlertsService.js";

/**
 * Backward-compatible adapter for earlier snapshot code.
 * @returns {{ id:string, severity:'info'|'warning'|'danger', title:string, message:string }[]}
 */
export function deriveMockAlerts(
  normalizedRows,
  monthPrefix,
  /** @type {{ availableLKR:number }} */
  snapshot,
) {
  return buildSmartAlerts({
    transactions: normalizedRows,
    monthPrefix,
    availableLKR: snapshot.availableLKR,
    savingsGoal: mockSavingsGoal,
    plannedMonthlyIncome: mockPlannedMonthlyIncome,
    maxAlerts: 6,
  }).alerts;
}
