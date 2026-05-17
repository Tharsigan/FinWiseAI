import { formatLKR } from "../../lib/formatMoney.js";

/** @param {{ recurring: { name: string; amount: number; nextDueDate: string }[] }} props */
export default function RecurringPaymentsCard({ recurring }) {
  if (!recurring?.length) return null;
  return (
    <section className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
        Recurring (simulated)
      </p>
      <p className="mt-2 text-xs text-fw-muted">
        Demo schedule only — does not change your real or mock balance.
      </p>
      <ul className="mt-4 space-y-3 text-sm">
        {recurring.map((row) => (
          <li
            key={row.name}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-fw-border/90 pb-2"
          >
            <span className="font-medium text-fw-strong">{row.name}</span>
            <span className="text-fw-muted">
              {formatLKR(row.amount)} · due {row.nextDueDate}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
