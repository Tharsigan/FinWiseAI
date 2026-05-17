import { getPreviousMonth } from "../lib/dateUtils.js";
import { spendByCategoryInMonth } from "../lib/transactionAnalytics.js";

const SIGNIFICANT_PCT = 20;
/** Meaningful "new category" floor: LKR or share of planned monthly income */
const NEW_MIN_LKR = 1000;
const NEW_MIN_INCOME_SHARE = 0.05;

/**
 * @param {ReturnType<import("./intelligenceContext.js").buildIntelligenceContext>} ctx
 */
export function buildSpendingInsights(ctx) {
  const { snap } = ctx;
  const current = snap.monthPrefix;
  const prev = getPreviousMonth(current);
  const currentSpend = spendByCategoryInMonth(snap.normalized, current);
  const prevSpend = spendByCategoryInMonth(snap.normalized, prev);

  const plannedIncome = Number(snap.plannedMonthlyIncome || 0);

  const categories = new Set([
    ...currentSpend.keys(),
    ...prevSpend.keys(),
  ]);

  /** @type {Map<string, string>} */
  const lineByCategory = new Map();
  /** @type {Map<string, number>} */
  const currentAmountByCategory = new Map();

  for (const cat of categories) {
    if (cat === "Unallocated Income") continue;

    const currentMonthAmount = Number(currentSpend.get(cat) || 0);
    const previousMonthAmount = Number(prevSpend.get(cat) || 0);
    currentAmountByCategory.set(cat, currentMonthAmount);

    if (currentMonthAmount <= 0 && previousMonthAmount <= 0) continue;

    if (previousMonthAmount === 0) {
      if (
        currentMonthAmount > 0 &&
        meaningfulNewCategory(currentMonthAmount, plannedIncome)
      ) {
        lineByCategory.set(
          cat,
          `${cat} spending started this month (LKR ${formatLKR(currentMonthAmount)})`,
        );
      }
      continue;
    }

    if (currentMonthAmount === 0 && previousMonthAmount > 0) {
      lineByCategory.set(
        cat,
        `${cat} spending decreased by 100% compared to last month`,
      );
      continue;
    }

    const changePercent =
      ((currentMonthAmount - previousMonthAmount) / previousMonthAmount) * 100;

    if (changePercent >= SIGNIFICANT_PCT) {
      lineByCategory.set(
        cat,
        `${cat} spending increased by ${Math.round(changePercent)}% compared to last month`,
      );
    } else if (changePercent <= -SIGNIFICANT_PCT) {
      lineByCategory.set(
        cat,
        `${cat} spending decreased by ${Math.round(Math.abs(changePercent))}% compared to last month`,
      );
    } else {
      lineByCategory.set(cat, `${cat} spending remained stable`);
    }
  }

  const topTwo = topCategoriesBySpend(currentAmountByCategory, 2);
  const topTwoSet = new Set(topTwo);

  /** @type {string[]} */
  const insights = [];

  const orderedCats = [...lineByCategory.keys()].sort(
    (a, b) =>
      (currentAmountByCategory.get(b) || 0) - (currentAmountByCategory.get(a) || 0),
  );

  for (const cat of orderedCats) {
    let line = lineByCategory.get(cat) || "";
    if (!line) continue;
    if (topTwoSet.has(cat)) {
      line = `${line} (major expense category)`;
    }
    insights.push(line);
  }

  const totalSpendCurrent = sumSpendExcludingIncome(currentSpend);
  const rentCurrent = Number(currentSpend.get("Rent") || 0);
  if (totalSpendCurrent > 0 && rentCurrent / totalSpendCurrent > 0.3) {
    insights.push("Rent is your largest expense category");
  }

  return {
    insights,
    currentMonth: current,
    previousMonth: prev,
  };
}

/**
 * @param {Map<string, number>} amounts
 * @param {number} n
 */
function topCategoriesBySpend(amounts, n) {
  return [...amounts.entries()]
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

/** @param {Map<string, number>} spendMap */
function sumSpendExcludingIncome(spendMap) {
  let sum = 0;
  for (const [cat, v] of spendMap.entries()) {
    if (cat === "Unallocated Income") continue;
    sum += Number(v || 0);
  }
  return sum;
}

function meaningfulNewCategory(currentMonthAmount, plannedIncome) {
  if (currentMonthAmount > NEW_MIN_LKR) return true;
  if (plannedIncome > 0 && currentMonthAmount > NEW_MIN_INCOME_SHARE * plannedIncome) {
    return true;
  }
  return false;
}

function formatLKR(n) {
  return Math.round(Number(n) || 0).toLocaleString("en-LK");
}
