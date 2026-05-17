import BrandLogo from "./BrandLogo.jsx";

export default function FullPageSpinner({
  label = "Preparing your FinWise snapshot...",
  detail,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-fw-border bg-fw-panel/90 px-6 py-12 text-center text-sm text-fw-ink shadow-inner shadow-fw-red-950/10 backdrop-blur dark:shadow-black/30">
      <span className="block animate-pulse" aria-hidden>
        <BrandLogo className="h-14 w-14 object-contain" alt="" />
      </span>
      <div>
        <p className="text-base font-semibold text-fw-ink">{label}</p>
        {detail ? (
          <p className="mt-2 max-w-md text-xs leading-relaxed text-fw-muted">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  );
}
