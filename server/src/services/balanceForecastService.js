import { filterByMonth } from "../lib/dateUtils.js";
import { totalDebitsInMonth } from "../lib/transactionAnalytics.js";

/**
 * @param {ReturnType<import("./intelligenceContext.js").buildIntelligenceContext>} ctx
 */
export function buildBalanceForecast(ctx) {
  const { snap, liveBalanceLKR, liveTransactions } = ctx;
  const month = snap.monthPrefix;

  const current = Number(liveBalanceLKR || 0);

  const [yy, mm] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(yy, mm, 0)).getUTCDate();

  const monthDebits = totalDebitsInMonth(liveTransactions, month);
  const monthRows = filterByMonth(liveTransactions, month);
  let lastDay = 1;
  for (const r of monthRows) {
    const d = Number(String(r.dateISO || "").slice(8, 10));
    if (d > lastDay) lastDay = d;
  }
  const dayInMonth = Math.min(Math.max(lastDay, 1), daysInMonth);
  const avgDaily = dayInMonth > 0 ? monthDebits / dayInMonth : 0;

  const balance7Days = current - avgDaily * 7;

  const remainingDays = Math.max(0, daysInMonth - dayInMonth);
  const balanceEndMonth = current - avgDaily * remainingDays;

  const projectedDelta = balanceEndMonth - current;
  const band = Math.max(current * 0.02, 500);
  let trend = "stable";
  if (projectedDelta > band) trend = "up";
  else if (projectedDelta < -band) trend = "down";

  return {
    balance7Days: round2(balance7Days),
    balanceEndMonth: round2(balanceEndMonth),
    trend,
    averageDailySpend: round2(avgDaily),
    assumptions: {
      monthPrefix: month,
      daysObservedInMonth: dayInMonth,
      daysInMonth,
    },
  };
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}
