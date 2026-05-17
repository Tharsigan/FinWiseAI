import BalanceForecastCard from "./BalanceForecastCard.jsx";
import FinancialHealthScoreCard from "./FinancialHealthScoreCard.jsx";
import FinancialNarrativeCard from "./FinancialNarrativeCard.jsx";
import RecurringPaymentsCard from "./RecurringPaymentsCard.jsx";
import SpendingInsightsCard from "./SpendingInsightsCard.jsx";

/** @param {{ overlay: Record<string, unknown>; preferHealthBreakdownOnly?: boolean }} props */
export default function IntelligenceBelowFold({
  overlay,
  preferHealthBreakdownOnly = false,
}) {
  const health = /** @type {{ score: number; label: string; breakdown?: Record<string, number> }|undefined} */ (
    overlay.health
  );
  const breakdown = health?.breakdown;
  const hasBreakdown = breakdown != null && Object.keys(breakdown).length > 0;
  const showBreakdownFollowUp = preferHealthBreakdownOnly && hasBreakdown;

  const healthLead =
    preferHealthBreakdownOnly && showBreakdownFollowUp ? (
      <FinancialHealthScoreCard health={health} variant="breakdownOnly" />
    ) : !preferHealthBreakdownOnly && health ? (
      <FinancialHealthScoreCard health={health} variant="full" />
    ) : null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          Intelligence layer
        </p>
        <p className="mt-1 text-sm text-fw-muted">
          Read-only analysis from the demo snapshot. Single request powers all cards below.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {healthLead}
        <BalanceForecastCard balanceForecast={/** @type {any} */ (overlay.balanceForecast)} />
        <SpendingInsightsCard spendingInsights={/** @type {any} */ (overlay.spendingInsights)} />
        <RecurringPaymentsCard recurring={/** @type {any} */ (overlay.recurring)} />
        <div className="md:col-span-2">
          <FinancialNarrativeCard narrative={/** @type {any} */ (overlay.narrative)} />
        </div>
      </div>
    </section>
  );
}
