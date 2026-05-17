import OpenAI from "openai";
import { Router } from "express";

import { failure, success } from "../http/response.js";
import { buildFinancialHealthScore } from "../services/financialHealthScoreService.js";
import { buildFinancialNarrative } from "../services/financialNarrativeService.js";
import { buildIntelligenceContext } from "../services/intelligenceContext.js";
import {
  buildMoneyAdvisorUserContent,
  generateMoneyAdvice,
} from "../services/moneyAdvisorService.js";
import { buildSpendingInsights } from "../services/spendingInsightsService.js";
import { getOpenAI, getOpenAIModel } from "../services/openaiClient.js";

export const aiMoneyAdviceRouter = Router();

function notReady(endpoint, res, hints) {
  failure(res, 503, "FEATURE_NOT_CONFIGURED", "Awaiting upstream configuration.", {
    endpoint,
    configure: hints,
  });
}

function handleError(res, error) {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg === "OPENAI_NOT_CONFIGURED") {
    notReady("/api/ai/money-advice", res, {
      OPENAI_API_KEY: "Required for money advice",
    });
    return;
  }
  if (error instanceof OpenAI.APIError) {
    const status = error.status && error.status >= 400 ? error.status : 502;
    failure(
      res,
      status >= 500 ? 502 : 400,
      "OPENAI_UPSTREAM",
      error.message || "OpenAI request failed.",
    );
    return;
  }
  console.error("[money-advice]", error);
  failure(res, 500, "MONEY_ADVICE_FAILURE", "Unexpected error.");
}

aiMoneyAdviceRouter.post("/money-advice", async (req, res) => {
  if (!getOpenAI()) {
    notReady("/api/ai/money-advice", res, {
      OPENAI_API_KEY: `Model · ${getOpenAIModel()}`,
    });
    return;
  }

  const question =
    typeof req.body?.question === "string" ? req.body.question.trim() : "";
  if (!question) {
    failure(res, 400, "MISSING_QUESTION", "Provide `question` (string) in JSON body.");
    return;
  }

  try {
    const ctx = buildIntelligenceContext();
    const health = buildFinancialHealthScore(ctx);
    const spending = buildSpendingInsights(ctx);
    const narrative = buildFinancialNarrative(ctx);

    const userContent = buildMoneyAdvisorUserContent(question, ctx, {
      health,
      spending,
      narrative,
    });

    const result = await generateMoneyAdvice(userContent);

    success(
      res,
      {
        question,
        ...result,
        disclaimer:
          "Read-only analysis — not financial, legal, or tax advice. No payments or transfers are executed.",
      },
      { source: "openai", meta: { model: result.modelUsed } },
    );
  } catch (err) {
    handleError(res, err);
  }
});
