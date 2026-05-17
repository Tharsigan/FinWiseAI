import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DemoBadge from "../components/DemoBadge.jsx";
import { BalanceSkeleton, SandboxModeBadge, SkeletonBlock } from "../components/FinwiseUI.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import PageHeading from "../components/PageHeading.jsx";
import ShellPageBody from "../components/ShellPageBody.jsx";
import BalanceHeroCard from "../components/dashboard/BalanceHeroCard.jsx";
import DashboardKpiStrip from "../components/dashboard/DashboardKpiStrip.jsx";
import MonthlySurvivalCard from "../components/dashboard/MonthlySurvivalCard.jsx";
import SmartAlertsPanel from "../components/dashboard/SmartAlertsPanel.jsx";
import FinancialHealthScoreCard from "../components/intelligence/FinancialHealthScoreCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useFinwiseData } from "../context/FinwiseDataProvider.jsx";
import { mergeUserProfile } from "../lib/mergeUserProfile.js";
import { useIntelligenceOverlay } from "../hooks/useIntelligenceOverlay.js";
import { getTimeOfDayGreeting } from "../lib/timeGreeting.js";

export default function DashboardPage() {
  const [greetingTick, setGreetingTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setGreetingTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const timeGreeting = useMemo(() => getTimeOfDayGreeting(), [greetingTick]);

  const { loading, snapshot } = useFinwiseData();
  const { user, profile } = useAuth();
  const displayProfile = mergeUserProfile(
    snapshot?.profile,
    user,
    profile,
  );
  const { overlay, loading: intelLoading } = useIntelligenceOverlay();

  if (loading || !snapshot) {
    return (
      <ShellPageBody>
        <DashboardLoadingSkeleton />
      </ShellPageBody>
    );
  }

  const health = /** @type {{ score: number; label: string; breakdown?: Record<string, number> }|undefined} */ (
    overlay?.health
  );
  const savingsPct =
    snapshot.savingsGoal.targetAmount > 0
      ? snapshot.savingsGoal.savedAmount / snapshot.savingsGoal.targetAmount
      : 0;
  const showHealthSlot = intelLoading || !!health;

  return (
    <ShellPageBody>
      <div className="flex flex-col gap-4 pb-4">
        <section aria-labelledby="dash-cockpit-heading" className="flex flex-col gap-4">
        <h2 id="dash-cockpit-heading" className="sr-only">
          Status cockpit
        </h2>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <PageHeading
              eyebrow={
                <>
                  <BrandLogo className="h-6 w-6 shrink-0 object-contain" />
                  FinWise AI
                </>
              }
              title={`${timeGreeting}, ${displayProfile.firstName}`}
            />
            <SandboxModeBadge source="fallback_mock" />
          </div>
          <div className="shrink-0">
            <DemoBadge />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="min-w-0 lg:col-span-8">
            <BalanceHeroCard
              compact
              availableLKR={snapshot.availableLKR}
              cashflowEstimate={snapshot.cashflowEstimate}
              plannedMonthlyIncome={snapshot.plannedMonthlyIncome}
              debitActivityThisMonth={snapshot.debitActivityThisMonth}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
            <MonthlySurvivalCard
              availableLKR={snapshot.availableLKR}
              debitActivityThisMonth={snapshot.debitActivityThisMonth}
              monthPrefix={snapshot.monthPrefix}
            />
            {showHealthSlot ? (
              <div className="min-w-0">
                {intelLoading ? (
                  <div className="finwise-card animate-pulse rounded-2xl p-4">
                    <SkeletonBlock className="h-3 w-28" />
                    <SkeletonBlock className="mt-4 h-10 w-24" />
                  </div>
                ) : health ? (
                  <FinancialHealthScoreCard health={health} variant="compact" />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <DashboardKpiStrip
          availableLKR={snapshot.availableLKR}
          healthScore={health?.score ?? null}
          healthLabel={health?.label ?? null}
          savingsPct={savingsPct}
          loadingHealth={intelLoading}
        />

        <SmartAlertsPanel
          alerts={snapshot.alerts}
          summary={snapshot.alertSummary}
          source={snapshot.alertSource}
          variant="cockpit"
        />

        <Link
          to="/insights"
          className="finwise-card finwise-hover flex items-center justify-center rounded-2xl border border-fw-red-200/60 bg-fw-panel px-4 py-3 text-center text-sm font-semibold text-fw-red-700 shadow-[0_2px_8px_-3px_rgba(227,29,35,0.12)] transition hover:border-fw-red-300 hover:brightness-[1.02] dark:border-fw-red-500/25"
        >
          View detailed insights →
        </Link>
        </section>
      </div>
    </ShellPageBody>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <SkeletonBlock className="h-16 w-full max-w-xl rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 lg:col-span-8">
          <BalanceSkeleton />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
          <SkeletonBlock className="h-[4.5rem] w-full rounded-2xl" />
          <SkeletonBlock className="h-[100px] w-full rounded-2xl" />
        </div>
      </div>
      <div className="finwise-card rounded-2xl px-3 py-3 backdrop-blur-md sm:px-4">
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16 min-w-[148px] shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="finwise-card min-w-0 rounded-2xl p-4 backdrop-blur-md">
        <SkeletonBlock className="h-4 w-32" />
        <SkeletonBlock className="mt-3 h-10 w-full rounded-xl" />
        <SkeletonBlock className="mt-2 h-10 w-full rounded-xl" />
      </div>
      <SkeletonBlock className="h-12 w-full rounded-2xl" />
    </div>
  );
}
