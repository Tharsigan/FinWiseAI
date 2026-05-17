import { useFinwiseData } from "../context/FinwiseDataProvider.jsx";
import { FriendlyErrorState } from "./FinwiseUI.jsx";

export default function OfflineDataRibbon() {
  const { source, error, refresh } = useFinwiseData();

  if (source !== "local") return null;

  return (
    <div className="mb-6 shrink-0">
      <FriendlyErrorState
        title="Sandbox Mode Active"
        message="We're using cached financial data while reconnecting to banking services. Your dashboard, transfers, AI flow, and savings demo remain available."
        onRetry={() => refresh()}
      />
      {error ? <p className="sr-only">{error}</p> : null}
    </div>
  );
}
