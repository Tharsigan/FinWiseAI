import { formatLKR } from "../../lib/formatMoney.js";

/** @param {{ availableLKR: number; healthScore?: number|null; healthLabel?: string|null; savingsPct: number; loadingHealth?: boolean }} props */
export default function DashboardKpiStrip({
  availableLKR,
  healthScore,
  healthLabel,
  savingsPct,
  loadingHealth = false,
}) {
  const pctLabel = `${Math.round(Math.min(Math.max(savingsPct, 0), 1) * 100)}%`;

  return (
    <div
      className="finwise-card sticky top-1 z-10 rounded-2xl px-3 py-3 backdrop-blur-md sm:px-4"
      aria-label="Key metrics"
    >
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <KpiChip label="Balance" emphasize>
          {formatLKR(availableLKR)}
        </KpiChip>
        <KpiChip label="Health score">
          {loadingHealth ? (
            <span className="inline-block h-4 w-14 animate-pulse rounded bg-fw-border dark:bg-fw-border/40" />
          ) : healthScore != null ? (
            <>
              <span className="font-semibold text-fw-strong">{healthScore}</span>
              <span className="text-fw-muted">/100</span>
              {healthLabel ? (
                <span className="mt-0.5 block max-w-[140px] truncate text-[11px] font-normal text-fw-muted">
                  {healthLabel}
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-fw-muted">—</span>
          )}
        </KpiChip>
        <KpiChip label="Savings goal">
          <span className="font-semibold text-fw-strong">{pctLabel}</span>
          <span className="ml-1 text-xs font-normal text-fw-muted">to target</span>
        </KpiChip>
      </div>
    </div>
  );
}

/** @param {{ label: string; children: import("react").ReactNode; emphasize?: boolean }} props */
function KpiChip({ label, children, emphasize = false }) {
  return (
    <div
      className={`min-w-[148px] shrink-0 snap-start rounded-xl border px-3 py-2 ${
        emphasize
          ? "border-fw-red-200/70 bg-gradient-to-br from-white to-fw-rose-soft/55 dark:border-fw-red-500/30 dark:from-fw-panel dark:to-red-950/25"
          : "border-fw-border/90 bg-fw-panel/95 dark:bg-fw-panel/70"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-fw-muted">{label}</p>
      <div className="mt-1 text-sm text-fw-ink">{children}</div>
    </div>
  );
}
