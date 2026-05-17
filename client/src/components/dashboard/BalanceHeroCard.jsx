import { Link } from "react-router-dom";
import { formatLKR } from "../../lib/formatMoney.js";

export default function BalanceHeroCard({
  availableLKR,
  cashflowEstimate,
  plannedMonthlyIncome,
  debitActivityThisMonth,
  compact = false,
}) {
  const pad = compact ? "p-5 sm:p-6" : "p-6 sm:p-9";
  const balanceText = compact
    ? "mt-2 text-[2rem] font-semibold tracking-tight text-white sm:text-[2.35rem]"
    : "mt-3 text-[2.4rem] font-semibold tracking-tight text-white sm:text-5xl";
  const bodyCls = compact
    ? "mt-3 max-w-xl text-xs leading-relaxed text-white/80 sm:text-sm"
    : "mt-5 max-w-lg text-sm leading-relaxed text-white/80";
  const gridCls = compact ? "mt-5 grid gap-4 sm:grid-cols-3" : "mt-8 grid gap-6 sm:grid-cols-3";
  const linkMt = compact ? "mt-5" : "mt-8";

  return (
    <section
      className={`bank-red-gradient finwise-hover relative overflow-hidden rounded-2xl border border-white/25 ${pad} text-white shadow-[0_8px_30px_-12px_rgba(184,20,25,0.45),0_2px_12px_-4px_rgba(227,29,35,0.25)]`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_-10%,rgba(255,255,255,0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute -right-[18%] top-[-30%] h-[120%] w-[70%] rotate-[-18deg] bg-[radial-gradient(circle,rgba(255,255,255,0.22),transparent_68%)]" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-[220px] flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            Available balance · LKR
          </p>
          <p className={balanceText}>{formatLKR(availableLKR)}</p>
          <p className={bodyCls}>
            {compact
              ? "Demo balances stay consistent—no external banking calls required."
              : "Mock banking and payment details stay in sync across the demo, so the student finance preview remains consistent without external services."}
          </p>
          <dl className={gridCls}>
            <StatBlock
              compact={compact}
              label="Planned income"
              value={formatLKR(plannedMonthlyIncome)}
            />
            <StatBlock
              compact={compact}
              label="Debits tracked"
              value={`− ${formatLKR(debitActivityThisMonth)}`}
            />
            <StatBlock
              compact={compact}
              label="Monthly projection"
              value={formatLKR(cashflowEstimate)}
              hint={cashflowEstimate < 0 ? "Expenses outpacing runway" : "Still positive runway"}
            />
          </dl>
          <Link
            to="/transactions"
            className={`${linkMt} inline-flex w-full items-center justify-center rounded-full bg-fw-panel px-6 py-2.5 text-sm font-semibold text-fw-red-700 shadow-[0_4px_14px_-4px_rgba(184,20,25,0.35)] transition hover:scale-[1.02] hover:brightness-105 sm:w-auto`}
          >
            Review categorized activity
          </Link>
        </div>
      </div>
    </section>
  );
}

function StatBlock({ label, value, hint, compact }) {
  const ddClass = compact
    ? "mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl"
    : "mt-3 text-xl font-semibold tracking-tight text-white sm:text-[1.65rem]";

  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
        {label}
      </dt>
      <dd className={ddClass}>{value}</dd>
      {hint ? (
        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-white/80">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
