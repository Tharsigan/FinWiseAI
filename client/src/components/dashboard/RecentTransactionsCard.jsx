import { Link } from "react-router-dom";
import { formatLKR } from "../../lib/formatMoney.js";

/** @typedef {{ id:string, dateISO:string, description:string, category:string }} MockTxnNormalized */

/** @param {{ rows: MockTxnNormalized[]; maxRows?: number }} props */
export default function RecentTransactionsCard({ rows, maxRows = 7 }) {
  const top = [...rows]
    .sort((a, b) => {
      const day = b.dateISO.localeCompare(a.dateISO);
      if (day !== 0) return day;
      return b.id.localeCompare(a.id);
    })
    .slice(0, maxRows);

  const subtitle =
    maxRows === 5 ? "Last five movements" : "Most recent updates";

  return (
    <section className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-fw-border/90 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
            Recent activity
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-fw-strong">
            Latest activity
          </h2>
          <p className="mt-1 text-sm text-fw-muted">{subtitle}</p>
        </div>
        <Link
          to="/transactions"
          aria-label="View full transaction history"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-fw-red-600 underline-offset-4 hover:text-fw-red-500 hover:underline"
        >
          View all →
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-fw-border bg-fw-section/35 px-4 py-8 text-center text-sm leading-relaxed text-fw-muted">
          No recent transactions to show yet. Activity will appear here once you have
          ledger entries.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-fw-border/90 overflow-hidden rounded-xl border border-fw-border/80 bg-fw-panel/45 dark:bg-fw-panel/25">
          {top.map((row) => (
            <li
              key={row.id}
              className="finwise-hover flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3 text-sm transition-colors odd:bg-fw-panel/55 even:bg-fw-section/25 hover:bg-fw-section/50 dark:odd:bg-white/[0.05] dark:even:bg-white/[0.02] dark:hover:bg-white/[0.08]"
            >
              <span className="min-w-[4.85rem] shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-fw-muted">
                {formatShort(row.dateISO)}
              </span>
              <div className="min-w-[160px] flex-1 space-y-0.5">
                <p className="font-semibold leading-snug text-fw-strong">
                  {row.description}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-fw-muted">
                  {row.category}
                </p>
              </div>
              <FlowAmount
                debit={Number(row.debit || 0)}
                credit={Number(row.credit || 0)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FlowAmount({ debit, credit }) {
  if (credit > 0) {
    return (
      <p className="ml-auto shrink-0 pt-0.5 text-sm font-semibold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
        + {formatLKR(credit)}
      </p>
    );
  }

  return (
    <p className="ml-auto shrink-0 pt-0.5 text-sm font-semibold tabular-nums tracking-tight text-fw-red-600">
      − {formatLKR(debit)}
    </p>
  );
}

/** @param {string} iso */
function formatShort(iso) {
  const date = new Date(`${iso}T12:00:00`);
  return `${date.toLocaleString("default", { weekday: "short" })}, ${iso.slice(
    8,
    10,
  )}`;
}
