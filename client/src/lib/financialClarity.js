import { INCOME_CATEGORIES } from "./incomeAllocations.js";
import { formatLKR } from "./formatMoney.js";
import { spendByCategoryInMonth } from "./transactionAnalytics.js";

const EXCLUDED_SPEND_KEYS = new Set([
  "Unallocated Income",
  ...INCOME_CATEGORIES,
]);

/** @type {Record<string,string>} */
export const CATEGORY_SPEND_EMOJI = {
  Food: "🍔",
  Transport: "🚌",
  "Mobile Data": "📱",
  Rent: "🏠",
  Entertainment: "🎬",
  Savings: "🐖",
  Other: "💳",
};

/**
 * When the viewer’s calendar month differs from `monthPrefix`, we evenly spread MTD debit
 * volume across the demo month and assume a full-month horizon for “remaining” context only.
 */

/** @param {string} monthPrefix YYYY-MM */
function daysInBudgetMonth(monthPrefix) {
  const [yStr, mStr] = monthPrefix.split("-").map(Number);
  if (!Number.isFinite(yStr) || !Number.isFinite(mStr) || mStr < 1 || mStr > 12)
    return 30;
  return new Date(Date.UTC(yStr, mStr, 0)).getUTCDate();
}

function viewerMatchesSnapshotMonth(now, monthPrefix) {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return ym === monthPrefix;
}

/** @typedef {{ tier: 'safe'|'caution'|'risk'; headline: string; subline: string; runwayDays: number|null; dailySpendLKR: number; remainingDaysInMonthHint: number }} MonthlySurvivalResult */

/**
 * @param {{
 *   availableLKR: number;
 *   debitActivityThisMonth: number;
 *   monthPrefix: string;
 *   now?: Date;
 * }} opts
 * @returns {MonthlySurvivalResult}
 */
export function computeMonthlySurvival({
  availableLKR,
  debitActivityThisMonth,
  monthPrefix,
  now = new Date(),
}) {
  const mtd = Number(debitActivityThisMonth) || 0;
  const available = Number(availableLKR) || 0;
  const dims = daysInBudgetMonth(monthPrefix);
  let dailySpendLKR = 0;
  /** Including today — student-friendly countdown phrasing */
  let remainingDaysInMonthHint = dims;

  if (viewerMatchesSnapshotMonth(now, monthPrefix)) {
    const day = Math.min(Math.max(now.getDate(), 1), dims);
    const elapsedInclusive = Math.max(1, day);
    remainingDaysInMonthHint = dims - day + 1;
    dailySpendLKR = elapsedInclusive > 0 ? mtd / elapsedInclusive : mtd;
  } else {
    // Demo month pinned; spread spend across entire month envelope.
    dailySpendLKR = dims > 0 ? mtd / dims : mtd;
    remainingDaysInMonthHint = dims;
  }

  if (dailySpendLKR <= 0) {
    return {
      tier: "safe",
      headline: "Safe — runway looks strong",
      subline:
        "Little outgoing spend is tracked so far this month · pace picks up once you start spending.",
      runwayDays: null,
      dailySpendLKR: 0,
      remainingDaysInMonthHint,
    };
  }

  const runwayDays = Math.floor(Math.max(0, available) / dailySpendLKR);

  /** @type {'safe'|'caution'|'risk'} */
  let tier;
  if (runwayDays <= 3) tier = "risk";
  else if (runwayDays <= 11) tier = "caution";
  else tier = "safe";

  let headline = "";
  if (tier === "safe") {
    headline = `Safe — You can comfortably last ${runwayDays}+ days`;
  } else if (tier === "caution") {
    headline = `Heads-up — You may run low in ${runwayDays} days`;
  } else {
    headline =
      runwayDays <= 0
        ? "High risk — balance may not cover pace"
        : `High risk — You may run out in ${runwayDays} day${runwayDays === 1 ? "" : "s"}`;
  }

  const paceLbl = `${Math.round(dailySpendLKR).toLocaleString("en-LK")}`;
  const subline =
    runwayDays !== null && runwayDays > 0
      ? `About ${formatLKR(dailySpendLKR)} / day (${paceLbl} LKR/day pace) · ~${remainingDaysInMonthHint} days left this month envelope`
      : `About ${formatLKR(dailySpendLKR)} / day (${paceLbl} LKR/day pace) · tighten pace if withdrawals continue`;

  return {
    tier,
    headline,
    subline,
    runwayDays,
    dailySpendLKR,
    remainingDaysInMonthHint,
  };
}

/**
 * @param {unknown[]} normalizedRows
 * @param {string} monthPrefix
 * @param {number} [limit=5]
 */
export function topExpenseCategoriesThisMonth(normalizedRows, monthPrefix, limit = 5) {
  const map = spendByCategoryInMonth(
    normalizedRows.filter((r) => r && typeof r === "object"),
    monthPrefix,
  );
  const entries = [...map.entries()]
    .filter(([cat]) => !EXCLUDED_SPEND_KEYS.has(cat))
    .filter(([, amt]) => Number(amt) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));

  const cap = Math.min(Math.max(limit, 3), 5);

  return entries.slice(0, cap).map(([category, amountLKR]) => ({
    category,
    amountLKR: Number(amountLKR),
    emoji: CATEGORY_SPEND_EMOJI[category] || "📌",
  }));
}

/**
 * @param {{
 *   amountLKR: number;
 *   category: string;
 *   weeklyBudgetLKR?: number|null;
 * }} opts
 */
export function buildTransferSpendAdvisoryLines({ amountLKR, category, weeklyBudgetLKR }) {
  const w = weeklyBudgetLKR != null ? Number(weeklyBudgetLKR) : NaN;
  if (!Number.isFinite(amountLKR) || amountLKR <= 0) return null;
  if (!Number.isFinite(w) || w <= 0) return null;
  const pct = Math.round(Math.min(9999, Math.max(0, (amountLKR / w) * 100)));
  const main = `You're about to spend ${formatLKR(amountLKR)} on ${category}. This is ~${pct}% of your weekly budget.`;
  return { primary: main };
}
