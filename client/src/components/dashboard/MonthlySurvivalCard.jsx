import { computeMonthlySurvival } from "../../lib/financialClarity.js";

/** @param {{ availableLKR: number; debitActivityThisMonth: number; monthPrefix: string }} props */
export default function MonthlySurvivalCard({
  availableLKR,
  debitActivityThisMonth,
  monthPrefix,
}) {
  const result = computeMonthlySurvival({
    availableLKR,
    debitActivityThisMonth,
    monthPrefix,
  });

  const stripe =
    result.tier === "safe"
      ? "border-emerald-200 bg-emerald-50/85"
      : result.tier === "caution"
        ? "border-amber-200 bg-amber-50/85"
        : "border-red-200 bg-red-50/85";

  const dot =
    result.tier === "safe"
      ? "bg-emerald-500"
      : result.tier === "caution"
        ? "bg-amber-500"
        : "bg-red-600";

  const label =
    result.tier === "safe"
      ? "Monthly survival · OK"
      : result.tier === "caution"
        ? "Monthly survival · Heads-up"
        : "Monthly survival · Risk";

  return (
    <section
      aria-live="polite"
      className={`finwise-card rounded-2xl border ${stripe} px-5 py-4 backdrop-blur-md`}
    >
      <div className="flex gap-4">
        <span
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fw-muted">
            {label}
          </p>
          <p className="mt-2 text-base font-semibold leading-snug text-fw-strong">
            {result.headline}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-fw-muted">{result.subline}</p>
        </div>
      </div>
    </section>
  );
}
