/**
 * Client-only savings goal overlay: mutates ONLY `snapshot.savingsGoal` when merging.
 * Full planner state uses a v2 envelope in localStorage; v1 flat blobs are migrated.
 */

const OVERLAY_KEY_V2 = "finwise.savingsOverlay.v2";
const LEGACY_KEY_V1 = "finwise.activeSavingsGoal.v1";
const FLASH_SESSION_KEY = "finwise.savingsFlash.v1";
const AUTO_PIN_KEY = "finwise.autoPinAfterCompute.v1";

const FLASH_MS = 90_000;

/** @typedef {{ title: string; targetAmount: number; savedAmount: number; targetDateISO: string; monthlyIncome: number; monthlyExpensesSnapshot: number }} SavingsGoalLike */

/** @typedef {'computed' | 'pinned'} SavingsOverlayLifecycle */

/**
 * @typedef {{
 *   version: 2;
 *   lifecycle: SavingsOverlayLifecycle;
 *   goal: SavingsGoalLike;
 *   updatedAtISO: string;
 * }} SavingsOverlayEnvelopeV2
 */

/** @param {unknown} value */
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/** @param {unknown} parsed */
function goalFromPlainObject(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (parsed);
  const title = typeof o.title === "string" ? o.title : "";
  const targetDateISO = typeof o.targetDateISO === "string" ? o.targetDateISO : "";
  const targetAmount = num(o.targetAmount);
  const savedAmount = num(o.savedAmount);
  const monthlyIncome = num(o.monthlyIncome);
  const monthlyExpensesSnapshot = num(o.monthlyExpensesSnapshot);
  if (
    !title ||
    !/^\d{4}-\d{2}-\d{2}$/.test(targetDateISO) ||
    Number.isNaN(targetAmount) ||
    Number.isNaN(savedAmount) ||
    Number.isNaN(monthlyIncome) ||
    Number.isNaN(monthlyExpensesSnapshot)
  ) {
    return null;
  }
  return /** @type {SavingsGoalLike} */ ({
    title,
    targetAmount,
    savedAmount,
    targetDateISO,
    monthlyIncome,
    monthlyExpensesSnapshot,
  });
}

/** @returns {SavingsOverlayEnvelopeV2 | null} */
function readEnvelopeV2() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(OVERLAY_KEY_V2);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const o = /** @type {Record<string, unknown>} */ (parsed);
    if (o.version !== 2) return null;
    const lifecycle = o.lifecycle === "computed" || o.lifecycle === "pinned" ? o.lifecycle : null;
    const updatedAtISO = typeof o.updatedAtISO === "string" ? o.updatedAtISO : "";
    const goal = goalFromPlainObject(o.goal);
    if (!lifecycle || !updatedAtISO || !goal) return null;
    return { version: 2, lifecycle, goal, updatedAtISO };
  } catch {
    return null;
  }
}

/** @returns {SavingsOverlayEnvelopeV2 | null} */
function migrateLegacyV1() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY_V1);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const goal = goalFromPlainObject(parsed);
    if (!goal) return null;
    const env = /** @type {SavingsOverlayEnvelopeV2} */ ({
      version: 2,
      lifecycle: "pinned",
      goal,
      updatedAtISO: new Date().toISOString(),
    });
    window.localStorage.setItem(OVERLAY_KEY_V2, JSON.stringify(env));
    window.localStorage.removeItem(LEGACY_KEY_V1);
    return env;
  } catch {
    return null;
  }
}

/**
 * Active overlay: computed or pinned planner goal. Absence means Dashboard uses bundle mock.
 * @returns {{ lifecycle: SavingsOverlayLifecycle; goal: SavingsGoalLike; updatedAtISO: string } | null}
 */
export function readSavingsOverlayState() {
  const v2 = readEnvelopeV2() || migrateLegacyV1();
  if (!v2) return null;
  return {
    lifecycle: v2.lifecycle,
    goal: v2.goal,
    updatedAtISO: v2.updatedAtISO,
  };
}

/** @returns {SavingsGoalLike | null} Goal only (Planner status line). */
export function readOverlayGoal() {
  const st = readSavingsOverlayState();
  return st ? st.goal : null;
}

/** @param {SavingsOverlayEnvelopeV2} envelope */
function writeEnvelopeV2(envelope) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OVERLAY_KEY_V2, JSON.stringify(envelope));
  window.localStorage.removeItem(LEGACY_KEY_V1);
}

/**
 * @param {SavingsOverlayLifecycle} lifecycle
 */
export function triggerSavingsGoalFlash(lifecycle) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      FLASH_SESSION_KEY,
      JSON.stringify({ lifecycle, expiresAt: Date.now() + FLASH_MS }),
    );
  } catch {
    /* quota / private mode */
  }
}

/** @returns {{ lifecycle: SavingsOverlayLifecycle } | null} */
export function readSavingsGoalFlash() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(FLASH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const o = /** @type {Record<string, unknown>} */ (parsed);
    const expiresAt = num(o.expiresAt);
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
      window.sessionStorage.removeItem(FLASH_SESSION_KEY);
      return null;
    }
    const lifecycle = o.lifecycle === "computed" || o.lifecycle === "pinned" ? o.lifecycle : null;
    return lifecycle ? { lifecycle } : null;
  } catch {
    return null;
  }
}

