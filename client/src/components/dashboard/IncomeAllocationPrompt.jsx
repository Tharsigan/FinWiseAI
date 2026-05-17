import { useMemo, useState } from "react";
import { formatLKR } from "../../lib/formatMoney.js";
import {
  INCOME_CATEGORIES,
  getUnallocatedIncomeTransactions,
  guessIncomeCategory,
  saveIncomeAllocationDraft,
} from "../../lib/incomeAllocations.js";

/** @param {{ rows: unknown[]; onSaved: () => void }} props */
export default function IncomeAllocationPrompt({ rows, onSaved }) {
  const unallocated = useMemo(() => getUnallocatedIncomeTransactions(rows), [rows]);
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(unallocated.map((row) => [row.id, guessIncomeCategory(row)])),
  );

  if (unallocated.length === 0) return null;

  function saveAllocations() {
    const fallbackDraft = Object.fromEntries(
      unallocated.map((row) => [row.id, draft[row.id] || guessIncomeCategory(row)]),
    );
    saveIncomeAllocationDraft(fallbackDraft);
    onSaved();
  }

  return (
    <section className="finwise-card rounded-2xl border border-emerald-200/70 bg-emerald-50/75 p-5 backdrop-blur-md dark:border-emerald-500/30 dark:bg-emerald-950/35">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            Income allocation
          </p>
          <h2 className="mt-2 text-lg font-semibold text-fw-strong">
            Choose categories for new income
          </h2>
          <p className="mt-1 text-sm text-fw-muted">
            FinWise found credits after login. Pick the right income category so they do not
            appear under expense budgets.
          </p>
        </div>
        <button
          type="button"
          onClick={saveAllocations}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white shadow-[0_2px_8px_-3px_rgba(16,185,129,0.35)] transition hover:brightness-105"
        >
          Save allocations
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {unallocated.map((row) => (
          <label
            key={row.id}
            className="grid gap-3 rounded-xl border border-fw-border/90 bg-fw-panel/95 p-4 text-sm shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] backdrop-blur-sm dark:bg-fw-panel/70 dark:shadow-black/20 md:grid-cols-[minmax(0,1.5fr)_auto_minmax(0,220px)] md:items-center"
          >
            <span>
              <span className="block font-semibold text-fw-strong">{row.description}</span>
              <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-fw-muted">
                {row.dateISO} · Ref {row.id}
              </span>
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              + {formatLKR(Number(row.credit || 0))}
            </span>
            <select
              value={draft[row.id] || guessIncomeCategory(row)}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, [row.id]: event.target.value }))
              }
              className="rounded-xl border border-fw-border bg-fw-panel px-3 py-2 text-sm font-medium text-fw-strong outline-none ring-emerald-600/15 focus:border-emerald-500 focus:ring-4 dark:bg-fw-section"
            >
              {INCOME_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  );
}
