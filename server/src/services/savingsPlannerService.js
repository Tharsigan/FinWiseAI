import { computeSavingsPlan, roundMoney } from "../lib/savingsMath.js";

/**
 * Phase 9 Savings Planner Engine.
 * @param {{
 *   goalLabel: string;
 *   goalType?: string;
 *   targetAmount: number;
 *   currentSavings: number;
 *   monthlyIncome: number;
 *   monthlyExpenses: number;
 *   monthsRemaining: number;
 * }} input
 */
export function buildSavingsPlannerPlan(input) {
  const computed = computeSavingsPlan(input);
  const goalType = normalizeGoalType(input.goalType);
  const monthlyCutNeededLKR = roundMoney(Math.max(-computed.discretionaryGapLKR, 0));
  const recommendedMonthlyCommitmentLKR = roundMoney(
    Math.max(computed.requiredMonthlySavingLKR, 0),
  );
  const targetDateISO = addMonths(new Date(), computed.monthsRemaining)
    .toISOString()
    .slice(0, 10);

  const milestones = buildMilestones({
    targetAmountLKR: computed.targetAmountLKR,
    currentSavingsLKR: computed.currentSavingsLKR,
    monthlyCommitmentLKR: Math.max(
      Math.min(computed.discretionaryMonthlyLKR, computed.requiredMonthlySavingLKR),
      0,
    ),
    monthsRemaining: computed.monthsRemaining,
  });

  return {
    goal: {
      label: input.goalLabel,
      type: goalType,
      targetDateISO,
    },
    computed,
    recommendation: {
      status: statusCopy(computed.feasibility),
      monthlyCutNeededLKR,
      recommendedMonthlyCommitmentLKR,
      suggestedAutoSweepDay: "Day 2 after allowance or salary lands",
      actionPlan: buildActionPlan(computed, goalType, monthlyCutNeededLKR),
    },
    scenarios: buildScenarios(input),
    milestones,
    generatedAt: new Date().toISOString(),
  };
}

/** @param {string|undefined} raw */
function normalizeGoalType(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value.includes("under")) return "undergraduate";
  if (value.includes("post")) return "postgraduate";
  if (value.includes("cert")) return "certification";
  return "education";
}

/** @param {Date} date @param {number} months */
function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + Math.max(1, Math.round(months)));
  return next;
}

/** @param {ReturnType<typeof computeSavingsPlan>["feasibility"]} feasibility */
function statusCopy(feasibility) {
  if (feasibility === "complete") return "Goal already funded";
  if (feasibility === "on_track") return "On track";
  if (feasibility === "tight") return "Tight but possible";
  return "At risk";
}

/**
 * @param {ReturnType<typeof computeSavingsPlan>} computed
 * @param {string} goalType
 * @param {number} monthlyCutNeededLKR
 */
function buildActionPlan(computed, goalType, monthlyCutNeededLKR) {
  if (computed.feasibility === "complete") {
    return [
      "Keep the education fund separate from daily spending money.",
      "Move any extra allowance into a buffer for application fees, visa costs, or supplies.",
      "Recheck the target after fee schedules or exchange rates change.",
    ];
  }

  const steps = [
    `Set a recurring transfer of LKR ${Math.round(
      computed.requiredMonthlySavingLKR,
    ).toLocaleString("en-LK")} per month into a separate ${goalType} fund.`,
    "Split the monthly target into weekly envelopes so missed weeks are visible early.",
  ];

  if (monthlyCutNeededLKR > 0) {
    steps.push(
      `Free up about LKR ${Math.round(monthlyCutNeededLKR).toLocaleString(
        "en-LK",
      )} per month from food, transport, entertainment, or data bundles.`,
    );
  } else {
    steps.push(
      "Keep the current spending cushion intact instead of increasing discretionary spend.",
    );
  }

  steps.push(
    "Review the plan monthly after allowance, part-time income, scholarship news, or fee changes.",
  );

  return steps;
}

/**
 * @param {{
 *   goalLabel: string;
 *   goalType?: string;
 *   targetAmount: number;
 *   currentSavings: number;
 *   monthlyIncome: number;
 *   monthlyExpenses: number;
 *   monthsRemaining: number;
 * }} input
 */
