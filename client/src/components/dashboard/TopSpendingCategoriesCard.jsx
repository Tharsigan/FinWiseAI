import { formatLKR } from "../../lib/formatMoney.js";
import { topExpenseCategoriesThisMonth } from "../../lib/financialClarity.js";

/** @param {{ normalized: unknown[]; monthPrefix: string; limit?: number }} props */
export default function TopSpendingCategoriesCard({ normalized, monthPrefix, limit = 5 }) {
  const rows = topExpenseCategoriesThisMonth(normalized, monthPrefix, limit);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
        Spending focus
      </p>
      <h2 className="mt-1 text-lg font-semibold text-fw-strong">
        Where is my money going?
      </h2>
      <p className="mt-1 text-xs text-fw-muted">Top spending this month:</p>
      <ul className="mt-4 space-y-3">
        {rows.map(({ category, amountLKR, emoji }) => (
          <li
            key={category}
            className="flex items-baseline justify-between gap-4 text-sm"
          >
            <span className="min-w-0 font-medium text-fw-strong">
              <span className="mr-2" aria-hidden>
                {emoji}
              </span>
              <span>{category}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-fw-strong">
              {formatLKR(amountLKR)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
