import { useEffect, useMemo, useState } from "react";
import DemoBadge from "../components/DemoBadge.jsx";
import { FriendlyErrorState } from "../components/FinwiseUI.jsx";
import PageHeading from "../components/PageHeading.jsx";
import ShellPageBody from "../components/ShellPageBody.jsx";
import { useFinwiseData } from "../context/FinwiseDataProvider.jsx";
import {
  persistComputedPlannerResult,
  persistPinnedPlannerResult,
  promoteOverlayToPinned,
  readAutoPinAfterCompute,
  readOverlayGoal,
  readSavingsOverlayState,
  writeAutoPinAfterCompute,
} from "../lib/activeSavingsGoal.js";
import { formatLKR } from "../lib/formatMoney.js";
import { fetchAiStatus, postAiSavingsPlan, postSavingsPlan } from "../services/api.js";

export default function SavingsPlannerPage() {
  const { invalidateLocalPatches } = useFinwiseData();
  const [homeGoalTick, setHomeGoalTick] = useState(0);
  const [trackMessage, setTrackMessage] = useState(/** @type {string|null} */ (null));
  const [payload, setPayload] = useState({
    goalType: "Postgraduate",
    goalLabel: "Postgraduate tuition reserve",
    targetAmount: "485000",
    currentSavings: "137500",
    monthlyIncome: "78000",
    monthlyExpenses: "61200",
    monthsRemaining: "18",
  });
  const [result, setResult] = useState(/** @type {Record<string, unknown>|null} */ (null));
  const [busy, setBusy] = useState(false);
  const [narrationBusy, setNarrationBusy] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [aiCaps, setAiCaps] = useState(
    /** @type {{ configured: boolean; model: string } | null} */ (null),
  );

  useEffect(() => {
    fetchAiStatus()
      .then(setAiCaps)
      .catch(() => setAiCaps({ configured: false, model: "—" }));
  }, []);

  const statusLine = useMemo(() => {
    if (!aiCaps) return "Checking OpenAI readiness…";
    if (!aiCaps.configured) return "Planner works offline · configure OpenAI for coaching.";
    return `Engine ready · optional GPT coaching via ${aiCaps.model}`;
  }, [aiCaps]);

  async function analyze() {
    setBusy(true);
    setError(null);
    setTrackMessage(null);
    try {
      const data = await postSavingsPlan(buildRequestPayload());
      setResult(data);
      const req = buildRequestPayload();
      const pinned = readAutoPinAfterCompute();
      const wrote = pinned
        ? persistPinnedPlannerResult(/** @type {Record<string, unknown>} */ (data), req)
        : persistComputedPlannerResult(/** @type {Record<string, unknown>} */ (data), req);
      invalidateLocalPatches();
      setHomeGoalTick((n) => n + 1);
      if (wrote) {
        setTrackMessage(
          pinned
            ? "Plan activated (pinned). Open Dashboard — Savings progress shows this goal immediately."
            : "Planner numbers synced to Dashboard as computed — open Dashboard to verify the badge.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function addNarration() {
    setNarrationBusy(true);
    setError(null);
    try {
      const data = await postAiSavingsPlan(buildRequestPayload());
      setResult((prev) => ({
        ...(prev || {}),
        ...data,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setNarrationBusy(false);
    }
  }

  function buildRequestPayload() {
    return {
      goalType: payload.goalType,
      goalLabel: payload.goalLabel,
      targetAmount: Number(payload.targetAmount),
      currentSavings: Number(payload.currentSavings),
      monthlyIncome: Number(payload.monthlyIncome),
      monthlyExpenses: Number(payload.monthlyExpenses),
      monthsRemaining: Number(payload.monthsRemaining),
    };
  }

  const computed =
    result && typeof result.computed === "object" && result.computed !== null
      ? /** @type {Record<string, unknown>} */ (
          result.computed
        )
      : null;
  const recommendation =
    result && typeof result.recommendation === "object" && result.recommendation !== null
      ? /** @type {Record<string, unknown>} */ (
          result.recommendation
        )
      : null;
  const scenarios = result && Array.isArray(result.scenarios) ? result.scenarios : [];
  const milestones = result && Array.isArray(result.milestones) ? result.milestones : [];
  const narration =
    result && typeof result.narration === "object" && result.narration !== null
      ? /** @type {Record<string, unknown>} */ (
          result.narration
        )
      : null;

  const overlayLifecycle = useMemo(() => readSavingsOverlayState()?.lifecycle ?? null, [homeGoalTick]);
  const activeHomeGoal = useMemo(() => readOverlayGoal(), [homeGoalTick]);

  function activatePlanPinned() {
    const promoted = promoteOverlayToPinned();
    if (promoted) {
      invalidateLocalPatches();
      setHomeGoalTick((n) => n + 1);
      setTrackMessage("Plan activated (pinned). Dashboard updates immediately.");
      return;
    }
    if (!result) {
      setTrackMessage("Compute a plan first.");
      return;
    }
    const wrote = persistPinnedPlannerResult(
      /** @type {Record<string, unknown>} */ (result),
      buildRequestPayload(),
    );
    if (!wrote) {
      setTrackMessage("Could not map this plan — try computing again.");
      return;
    }
    invalidateLocalPatches();
    setHomeGoalTick((n) => n + 1);
    setTrackMessage("Plan activated (pinned). Dashboard updates immediately.");
  }

  function setAutoPin(value) {
    writeAutoPinAfterCompute(value);
    setHomeGoalTick((n) => n + 1);
  }

  const autoPin = readAutoPinAfterCompute();

  return (
    <ShellPageBody>
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl flex-1 space-y-2">
            <PageHeading eyebrow="Planner" title="Education savings runway" />
            <p className="text-sm leading-snug text-fw-muted">
              Run the engine — your latest computation syncs straight to Dashboard (computed state).
              Use <strong>Activate plan</strong> when you want the goal pinned after you approve it.
              To remove planner data and return to the bundled demo goal, clear it from{" "}
              <strong>Savings progress</strong> on the Dashboard (Home).
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fw-red-600">
              {statusLine}
            </p>
          </div>
          <DemoBadge />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <form
            className="finwise-card space-y-3 rounded-2xl p-5 backdrop-blur"
          onSubmit={(event) => {
            event.preventDefault();
            analyze();
          }}
        >
          <label className="block text-sm font-semibold text-fw-ink">
            Goal type
            <select
              value={payload.goalType}
              onChange={(event) =>
                setPayload((prev) => ({ ...prev, goalType: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm font-normal text-fw-ink shadow-inner outline-none ring-fw-red-600/25 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
            >
              <option>Undergraduate</option>
              <option>Postgraduate</option>
              <option>Certification</option>
              <option>Education</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-fw-ink">
            Goal label
            <input
              required
              value={payload.goalLabel}
              onChange={(event) =>
                setPayload((prev) => ({ ...prev, goalLabel: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm font-normal text-fw-ink shadow-inner outline-none ring-fw-red-600/25 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
            />
          </label>
          {[
            ["targetAmount", "Target amount (LKR)"],
            ["currentSavings", "Already saved (LKR)"],
            ["monthlyIncome", "Monthly income (LKR)"],
            ["monthlyExpenses", "Monthly expenses (LKR)"],
            ["monthsRemaining", "Months remaining"],
          ].map(([key, label]) => (
            <label key={key} className="block text-sm font-semibold text-fw-ink">
              {label}
              <input
                required
                type="number"
                min={key === "monthsRemaining" ? 1 : 0}
                step={key === "monthsRemaining" ? 1 : 100}
                value={payload[key]}
                onChange={(event) =>
                  setPayload((prev) => ({
                    ...prev,
                    [key]: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2.5 text-sm font-normal text-fw-ink shadow-inner outline-none ring-fw-red-600/25 placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-b from-[#E31D23] to-[#B81419] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-fw-red-700/40 transition hover:scale-[1.02] hover:brightness-105 disabled:from-zinc-300 disabled:to-zinc-300"
          >
            {busy ? "Crunching…" : "Compute savings plan"}
          </button>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-fw-border/90 bg-fw-panel/70 px-3 py-2.5 text-sm text-fw-ink">
            <input
              type="checkbox"
              checked={autoPin}
              onChange={(e) => setAutoPin(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-fw-border text-fw-red-600 ring-fw-red-500/30 focus:ring-2"
            />
            <span>
              Auto-activate (pin) immediately after each successful compute{" "}
              <span className="text-xs text-fw-muted">
                · skips computed-only state · optional
              </span>
            </span>
          </label>
        </form>

        <section className="finwise-card space-y-4 rounded-2xl bg-gradient-to-br from-white via-fw-rose-soft/40 to-white p-5">
          {error ? (
            <FriendlyErrorState
              title="Savings planner is using local mode"
              message="The planner can still calculate your goal while the coaching service reconnects."
            />
          ) : null}

          {!computed ? (
            <p className="text-sm text-fw-muted">
              Submit numbers to reveal the deterministic monthly requirement, feasibility,
              scenarios, and milestones.
            </p>
          ) : (
            <div className="space-y-3 rounded-2xl border border-fw-border/80 bg-fw-panel/95 p-4 text-sm text-fw-ink shadow-inner shadow-fw-red-950/35 dark:shadow-black/25">
              <p className="text-xs uppercase tracking-[0.16em] text-fw-red-600">
                Phase 9 engine · LKR
              </p>
              <MetricRow label="Feasibility" raw={computed.feasibility} bold />
              <MetricRow label="Progress" raw={`${String(computed.progressPercent)}%`} />
              <MetricRow label="Remaining goal" numeric={computed.remainingGoalLKR} />
              <MetricRow
                label="Required monthly sweep"
                numeric={computed.requiredMonthlySavingLKR}
              />
              <MetricRow
                label="Required weekly pace"
                numeric={computed.requiredWeeklySavingLKR}
              />
              <MetricRow
                label="Discretionary (income − spend)"
                numeric={computed.discretionaryMonthlyLKR}
              />
              <MetricRow label="Gap vs requirement" numeric={computed.discretionaryGapLKR} />
            </div>
          )}

          {computed ? (
            <div className="space-y-3 rounded-2xl border border-fw-red-200/70 bg-fw-rose-soft/30 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-fw-red-700">
                Home dashboard
              </p>
              {activeHomeGoal ? (
                <p className="text-sm text-fw-ink">
                  <span className="font-semibold text-fw-strong">Dashboard Savings progress:</span>{" "}
                  {activeHomeGoal.title}{" "}
                  <span className="text-fw-muted">
                    ({formatLKR(activeHomeGoal.savedAmount)} of{" "}
                    {formatLKR(activeHomeGoal.targetAmount)})
                  </span>
                  {overlayLifecycle ? (
                    <span className="ml-2 rounded-full bg-fw-panel/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-fw-red-700 ring-1 ring-fw-red-200 dark:ring-fw-red-500/40">
                      {overlayLifecycle}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-sm text-fw-muted">
                  No planner overlay saved — Dashboard shows the bundled mock goal until you compute.
                </p>
              )}
              <p className="text-xs text-fw-muted">
                After compute we save a <strong>computed</strong> overlay (or <strong>pinned</strong>{" "}
                if auto-activate is on). Use Activate to affirm tracking.
              </p>
              <button
                type="button"
                disabled={busy || !computed}
                onClick={activatePlanPinned}
                className="w-full rounded-xl bg-gradient-to-b from-[#E31D23] to-[#B81419] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-fw-red-700/35 transition hover:brightness-105 disabled:cursor-not-allowed disabled:from-zinc-300 disabled:to-zinc-300 sm:w-auto"
              >
                Activate plan
              </button>
              {trackMessage ? (
                <p className="text-xs font-medium text-emerald-800">{trackMessage}</p>
              ) : null}
            </div>
          ) : null}

          {recommendation ? (
            <div className="rounded-2xl border border-fw-border bg-fw-panel/95 p-4 text-sm text-fw-ink shadow-md dark:shadow-black/25">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.16em] text-fw-red-600">
                  Engine recommendation
                </p>
                <span className="rounded-full bg-fw-rose-soft px-3 py-1 text-xs font-semibold text-fw-red-700">
                  {String(recommendation.status ?? "Ready")}
                </span>
              </div>
              <MetricRow
                label="Monthly cut needed"
                numeric={Number(recommendation.monthlyCutNeededLKR)}
              />
              <MetricRow
                label="Recommended auto-sweep"
                numeric={Number(recommendation.recommendedMonthlyCommitmentLKR)}
              />
              {Array.isArray(recommendation.actionPlan) ? (
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {recommendation.actionPlan.map(
                    /** @param {unknown} step */
                    (step, index) => <li key={index}>{String(step)}</li>,
                  )}
                </ul>
              ) : null}
            </div>
          ) : null}

          {scenarios.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {scenarios.map((scenario, index) => (
                <ScenarioCard key={index} scenario={scenario} />
              ))}
            </div>
          ) : null}

          {milestones.length ? <MilestoneList rows={milestones} /> : null}

          {computed && aiCaps?.configured && !narration ? (
            <button
              type="button"
              disabled={narrationBusy}
              onClick={addNarration}
              className="w-full rounded-xl border border-fw-red-200 bg-fw-panel px-4 py-3 text-sm font-semibold text-fw-red-700 shadow-sm transition hover:scale-[1.02] hover:bg-fw-rose-soft disabled:cursor-not-allowed disabled:text-fw-muted"
            >
              {narrationBusy ? "Asking GPT…" : "Add GPT coaching"}
            </button>
          ) : null}

          {narration ? (
            <div className="rounded-2xl border border-fw-border bg-fw-panel/95 p-4 text-sm text-fw-ink shadow-md dark:shadow-black/25">
              <p className="text-xs uppercase tracking-[0.16em] text-fw-red-600">
                GPT narration
              </p>
              <p className="mt-3 leading-relaxed">{String(narration.summary ?? "")}</p>
              {Array.isArray(narration.nextSteps) ? (
                <div className="mt-4">
                  <p className="font-semibold text-fw-strong">Next steps</p>
                  <ul className="mt-2 list-disc space-y-2 pl-5">
                    {narration.nextSteps.map(
                      /** @param {unknown} step */
                      (step, index) => <li key={index}>{String(step)}</li>,
                    )}
                  </ul>
                </div>
              ) : null}
              {Array.isArray(narration.riskCallouts) &&
              narration.riskCallouts.length ? (
                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-amber-900">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                    Watch-outs
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {narration.riskCallouts.map(
                      /** @param {unknown} line */
                      (line, idx) => <li key={idx}>{String(line)}</li>,
                    )}
                  </ul>
                </div>
              ) : null}
              <p className="mt-4 text-xs text-fw-muted">
                {String(narration.closingDisclaimer ?? "")}
              </p>
            </div>
          ) : null}
        </section>
      </div>
      </div>
    </ShellPageBody>
  );
}

function ScenarioCard({ scenario }) {
  if (!scenario || typeof scenario !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (scenario);
  return (
    <div className="rounded-2xl border border-fw-border/80 bg-fw-panel/95 p-4 text-sm shadow-md shadow-fw-red-950/20 dark:shadow-black/25">
      <p className="font-semibold text-fw-strong">{String(row.label ?? "Scenario")}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-fw-red-600">
        {String(row.feasibility ?? "")}
      </p>
      <div className="mt-3 space-y-2">
        <MetricRow label="Monthly gap" numeric={Number(row.monthlyGapLKR)} />
        <MetricRow label="Savings rate" raw={`${String(row.savingsRatePercent ?? 0)}%`} />
      </div>
    </div>
  );
}

function MilestoneList({ rows }) {
  return (
    <div className="rounded-2xl border border-fw-border bg-fw-panel/95 p-4 text-sm text-fw-ink shadow-md dark:shadow-black/25">
      <p className="text-xs uppercase tracking-[0.16em] text-fw-red-600">
        Goal milestones
      </p>
      <div className="mt-3 space-y-2">
        {rows.map((row, index) => {
          if (!row || typeof row !== "object") return null;
          const item = /** @type {Record<string, unknown>} */ (row);
          return (
            <div
              key={index}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-fw-section px-3 py-2 dark:bg-white/[0.04]"
            >
              <span className="font-medium text-fw-strong">{String(item.percent)}%</span>
              <span className="text-fw-muted">{formatLKR(Number(item.thresholdAmountLKR))}</span>
              <span className="text-xs uppercase tracking-[0.12em] text-fw-muted">
                {item.reached ? "Reached" : String(item.estimatedMonth ?? "Not reachable")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricRow({ label, numeric, raw, bold = false }) {
  const display =
    typeof numeric === "number"
      ? formatLKR(numeric)
      : raw !== undefined && raw !== null
        ? String(raw)
        : "—";
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <span className="text-xs uppercase tracking-[0.14em] text-fw-muted">{label}</span>
      <span className={bold ? "font-semibold text-fw-red-700" : "font-medium text-fw-strong"}>
        {display}
      </span>
    </div>
  );
}
