import { useIntelligenceOverlay } from "../../hooks/useIntelligenceOverlay.js";
import IntelligenceBelowFold from "./IntelligenceBelowFold.jsx";

/** Legacy full-page intelligence grid (single overlay fetch). Prefer composing Dashboard with the hook + fragments. */
export default function IntelligenceSection() {
  const { overlay, error, loading } = useIntelligenceOverlay();

  if (error) {
    return (
      <section className="finwise-card rounded-2xl border border-amber-200/80 bg-amber-50/80 p-5 text-sm text-amber-900 backdrop-blur-md">
        Intelligence layer unavailable: {error}
      </section>
    );
  }

  if (loading || !overlay) {
    return (
      <section className="finwise-card animate-pulse rounded-2xl p-5 backdrop-blur-md">
        <div className="h-4 w-40 rounded bg-fw-border dark:bg-fw-border/50" />
        <div className="mt-4 h-24 rounded-xl bg-fw-border/40 dark:bg-fw-border/25" />
      </section>
    );
  }

  return <IntelligenceBelowFold overlay={overlay} />;
}
