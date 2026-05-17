import { useMemo, useState } from "react";
import DemoBadge from "../components/DemoBadge.jsx";
import { SandboxModeBadge, TransactionsSkeleton } from "../components/FinwiseUI.jsx";
import PageHeading from "../components/PageHeading.jsx";
import { useFinwiseData } from "../context/FinwiseDataProvider.jsx";
import { formatLKR } from "../lib/formatMoney.js";
import { applyIncomeAllocationsToRows } from "../lib/incomeAllocations.js";

export default function TransactionsPage() {
  const { loading, snapshot } = useFinwiseData();
  const [filter, setFilter] = useState("All");
  const activeRows = applyIncomeAllocationsToRows(snapshot?.normalized ?? []);
  const activeMonth = String(snapshot?.monthPrefix ?? "");

  const filterOrder = useMemo(() => {
    const names = Array.from(
      new Set(activeRows.map((row) => row.category).filter(Boolean)),
    );
    return ["All", ...names];
  }, [activeRows]);

  const sorted = useMemo(() => {
    const inDemoMonth = (row) =>
      activeMonth ? String(row.dateISO || "").startsWith(activeMonth) : true;

    const pool =
      filter === "All" ? activeRows : activeRows.filter(inDemoMonth);

    const rows =
      filter === "All" ? pool : pool.filter((entry) => entry.category === filter);

    return [...rows].sort((a, b) => {
      const diff = b.dateISO.localeCompare(a.dateISO);
      if (diff !== 0) return diff;
      return b.id.localeCompare(a.id);
    });
  }, [activeMonth, activeRows, filter]);

  if (loading || !snapshot) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <TransactionsSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl flex-1 space-y-4">
          <PageHeading eyebrow="Activity" title="Transactions" />
          <p className="text-sm leading-relaxed text-fw-muted">
            Mock activity and payment rows are grouped into student-friendly categories
            for budgeting, savings, and smart alerts.{" "}
            <span className="font-medium text-fw-ink">
              Everything lists the full ledger in the snapshot, including new mock
              payments.
            </span>{" "}
            Category chips focus on the budget month ({activeMonth || "—"}).
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <SandboxModeBadge source="fallback_mock" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fw-muted">
              Showing {sorted.length} of {activeRows.length} mock rows
            </p>
          </div>
        </div>
        <DemoBadge />
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOrder.map((label) => {
          const active = label === filter;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setFilter(label)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                active
                  ? "bg-gradient-to-b from-[#E31D23] to-[#B81419] text-white shadow-lg shadow-fw-red-600/30"
                  : "border border-fw-border bg-fw-panel text-fw-muted hover:border-fw-red-200 hover:text-fw-red-700"
              }`}
            >
              {label === "All" ? "Everything" : label}
            </button>
          );
        })}
      </div>

      <section className="finwise-card overflow-hidden rounded-2xl backdrop-blur">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_minmax(0,120px)_minmax(0,120px)] gap-4 border-b border-fw-border px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-fw-muted md:grid">
          <span>Merchant / narration</span>
          <span>Category</span>
          <span>Date</span>
          <span className="text-right">Debit</span>
          <span className="text-right">Credit</span>
        </div>
        <ul className="divide-y divide-fw-border">
          {sorted.map((txn) => {
            const debit = Number(txn.debit || 0);
            const credit = Number(txn.credit || 0);
            return (
              <li key={txn.id} className="finwise-hover px-6 py-5">
                <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_minmax(0,120px)_minmax(0,120px)] md:items-center md:gap-4">
                  <div>
                    <p className="text-sm font-semibold text-fw-strong">{txn.description}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-fw-muted">
                      Ref · {txn.id}
                    </p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-fw-muted">
                    {txn.category}
                  </p>
                  <p className="text-sm font-medium text-fw-muted">{txn.dateISO}</p>
                  <p className="text-right text-sm font-semibold text-fw-red-600 md:justify-self-end">
                    {debit > 0 ? `− ${formatLKR(debit)}` : "–"}
                  </p>
                  <p className="text-right text-sm font-semibold text-emerald-600 dark:text-emerald-400 md:justify-self-end">
                    {credit > 0 ? `+ ${formatLKR(credit)}` : "–"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        {sorted.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-fw-muted">
            {filter === "All"
              ? "No activity rows in the current snapshot yet."
              : `Nothing in this category for ${activeMonth || "the budget month"}.`}
          </p>
        ) : null}
      </section>
    </div>
  );
}
