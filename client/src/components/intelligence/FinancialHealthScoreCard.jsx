const BREAKDOWN_LABELS = {
  savingsRate: "Savings rate",
  spendingControl: "Spending control",
  alertsImpact: "Alerts impact",
  budgetScore: "Budget adherence",
};

/** @param {{ health: { score: number; label: string; breakdown: Record<string, number> }; variant?: 'full' | 'compact' | 'breakdownOnly' }} props */
export default function FinancialHealthScoreCard({ health, variant = "full" }) {
  if (!health) return null;
  const { score, label, breakdown } = health;

  const breakdownDl = (
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      {Object.entries(breakdown || {}).map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 border-b border-fw-border/90 pb-2">
          <dt className="text-fw-muted">{BREAKDOWN_LABELS[k] ?? k}</dt>
          <dd className="font-semibold text-fw-strong">{v}%</dd>
        </div>
      ))}
    </dl>
  );

  if (variant === "breakdownOnly") {
    if (!breakdown || Object.keys(breakdown).length === 0) return null;
    return (
      <section className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          Financial health breakdown
        </p>
        <p className="mt-1 text-xs text-fw-muted">
          Score summary is above; detail factors from the demo intelligence layer.
        </p>
        {breakdownDl}
      </section>
    );
  }

  if (variant === "compact") {
    return (
      <section className="finwise-card finwise-hover rounded-2xl p-4 backdrop-blur-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          Financial health
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <p className="text-3xl font-semibold tracking-tight text-fw-strong">{score}</p>
          <p className="text-sm font-medium text-fw-muted">/ 100 · {label}</p>
        </div>
      </section>
    );
  }
  return (
    <section className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
        Financial health
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-4">
        <p className="text-4xl font-semibold text-fw-strong">{score}</p>
        <p className="pb-1 text-sm font-medium text-fw-muted">/ 100 · {label}</p>
      </div>
      {breakdownDl}
    </section>
  );
}
