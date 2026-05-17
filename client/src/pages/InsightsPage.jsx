import DemoBadge from "../components/DemoBadge.jsx";
import { SandboxModeBadge, SkeletonBlock } from "../components/FinwiseUI.jsx";
import PageHeading from "../components/PageHeading.jsx";
import IncomeAllocationPrompt from "../components/dashboard/IncomeAllocationPrompt.jsx";
import RecentTransactionsCard from "../components/dashboard/RecentTransactionsCard.jsx";
import SavingsGoalCard from "../components/dashboard/SavingsGoalCard.jsx";
import SpendingByCategory from "../components/dashboard/SpendingByCategory.jsx";
import SmartAlertsPanel from "../components/dashboard/SmartAlertsPanel.jsx";
import TopSpendingCategoriesCard from "../components/dashboard/TopSpendingCategoriesCard.jsx";
import IntelligenceBelowFold from "../components/intelligence/IntelligenceBelowFold.jsx";
import { useFinwiseData } from "../context/FinwiseDataProvider.jsx";
import { useIntelligenceOverlay } from "../hooks/useIntelligenceOverlay.js";
import { formatLKR } from "../lib/formatMoney.js";
import { dismissSavingsGoalFlash, clearSavingsOverlay } from "../lib/activeSavingsGoal.js";
import { getUnallocatedIncomeTransactions } from "../lib/incomeAllocations.js";

export default function InsightsPage() {
  const {
    loading,
    snapshot,
    syncIncomeAllocations,
    savingsGoalMeta,
    savingsGoalFlash,
    invalidateLocalPatches,
  } = useFinwiseData();
  const { overlay, error: intelError, loading: intelLoading } = useIntelligenceOverlay();

  if (loading || !snapshot) {
    return <InsightsLoadingSkeleton />;
  }

  const hasIncomeAllocation = getUnallocatedIncomeTransactions(snapshot.normalized).length > 0;

  return (
    <div className="flex flex-col gap-8 pb-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <PageHeading eyebrow="Insights" title="Money insights" />
          <p className="max-w-xl text-sm text-fw-muted">
            Full spending analysis, intelligence, alerts, and planning — one scroll away from
            your home cockpit.
          </p>
          <SandboxModeBadge source="fallback_mock" />
        </div>
        <DemoBadge />
      </header>

      {hasIncomeAllocation ? (
        <section id="insights-overview" aria-labelledby="insights-overview-heading" className="scroll-mt-4">
          <h2 id="insights-overview-heading" className="sr-only">
            Overview
          </h2>
          <IncomeAllocationPrompt rows={snapshot.normalized} onSaved={syncIncomeAllocations} />
        </section>
      ) : null}

      <section
        id="insights-spending"
        aria-labelledby="insights-spending-heading"
        className="scroll-mt-4 space-y-6"
      >
        <h2 id="insights-spending-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          Spending analysis
        </h2>
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <TopSpendingCategoriesCard
            normalized={snapshot.normalized}
            monthPrefix={snapshot.monthPrefix}
            limit={5}
          />
          <SpendingByCategory budgets={snapshot.budgets} />
        </div>
      </section>

      <section id="insights-intelligence" aria-labelledby="insights-intelligence-heading" className="scroll-mt-4">
        <h2 id="insights-intelligence-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          Intelligence
        </h2>
        <div className="mt-4">
          {intelError ? (
            <section className="finwise-card rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 text-sm text-amber-900 backdrop-blur-md dark:border-amber-500/35 dark:bg-amber-950/45 dark:text-amber-100">
              Intelligence layer unavailable: {intelError}
            </section>
          ) : intelLoading || !overlay ? (
            <section className="finwise-card animate-pulse rounded-2xl p-5 backdrop-blur-md">
              <div className="h-4 w-48 rounded bg-fw-border dark:bg-fw-border/50" />
              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <SkeletonBlock className="h-36" />
                <SkeletonBlock className="h-36" />
                <SkeletonBlock className="h-36" />
                <SkeletonBlock className="h-36" />
                <SkeletonBlock className="h-36 md:col-span-2" />
              </div>
            </section>
          ) : (
            <IntelligenceBelowFold overlay={overlay} preferHealthBreakdownOnly={false} />
          )}
        </div>
      </section>

      <section
        id="insights-budget-planning"
        aria-labelledby="insights-budget-planning-heading"
        className="scroll-mt-4 space-y-6"
      >
        <h2 id="insights-budget-planning-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          Budget and planning
        </h2>
        <SmartAlertsPanel
          alerts={snapshot.alerts}
          summary={snapshot.alertSummary}
          source={snapshot.alertSource}
          variant="hub"
        />
        <SavingsGoalCard
          goal={snapshot.savingsGoal}
          flash={savingsGoalFlash}
          onDismissFlash={() => {
            dismissSavingsGoalFlash();
            invalidateLocalPatches();
          }}
          showClearPlanner={savingsGoalMeta.lifecycle !== "mock"}
          onClearPlanner={() => {
            clearSavingsOverlay();
            invalidateLocalPatches();
          }}
        />
      </section>

      <section id="insights-transactions" aria-labelledby="insights-transactions-heading" className="scroll-mt-4">
        <h2 id="insights-transactions-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          Transactions
        </h2>
        <div className="mt-4 space-y-4">
          <RecentTransactionsCard rows={snapshot.normalized} maxRows={5} />
          <section className="finwise-card rounded-2xl px-4 py-3 backdrop-blur-md">
            <p className="text-xs leading-relaxed text-fw-muted">
              <span className="font-semibold uppercase tracking-[0.14em] text-fw-red-600">
                Demo confidence ·{" "}
              </span>
              Balance settles at{" "}
              <span className="font-semibold text-fw-red-700">{formatLKR(snapshot.availableLKR)}</span>{" "}
              for {snapshot.monthPrefix}. Mock ledger data only—no live banking calls.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}

function InsightsLoadingSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-8 pb-6">
      <SkeletonBlock className="h-20 w-full max-w-md rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonBlock className="min-h-[220px] rounded-2xl" />
        <SkeletonBlock className="min-h-[220px] rounded-2xl" />
      </div>
      <SkeletonBlock className="min-h-[280px] rounded-2xl" />
      <SkeletonBlock className="min-h-[200px] rounded-2xl" />
    </div>
  );
}
