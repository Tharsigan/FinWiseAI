import { formatLKR } from "../../lib/formatMoney.js";

export default function SavingsGoalCard({
  goal,
  /** @type {{ lifecycle: 'computed'|'pinned' } | null} */
  flash = null,
  onDismissFlash = () => {},
  showClearPlanner = false,
  onClearPlanner,
}) {
  const pct = Math.min(Math.max(goal.savedAmount / goal.targetAmount, 0), 1);
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
  const targetDate = new Date(`${goal.targetDateISO}T00:00:00`);
  const deadlineLabel = targetDate.toLocaleDateString("en-LK", {
    year: "numeric",
    month: "short",
  });
  const monthsLeft = timelineMonthsAway(targetDate);
  const glidepath = remaining / Math.max(monthsLeft, 1);

  const showFlash = Boolean(flash?.lifecycle);

  const flashSentence =
    flash?.lifecycle === "pinned"
      ? "Pinned plan activated — Savings progress switched to planner data."
      : "Planner synced — Savings progress now shows computed numbers from Savings.";

  return (
    <section
      aria-label="Savings goal"
      className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md"
    >
      {showFlash ? (
        <div className="-mx-5 -mt-5 mb-4 flex flex-wrap items-start justify-between gap-3 rounded-t-2xl border-b border-fw-red-100 bg-gradient-to-r from-fw-rose-soft via-white to-[#eefaf3] px-5 py-3 dark:border-fw-red-500/25 dark:from-red-950/40 dark:via-fw-panel dark:to-emerald-950/25">
          <p className="text-sm leading-relaxed text-fw-ink">
            <span className="font-semibold text-fw-red-700 uppercase tracking-[0.12em] text-xs">
              Updated ·{" "}
            </span>
            {flashSentence}
          </p>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-fw-panel/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-fw-ink ring-1 ring-fw-border transition hover:bg-fw-section dark:hover:bg-white/[0.08]"
            onClick={onDismissFlash}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="border-b border-fw-border/90 pb-5">
        <h2 className="text-xl font-semibold text-fw-strong">{goal.title}</h2>
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-fw-muted">
          Deadline · {deadlineLabel} · Roughly{" "}
          <span className="font-semibold text-fw-ink">{monthsLeft} months</span>{" "}
          left between now and your target milestone.
        </p>
      </div>
      <dl className="mt-6 space-y-4 text-sm leading-relaxed text-fw-muted">
        <div className="flex flex-wrap gap-6">
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-fw-muted">
              Accumulated savings
            </dt>
            <dd className="mt-2 text-xl font-semibold tracking-tight text-fw-strong">
              {formatLKR(goal.savedAmount)}
              <span className="ml-2 text-sm font-semibold uppercase tracking-[0.2em] text-fw-muted">
                of {formatLKR(goal.targetAmount)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.16em] text-fw-muted">
              Remaining runway
            </dt>
            <dd className="mt-2 text-xl font-semibold tracking-tight text-fw-red-600">
              ≈ {formatLKR(glidepath)} · month
              <span className="block text-[11px] font-normal capitalize tracking-normal text-fw-muted">
                glidepath heuristic with {monthsLeft}-month divisor
              </span>
            </dd>
          </div>
        </div>
      </dl>
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-fw-muted">
          <span>Progress</span>
          <span className="text-fw-red-600">{Math.round(pct * 100)}%</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-fw-rose-soft ring-1 ring-white/70 dark:ring-fw-border/50">
          <div
            className="h-full rounded-full bank-red-gradient transition-[width] duration-700"
            style={{ width: `${Math.round(pct * 100)}%` }}
          />
        </div>
      </div>

      {showClearPlanner && typeof onClearPlanner === "function" ? (
        <div className="mt-6 border-t border-fw-border/90 pt-4">
          <p className="text-xs text-fw-muted">
            Planner data overrides the bundled demo Savings goal locally. Clearing brings back the demo
            default on this dashboard.
          </p>
          <button
            type="button"
            onClick={() => onClearPlanner()}
            className="mt-3 w-full rounded-xl border border-fw-border bg-fw-panel px-4 py-2.5 text-sm font-semibold text-fw-strong shadow-[0_1px_4px_-2px_rgba(0,0,0,0.06)] transition hover:bg-fw-section dark:shadow-black/25 sm:w-auto"
          >
            Clear planner goal (demo default)
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** @param {Date} deadline */
function timelineMonthsAway(deadline) {
  const anchor = Date.now(); // aligns with student's “today”, May 16 2026 in mock plan
  const diff = deadline.getTime() - anchor;
  const months = Math.ceil(diff / (1000 * 60 * 60 * 24 * 30));
  return Math.max(months, 1);
}
