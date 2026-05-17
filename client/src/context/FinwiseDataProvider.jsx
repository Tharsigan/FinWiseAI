import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyActiveSavingsGoalToSnapshot,
  readSavingsGoalFlash,
  readSavingsOverlayState,
} from "../lib/activeSavingsGoal.js";
import { applyIncomeAllocationsToSnapshot } from "../lib/incomeAllocations.js";
import { getPhaseTwoSnapshot } from "../lib/phaseTwoSnapshot.js";
import { fetchMockSnapshot } from "../services/api.js";

/** @typedef {{ lifecycle: 'mock' | 'computed' | 'pinned'; updatedAtISO: string | null }} SavingsGoalMeta */

const FinwiseContext = createContext({
  loading: true,
  /** @type {Snapshot|null} */
  snapshot: null,
  /** @type {SavingsGoalMeta} */
  savingsGoalMeta: { lifecycle: "mock", updatedAtISO: null },
  /** @type {{ lifecycle: 'computed'|'pinned' } | null} */
  savingsGoalFlash: null,
  /** @type {'api'|'local'|'idle'} */
  source: "idle",
  /** @type {string|null} */
  error: null,
  /** @type {() => Promise<void>} */
  refresh: async () => {},
  /** @type {() => void} */
  syncIncomeAllocations: () => {},
  /** @type {() => void} */
  invalidateLocalPatches: () => {},
});

export function FinwiseDataProvider({ children }) {
  const [loading, setLoading] = useState(true);
  /** Unmerged Phase 3 snapshot — income overlays and dashboard savings goal merged on read. */
  const [rawSnapshot, setRawSnapshot] = useState(/** @type {Snapshot|null} */ (null));
  const [source, setSource] = useState(/** @type {'api'|'local'|'idle'} */ ("idle"));
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [patchNonce, setPatchNonce] = useState(0);

  const invalidateLocalPatches = useCallback(() => {
    setPatchNonce((n) => n + 1);
  }, []);

  const derived = useMemo(() => {
    if (!rawSnapshot) {
      return {
        snapshot: /** @type {Snapshot|null} */ (null),
        savingsGoalMeta: /** @type {SavingsGoalMeta} */ ({
          lifecycle: "mock",
          updatedAtISO: null,
        }),
        savingsGoalFlash: /** @type {{ lifecycle: 'computed'|'pinned' } | null} */ (null),
      };
    }

    /** Income allocation layer only touches `normalized` — savings overlay does not mutate other fields. */
    const mergedAlloc = applyIncomeAllocationsToSnapshot(rawSnapshot);

    /** Replaces ONLY `snapshot.savingsGoal`; never swaps balances/transactions/alerts root. */
    const snapshotMerged = applyActiveSavingsGoalToSnapshot(mergedAlloc);

    const overlay = readSavingsOverlayState();

    /** @type {SavingsGoalMeta} */
    const savingsGoalMeta = overlay
      ? {
          lifecycle: overlay.lifecycle,
          updatedAtISO: overlay.updatedAtISO,
        }
      : { lifecycle: "mock", updatedAtISO: null };

    const savingsGoalFlash = readSavingsGoalFlash();

    return { snapshot: snapshotMerged, savingsGoalMeta, savingsGoalFlash };
  }, [rawSnapshot, patchNonce]);

  const snapshot = derived.snapshot;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMockSnapshot();
      setRawSnapshot(data);
      setSource("api");
    } catch (err) {
      setRawSnapshot(getPhaseTwoSnapshot());
      setSource("local");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const syncIncomeAllocations = useCallback(() => {
    invalidateLocalPatches();
  }, [invalidateLocalPatches]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    return {
      loading,
      snapshot,
      savingsGoalMeta: derived.savingsGoalMeta,
      savingsGoalFlash: derived.savingsGoalFlash,
      source,
      error,
      refresh,
      syncIncomeAllocations,
      invalidateLocalPatches,
    };
  }, [
    loading,
    snapshot,
    derived.savingsGoalMeta,
    derived.savingsGoalFlash,
    source,
    error,
    refresh,
    syncIncomeAllocations,
    invalidateLocalPatches,
  ]);

  return (
    <FinwiseContext.Provider value={value}>{children}</FinwiseContext.Provider>
  );
}

export function useFinwiseData() {
  return useContext(FinwiseContext);
}
