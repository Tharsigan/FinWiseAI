export function SandboxModeBadge({ source, className = "" }) {
  const active = source === "seylan_sandbox";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.12em] ${active
        ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/55 dark:text-emerald-200"
        : "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-200"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`}
      />
      {active ? "Sandbox Connected" : "Sandbox Mode Active"}
    </span>
  );
}

export function FriendlyErrorState({
  title = "We are reconnecting to banking services",
  message = "We're using cached financial data while reconnecting to banking services.",
  onRetry,
  compact = false,
}) {
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50 text-amber-950 shadow-sm shadow-amber-700/10 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-100 dark:shadow-amber-950/30 ${compact ? "px-4 py-3" : "p-5"}`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/85">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900 transition hover:scale-[1.02] hover:border-amber-400 dark:border-amber-500/45 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:border-amber-400/80"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return <div aria-hidden className={`finwise-shimmer rounded-2xl ${className}`} />;
}

export function BalanceSkeleton() {
  return (
    <div className="finwise-card rounded-2xl p-6 sm:p-8">
      <SkeletonBlock className="h-4 w-40" />
      <SkeletonBlock className="mt-5 h-12 w-64 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
        <SkeletonBlock className="h-20" />
      </div>
    </div>
  );
}

export function TransactionsSkeleton() {
  return (
    <div className="finwise-card rounded-2xl p-5 backdrop-blur-md">
      <SkeletonBlock className="h-5 w-48" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-16" />
        ))}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="inline-flex items-center gap-2 rounded-2xl border border-fw-border bg-fw-panel px-4 py-3 text-sm text-fw-muted shadow-sm dark:shadow-black/25">
        <span className="font-medium">FinWise is typing</span>
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-fw-red-600"
              style={{ animationDelay: `${dot * 120}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
