import { useEffect, useState } from "react";
import { fetchIntelligenceOverlay } from "../services/api.js";

/**
 * Single overlay request for dashboard intelligence cards (read-only demo snapshot).
 * @returns {{ overlay: Record<string, unknown>|null; error: string|null; loading: boolean }}
 */
export function useIntelligenceOverlay() {
  const [overlay, setOverlay] = useState(/** @type {Record<string, unknown>|null} */ (null));
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    fetchIntelligenceOverlay()
      .then((data) => {
        if (!cancelled) {
          setOverlay(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { overlay, error, loading };
}
