import { formatLKR } from "../../lib/formatMoney.js";

/** @param {{ balanceForecast: { balance7Days: number; balanceEndMonth: number; trend: string; averageDailySpend?: number } }} props */
export default function BalanceForecastCard({ balanceForecast }) {
  if (!balanceForecast) return null;
  const { balance7Days, balanceEndMonth, trend, averageDailySpend } = balanceForecast;
  return (
    <section className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
        Balance forecast
      </p>
      <p className="mt-3 text-sm text-fw-muted">
        Snapshot-based projection using average daily debits in the current month. Not a bank
        balance guarantee.
      </p>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-fw-muted">In ~7 days</dt>
          <dd className="font-semibold text-fw-strong">{formatLKR(balance7Days)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-fw-muted">End of month</dt>
          <dd className="font-semibold text-fw-strong">{formatLKR(balanceEndMonth)}</dd>
        </div>
        {averageDailySpend != null && (
          <div className="flex justify-between gap-2">
            <dt className="text-fw-muted">Avg. daily spend (debits)</dt>
            <dd className="font-semibold text-fw-strong">{formatLKR(averageDailySpend)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt className="text-fw-muted">Trend</dt>
          <dd className="font-semibold capitalize text-fw-red-700">{trend}</dd>
        </div>
      </dl>
    </section>
  );
}
