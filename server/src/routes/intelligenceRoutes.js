import { Router } from "express";

import { success } from "../http/response.js";
import { buildBalanceForecast } from "../services/balanceForecastService.js";
import { buildFinancialHealthScore } from "../services/financialHealthScoreService.js";
import { buildFinancialNarrative } from "../services/financialNarrativeService.js";
import { buildIntelligenceContext } from "../services/intelligenceContext.js";
import { buildRecurringPayments } from "../services/recurringPaymentsService.js";
import { buildSpendingInsights } from "../services/spendingInsightsService.js";

export const intelligenceRouter = Router();

intelligenceRouter.get("/overlay", (_req, res) => {
  const ctx = buildIntelligenceContext();
  const health = buildFinancialHealthScore(ctx);
  const spendingInsights = buildSpendingInsights(ctx);
  const balanceForecast = buildBalanceForecast(ctx);
  const recurring = buildRecurringPayments(ctx);
  const narrative = buildFinancialNarrative(ctx);

  success(
    res,
    {
      source: ctx.source,
      health,
      spendingInsights,
      balanceForecast,
      recurring,
      narrative,
    },
    { source: "intelligence_overlay" },
  );
});
