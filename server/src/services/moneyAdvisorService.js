import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

const SYSTEM_MONEY_ADVISOR = [
  "You are FinWise Money Advisor — read-only student finance assistant for Sri Lanka (LKR).",
  "You only analyze; never instruct the user to execute transfers, payments, or account changes.",
  "Output MUST be valid JSON with keys: affordability (string), risk (string), recommendation (string).",
  "Be concise (2-4 sentences each field). Note guidance is informational, not professional advice.",
].join(" ");

/**
 * Deterministic context assembly (no OpenAI).
 * @param {string} question
 * @param {ReturnType<import("./intelligenceContext.js").buildIntelligenceContext>} ctx
 * @param {{ health: object, spending: object, narrative: object }} bundles
 */
export function buildMoneyAdvisorUserContent(question, ctx, bundles) {
  const { snap } = ctx;
  const q = String(question || "").trim().slice(0, 2000);

  const insightBullets = (bundles.spending.insights || []).slice(0, 8).join("\n- ");
  const narrativeBullets = (bundles.narrative.lines || []).slice(0, 6).join("\n- ");

  return [
    `Student question: ${q || "(empty)"}`,
    "",
    `Available balance (snapshot): ${snap.availableLKR} LKR`,
    `Month: ${snap.monthPrefix}`,
    `Planned monthly income: ${snap.plannedMonthlyIncome} LKR`,
    `Cashflow estimate: ${snap.cashflowEstimate} LKR`,
    `Savings goal: ${snap.savingsGoal?.title} — saved ${snap.savingsGoal?.savedAmount} / target ${snap.savingsGoal?.targetAmount} LKR`,
    `Health score: ${bundles.health.score} (${bundles.health.label})`,
    `Alerts: ${snap.alertSummary?.dangerCount ?? 0} danger, ${snap.alertSummary?.warningCount ?? 0} warning, ${snap.alertSummary?.totalAlerts ?? 0} total`,
    "",
    "Recent spending insights:",
    insightBullets ? `- ${insightBullets}` : "- (none)",
    "",
    "Narrative cues:",
    narrativeBullets ? `- ${narrativeBullets}` : "- (none)",
  ].join("\n");
}

/** Sole OpenAI call for money advice. */
export async function generateMoneyAdvice(userContent) {
  const client = getOpenAI();
  if (!client) {
    const err = new Error("OPENAI_NOT_CONFIGURED");
    throw err;
  }

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    temperature: 0.25,
    max_tokens: 700,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_MONEY_ADVISOR },
      { role: "user", content: String(userContent).slice(0, 12000) },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed = /** @type {{ affordability?: string; risk?: string; recommendation?: string }} */ ({});
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {
      affordability: raw.slice(0, 1000),
      risk: "Could not parse structured risk; see affordability text.",
      recommendation: "Review spending categories and savings goal pace manually.",
    };
  }

  return {
    affordability: String(parsed.affordability || "").trim(),
    risk: String(parsed.risk || "").trim(),
    recommendation: String(parsed.recommendation || "").trim(),
    modelUsed: completion.model,
    usage: completion.usage ?? null,
  };
}
