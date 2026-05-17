import { buildSavingsPlannerPlan } from "./savingsPlannerService.js";
import { getOpenAI, getOpenAIModel } from "./openaiClient.js";

/**
 * @param {{
 *   goalLabel: string;
 *   targetAmount: number;
 *   currentSavings: number;
 *   monthlyIncome: number;
 *   monthlyExpenses: number;
 *   monthsRemaining: number;
 * }} input
 */
export async function narrateSavingsPlan(input) {
  const enginePlan = buildSavingsPlannerPlan(input);

  const client = getOpenAI();
  if (!client) throw new Error("OPENAI_NOT_CONFIGURED");

  const facts = JSON.stringify(
    {
      goalLabel: input.goalLabel,
      goalType: enginePlan.goal.type,
      feasibility: enginePlan.computed.feasibility,
      computed: enginePlan.computed,
      recommendation: enginePlan.recommendation,
      scenarios: enginePlan.scenarios,
    },
    null,
    2,
  );

  const userPrompt = [
    "You help Sri Lankan students interpret a PRE-CALCULATED savings plan.",
    "Do NOT recompute required monthly savings — treat the numbers as facts.",
    "Respond with JSON ONLY (no markdown) using this shape:",
    '{"summary":string,"nextSteps":string[],"riskCallouts":string[],"closingDisclaimer":string}',
    "summary: 2-3 sentences referencing LKR amounts from the facts.",
    "nextSteps: 3-5 actionable bullets (reduce category expenses, automate sweeps, etc.).",
    "riskCallouts: 0-3 cautions tied to feasibility.",
    "closingDisclaimer reminds this is educational guidance only.",
    "",
    "FACTS JSON:",
    facts,
  ].join("\n");

  const completion = await client.chat.completions.create({
    model: getOpenAIModel(),
    temperature: 0.45,
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are FinWise education savings narrator — deterministic numbers from the engineer are authoritative.",
      },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("SAVINGS_JSON_PARSE");
  }

  if (!parsed || typeof parsed !== "object") throw new Error("SAVINGS_INVALID_SHAPE");

  const obj = /** @type {Record<string, unknown>} */ (parsed);
  const narration = {
    summary: typeof obj.summary === "string" ? obj.summary.trim() : "",
    nextSteps: toStringArray(obj.nextSteps),
    riskCallouts: toStringArray(obj.riskCallouts),
    closingDisclaimer:
      typeof obj.closingDisclaimer === "string"
        ? obj.closingDisclaimer.trim()
        : "Not professional financial advice — consult qualified advisors for major decisions.",
  };

  return {
    goal: enginePlan.goal,
    computed: enginePlan.computed,
    recommendation: enginePlan.recommendation,
    scenarios: enginePlan.scenarios,
    milestones: enginePlan.milestones,
    narration,
    usage: completion.usage ?? null,
    modelUsed: completion.model,
  };
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => x.trim());
}
