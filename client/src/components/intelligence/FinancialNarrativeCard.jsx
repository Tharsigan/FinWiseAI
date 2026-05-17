/** @param {{ narrative: { lines: string[] } }} props */
export default function FinancialNarrativeCard({ narrative }) {
  if (!narrative?.lines?.length) return null;
  return (
    <section className="finwise-card finwise-hover rounded-2xl p-5 backdrop-blur-md">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
        Timeline narrative
      </p>
      <ul className="mt-4 space-y-2 text-sm text-fw-ink">
        {narrative.lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-medium text-fw-red-600">—</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
