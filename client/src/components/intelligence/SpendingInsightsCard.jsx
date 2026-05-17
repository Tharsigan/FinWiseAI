/** @param {{ spendingInsights: { insights: string[] } }} props */
export default function SpendingInsightsCard({ spendingInsights }) {
  if (!spendingInsights?.insights?.length) return null;
  return (
    <section className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
        Spending insights
      </p>
      <ul className="mt-4 space-y-2 text-sm text-fw-ink">
        {spendingInsights.insights.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-fw-red-500">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