export function dismissSavingsGoalFlash() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(FLASH_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function readAutoPinAfterCompute() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTO_PIN_KEY) === "1";
}

/** @param {boolean} value */
export function writeAutoPinAfterCompute(value) {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(AUTO_PIN_KEY, "1");
  else window.localStorage.removeItem(AUTO_PIN_KEY);
}

/**
 * @param {Record<string, unknown>} result
 * @param {Record<string, unknown>} requestPayload
 * @param {SavingsOverlayLifecycle} lifecycle
 */
function persistEnvelopeFromPlanner(result, requestPayload, lifecycle) {
  const goal = planResponseToGoal(result, requestPayload);
  if (!goal) return false;
  writeEnvelopeV2({
    version: 2,
    lifecycle,
    goal,
    updatedAtISO: new Date().toISOString(),
  });
  triggerSavingsGoalFlash(lifecycle);
  return true;
}

/**
 * @param {Record<string, unknown>} result
 * @param {Record<string, unknown>} requestPayload
 */
export function persistComputedPlannerResult(result, requestPayload) {
  return persistEnvelopeFromPlanner(result, requestPayload, "computed");
}

/**
 * @param {Record<string, unknown>} result
 * @param {Record<string, unknown>} requestPayload
 */
export function persistPinnedPlannerResult(result, requestPayload) {
  return persistEnvelopeFromPlanner(result, requestPayload, "pinned");
}

/** Promote existing computed overlay to pinned (Track). */
export function promoteOverlayToPinned() {
  const st = readSavingsOverlayState();
  if (!st) return false;
  writeEnvelopeV2({
    version: 2,
    lifecycle: "pinned",
    goal: st.goal,
    updatedAtISO: new Date().toISOString(),
  });
  triggerSavingsGoalFlash("pinned");
  return true;
}

export function clearSavingsOverlay() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(OVERLAY_KEY_V2);
  window.localStorage.removeItem(LEGACY_KEY_V1);
  dismissSavingsGoalFlash();
}

// --- Backward-compatible names (deprecated internal use) ---

/** @deprecated Use readOverlayGoal */
export function readActiveSavingsGoal() {
  return readOverlayGoal();
}

/** @deprecated Use persistPinnedPlannerResult / envelope APIs */
export function writeActiveSavingsGoal(goal) {
  writeEnvelopeV2({
    version: 2,
    lifecycle: "pinned",
    goal,
    updatedAtISO: new Date().toISOString(),
  });
  triggerSavingsGoalFlash("pinned");
}

/** @deprecated Use clearSavingsOverlay */
export function clearActiveSavingsGoal() {
  clearSavingsOverlay();
}

/**
 * @param {number} months
 */
function addMonthsNow(months) {
  const n = Math.max(1, Math.round(Number(months) || 0));
  const next = new Date();
  next.setMonth(next.getMonth() + n);
  return next.toISOString().slice(0, 10);
}

/**
 * @param {Record<string, unknown>} result Planner API envelope (goal, computed, …)
 * @param {{ goalLabel: string; monthlyIncome?: number; monthlyExpenses?: number }} requestPayload
 */
export function planResponseToGoal(result, requestPayload) {
  const computedRaw = result?.computed;
  if (!computedRaw || typeof computedRaw !== "object") return null;
  const computed = /** @type {Record<string, unknown>} */ (computedRaw);

  const goalRaw = result?.goal && typeof result.goal === "object" ? result.goal : null;
  const goal = /** @type {Record<string, unknown>|null} */ (goalRaw);

  let targetDateISO =
    typeof goal?.targetDateISO === "string" ? goal.targetDateISO : "";

  const monthsRemaining = Number(computed.monthsRemaining);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(targetDateISO) &&
    typeof monthsRemaining === "number" &&
    !Number.isNaN(monthsRemaining)
  ) {
    targetDateISO = addMonthsNow(monthsRemaining);
  }

  const title =
    typeof goal?.label === "string" && goal.label.trim()
      ? goal.label.trim()
      : String(requestPayload.goalLabel || "").trim() || "Savings goal";

  const targetAmount = Number(computed.targetAmountLKR);
  const savedAmount = Number(computed.currentSavingsLKR);
  if (
    Number.isNaN(targetAmount) ||
    Number.isNaN(savedAmount) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(targetDateISO)
  ) {
    return null;
  }

  const monthlyIncome = num(requestPayload.monthlyIncome);
  const monthlyExpensesSnapshot = num(requestPayload.monthlyExpenses);

  if (Number.isNaN(monthlyIncome) || Number.isNaN(monthlyExpensesSnapshot)) {
    return null;
  }

  return /** @type {SavingsGoalLike} */ ({
    title,
    targetAmount,
    savedAmount,
    targetDateISO,
    monthlyIncome,
    monthlyExpensesSnapshot,
  });
}

/**
 * Sole snapshot mutation for savings: replaces only `savingsGoal`. Does not touch
 * balances, normalized rows, budgets, or alerts.
 * @param {Record<string, unknown> | null} snapshot
 */
export function overlaySavingsGoalOnSnapshot(snapshot) {
  if (!snapshot) return snapshot;
  const overlay = readSavingsOverlayState();
  if (!overlay) return snapshot;
  return {
    ...snapshot,
    savingsGoal: overlay.goal,
  };
}

/** @alias */
export const applyActiveSavingsGoalToSnapshot = overlaySavingsGoalOnSnapshot;