function buildScenarios(input) {
  const base = computeSavingsPlan(input);
  const reduceSpendTenPercent = computeSavingsPlan({
    ...input,
    monthlyExpenses: input.monthlyExpenses * 0.9,
  });
  const slowerIncome = computeSavingsPlan({
    ...input,
    monthlyIncome: input.monthlyIncome * 0.9,
  });
  const extraPartTime = computeSavingsPlan({
    ...input,
    monthlyIncome: input.monthlyIncome + 7500,
  });

  return [
    scenario("current_plan", "Current plan", base),
    scenario("cut_expenses_10", "Cut expenses by 10%", reduceSpendTenPercent),
    scenario("income_drops_10", "Income drops by 10%", slowerIncome),
    scenario("extra_part_time", "Add LKR 7,500 part-time income", extraPartTime),
  ];
}

/**
 * @param {string} id
 * @param {string} label
 * @param {ReturnType<typeof computeSavingsPlan>} computed
 */
function scenario(id, label, computed) {
  return {
    id,
    label,
    feasibility: computed.feasibility,
    discretionaryMonthlyLKR: computed.discretionaryMonthlyLKR,
    monthlyGapLKR: computed.discretionaryGapLKR,
    savingsRatePercent: computed.savingsRatePercent,
  };
}

/**
 * @param {{
 *   targetAmountLKR: number;
 *   currentSavingsLKR: number;
 *   monthlyCommitmentLKR: number;
 *   monthsRemaining: number;
 * }} input
 */
function buildMilestones(input) {
  const thresholds = [25, 50, 75, 100];
  return thresholds.map((percent) => {
    const thresholdAmount = roundMoney(input.targetAmountLKR * (percent / 100));
    const amountNeeded = Math.max(thresholdAmount - input.currentSavingsLKR, 0);
    const monthsFromNow =
      amountNeeded <= 0
        ? 0
        : input.monthlyCommitmentLKR > 0
          ? Math.ceil(amountNeeded / input.monthlyCommitmentLKR)
          : null;
    return {
      percent,
      thresholdAmountLKR: thresholdAmount,
      reached: amountNeeded <= 0,
      estimatedMonth:
        monthsFromNow === null
          ? null
          : addMonths(new Date(), Math.min(monthsFromNow, input.monthsRemaining))
              .toISOString()
              .slice(0, 7),
    };
  });
}

/**
 * @param {{
 *   targetAmount?: unknown;
 *   currentSavings?: unknown;
 *   monthlyIncome?: unknown;
 *   monthlyExpenses?: unknown;
 *   monthsRemaining?: unknown;
 *   goalLabel?: unknown;
 *   goalType?: unknown;
 * }} body
 */
export function parseSavingsPlannerPayload(body) {
  const b = body && typeof body === "object" ? body : {};
  const raw = /** @type {Record<string, unknown>} */ (b);
  const nums = [
    ["targetAmount", raw.targetAmount],
    ["currentSavings", raw.currentSavings ?? 0],
    ["monthlyIncome", raw.monthlyIncome],
    ["monthlyExpenses", raw.monthlyExpenses],
    ["monthsRemaining", raw.monthsRemaining],
  ];
  /** @type {Record<string, number>} */
  const values = {};

  for (const [key, value] of nums) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return {
        ok: /** @type {const} */ (false),
        code: "INVALID_NUMBER",
        message: `Provide a numeric ${key}.`,
      };
    }
    values[key] = numeric;
  }

  if (values.targetAmount <= 0) {
    return {
      ok: /** @type {const} */ (false),
      code: "INVALID_TARGET",
      message: "targetAmount must be greater than zero.",
    };
  }
  if (values.monthsRemaining <= 0 || values.monthsRemaining > 480) {
    return {
      ok: /** @type {const} */ (false),
      code: "INVALID_HORIZON",
      message: "monthsRemaining must be between 1 and 480.",
    };
  }

  return {
    ok: /** @type {const} */ (true),
    value: {
      goalLabel: stringField(raw.goalLabel, "Education savings goal"),
      goalType: stringField(raw.goalType, "education"),
      targetAmount: Math.max(0, values.targetAmount),
      currentSavings: Math.max(0, values.currentSavings),
      monthlyIncome: Math.max(0, values.monthlyIncome),
      monthlyExpenses: Math.max(0, values.monthlyExpenses),
      monthsRemaining: Math.round(values.monthsRemaining),
    },
  };
}

/** @param {unknown} value @param {string} fallback */
function stringField(value, fallback) {
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 160);
  return fallback;
}
