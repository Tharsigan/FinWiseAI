export default function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-fw-red-600/25 bg-fw-rose-soft/90 px-2.5 py-1 text-xs font-medium text-fw-red-700">
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-fw-red-600" />
      Investor demo
    </span>
  );
}
