import { budgetsWithUsage } from "../../lib/transactionAnalytics.js";

/** @param {{ budgets:ReturnType<typeof budgetsWithUsage> }} props */
export default function SpendingByCategory({ budgets }) {
  const prioritized = [...budgets].sort((a, b) => rankBucket(b) - rankBucket(a));

  const topSix = prioritized.slice(0, 6);

  return (
    <section className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md">
      <div className="border-b border-fw-border/90 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          Budget progress
        </p>
        <h2 className="mt-1 text-lg font-semibold text-fw-strong">
          By category envelope
        </h2>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-fw-muted">
          Pace vs demo monthly budgets — green below 85%, yellow near limit, red over budget.
        </p>
      </div>
      <ul className="mt-6 space-y-5">
        {topSix.map((bucket) => {
          const pct = Math.round(bucket.ratio * 100);
          const width = `${Math.round(Math.min(bucket.ratio * 100, 150))}%`;
          const meterLabel =
            bucket.category === "Savings"
              ? `${bucket.category}: ${pct}% achieved`
              : `${bucket.category}: ${pct}% used`;

          const status =
            bucket.ratio >= 1
              ? { label: "Overspent", tone: "text-fw-red-600" }
              : bucket.ratio >= 0.85
                ? { label: "Warning", tone: "text-amber-600" }
                : { label: "Safe", tone: "text-emerald-600" };

          const spentVerb = bucket.category === "Savings" ? "set aside" : "spent";

          return (
            <li key={bucket.category}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-fw-strong">{meterLabel}</p>
                <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${status.tone}`}>
                  {status.label}
                </p>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-fw-rose-soft ring-1 ring-white/55">
                <div
                  className={`${barAccent(bucket)} h-full rounded-full transition-[width] duration-700`}
                  style={{
                    width,
                  }}
                />
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-fw-muted">
                {bucket.spent.toLocaleString("en-LK")} LKR {spentVerb} · Budget{" "}
                {bucket.budget.toLocaleString("en-LK")} LKR
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Overspent buckets surface first; then warning band; remainder by descending ratio */
function rankBucket(bucket) {
  const { ratio } = bucket;
  if (ratio >= 1) return 500 + ratio;
  if (ratio >= 0.85) return 200 + ratio;
  return ratio;
}

function barAccent(bucket) {
  if (bucket.ratio >= 1)
    return "bg-gradient-to-r from-fw-red-700 via-fw-red-600 to-fw-red-700";
  if (bucket.ratio >= 0.85)
    return "bg-gradient-to-r from-amber-600 via-fw-red-600 to-fw-red-700";
  return "bg-gradient-to-r from-emerald-600 via-fw-red-600 to-fw-red-500";
}
