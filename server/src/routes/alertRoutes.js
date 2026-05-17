import { Router } from "express";

import {
  mockCurrentMonth,
  mockPlannedMonthlyIncome,
  mockSavingsGoal,
} from "../data/mockData.js";
import { success } from "../http/response.js";
import { parseMonthOrDefault } from "../lib/monthQuery.js";
import { buildDashboardSnapshot } from "../services/snapshotService.js";
import {
  getSeylanBalance,
  getSeylanTransactions,
  isSeylanSandboxConfigured,
} from "../services/seylanSandboxService.js";
import { buildSmartAlerts } from "../services/smartAlertsService.js";

export const alertRouter = Router();

function fallbackAlertPayload(monthPrefix) {
  const snap = buildDashboardSnapshot();
  return buildSmartAlerts({
    transactions: snap.normalized,
    monthPrefix: monthPrefix || snap.monthPrefix,
    availableLKR: snap.availableLKR,
    savingsGoal: snap.savingsGoal,
    plannedMonthlyIncome: snap.plannedMonthlyIncome,
  });
}

alertRouter.get("/", async (req, res, next) => {
  try {
    const requestedMonth =
      typeof req.query.month === "string"
        ? parseMonthOrDefault(req.query.month, mockCurrentMonth)
        : undefined;

    if (!isSeylanSandboxConfigured()) {
      const result = fallbackAlertPayload(requestedMonth);
      success(
        res,
        {
          alerts: result.alerts,
          budgets: result.budgets,
          summary: result.summary,
          monthPrefix: result.summary.monthPrefix,
          availableLKR: result.summary.availableLKR,
          generatedAt: result.summary.generatedAt,
        },
        {
          source: "fallback_mock",
          meta: {
            engine: "smart_alerts_v1",
            sandbox: "not_configured",
            hint: "Configure Seylan sandbox variables to score live bank snapshots.",
          },
        },
      );
      return;
    }

    try {
      const [balanceResult, transactionResult] = await Promise.all([
        getSeylanBalance(),
        getSeylanTransactions({ count: 25 }),
      ]);
      const result = buildSmartAlerts({
        transactions: transactionResult.data.items,
        monthPrefix: requestedMonth,
        availableLKR: balanceResult.data.availableLKR,
        savingsGoal: mockSavingsGoal,
        plannedMonthlyIncome: mockPlannedMonthlyIncome,
      });

      success(
        res,
        {
          alerts: result.alerts,
          budgets: result.budgets,
          summary: result.summary,
          monthPrefix: result.summary.monthPrefix,
          availableLKR: result.summary.availableLKR,
          generatedAt: result.summary.generatedAt,
        },
        {
          source: "seylan_sandbox",
          meta: {
            engine: "smart_alerts_v1",
            balanceStatusCode: balanceResult.bankStatus.code,
            transactionStatusCode: transactionResult.bankStatus.code,
            hint: "Alerts are deterministic rules over normalized bank transactions.",
          },
        },
      );
    } catch (error) {
      const result = fallbackAlertPayload(requestedMonth);
      success(
        res,
        {
          alerts: result.alerts,
          budgets: result.budgets,
          summary: result.summary,
          monthPrefix: result.summary.monthPrefix,
          availableLKR: result.summary.availableLKR,
          generatedAt: result.summary.generatedAt,
        },
        {
          source: "fallback_mock",
          meta: {
            engine: "smart_alerts_v1",
            sandbox: "error_fallback",
            reason: error instanceof Error ? error.message : String(error),
          },
        },
      );
    }
  } catch (error) {
    next(error);
  }
});
