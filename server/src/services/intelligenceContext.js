import { buildDashboardSnapshot } from "./snapshotService.js";

/**
 * Read-only snapshot context for the intelligence layer (no bank/Seylan calls).
 */
export function buildIntelligenceContext() {
  const snap = buildDashboardSnapshot();
  return {
    snap,
    liveBalanceLKR: snap.availableLKR,
    liveTransactions: snap.normalized,
    source: /** @type {const} */ ("snapshot_only"),
  };
}
