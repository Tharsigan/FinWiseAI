import { useState } from "react";

const VARIANTS = /** @type {const} */ ({
  danger: {
    tint: "border-red-200 bg-red-50/90 text-red-950 dark:border-red-500/35 dark:bg-red-950/45 dark:text-red-100",
    dot: "bg-red-600",
    chip: "bg-red-600",
    eyebrow: "text-red-600 dark:text-red-300",
  },
  warning: {
    tint: "border-amber-200 bg-amber-50/90 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/45 dark:text-amber-100",
    dot: "bg-amber-500",
    chip: "bg-amber-500",
    eyebrow: "text-amber-600 dark:text-amber-300",
  },
  info: {
    tint: "border-emerald-200 bg-emerald-50/90 text-emerald-950 dark:border-emerald-500/35 dark:bg-emerald-950/45 dark:text-emerald-100",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500",
    eyebrow: "text-emerald-600 dark:text-emerald-300",
  },
});

/** Kept for callers that slice alert remainders (e.g. legacy constants). */
export const SMART_ALERTS_PREVIEW_LIMIT = 3;

/** Home cockpit: hard max alerts (silent truncate). */
export const COCKPIT_ALERTS_MAX = 2;

/** @type {(alert: { severity: 'info'|'warning'|'danger' }) => keyof typeof VARIANTS} */
function vibeFor(alert) {
  return VARIANTS[alert.severity] ? alert.severity : "info";
}

/**
 * Full-detail alert cards (expanded layouts).
 * @param {{ alerts: { id:string; severity:'info'|'warning'|'danger'; title:string; message:string; recommendation?:string; metricLabel?:string; metricValue?:string;}[]; showIndices?: boolean; indexOffset?: number }} props
 */
export function SmartAlertsExpandedCards({ alerts, showIndices = false, indexOffset = 0 }) {
  if (alerts.length === 0) return null;
  return (
    <ul className="space-y-4">
      {alerts.map((alert, index) => (
        <ExpandedAlertItem
          key={alert.id}
          alert={alert}
          ordinal={showIndices ? indexOffset + index + 1 : undefined}
        />
      ))}
    </ul>
  );
}

/** @param {{ alert: { id:string; severity:'info'|'warning'|'danger'; title:string; message:string; recommendation?:string; metricLabel?:string; metricValue?:string;}; ordinal?: number }} props */
function ExpandedAlertItem({ alert, ordinal }) {
  const vibe = VARIANTS[vibeFor(alert)];
  const label =
    alert.severity === "danger"
      ? "Action"
      : alert.severity === "warning"
        ? "Heads-up"
        : "Insight";

  return (
    <li
      className={`finwise-hover rounded-2xl border px-5 py-4 text-sm shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] ${vibe.tint}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-3 py-[0.125rem] text-[11px] font-semibold uppercase tracking-[0.2em] ${vibe.chip} text-white`}
        >
          {label}
        </span>
        {ordinal !== undefined ? (
          <span className={`text-[11px] font-semibold ${vibe.eyebrow}`}>
            #{`${ordinal}`.padStart(2, "0")}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-base font-semibold tracking-tight">{alert.title}</p>
      <p className="mt-3 text-[0.9375rem] leading-relaxed">{alert.message}</p>
      {alert.recommendation ? (
        <p className="mt-3 rounded-xl bg-fw-panel/55 px-3 py-2 text-xs font-medium leading-relaxed dark:bg-black/25">
          Next move: {alert.recommendation}
        </p>
      ) : null}
      {alert.metricLabel && alert.metricValue ? (
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-75">
          {alert.metricLabel} · {alert.metricValue}
        </p>
      ) : null}
    </li>
  );
}

/**
 * @param {{
 *   alerts:{ id:string; severity:'info'|'warning'|'danger'; title:string; message:string; recommendation?:string; metricLabel?:string; metricValue?:string;}[];
 *   summary?:Record<string, unknown>|null;
 *   source?:string|null;
 *   variant?: 'cockpit' | 'hub';
 * }} props
 */
export default function SmartAlertsPanel({
  alerts,
  summary = null,
  source = null,
  variant = "hub",
}) {
  const isCockpit = variant === "cockpit";
  const empty = alerts.length === 0;
  const preview = isCockpit ? alerts.slice(0, COCKPIT_ALERTS_MAX) : alerts;

  const dangerCount = Number(summary?.dangerCount ?? 0);
  const warningCount = Number(summary?.warningCount ?? 0);
  const sourceLabel =
    source === "seylan_sandbox"
      ? "Seylan sandbox"
      : source === "fallback_mock"
        ? "Demo fallback"
        : "Express engine";

  const [expandedId, setExpandedId] = useState(/** @type {string|null} */ (null));

  function toggleRow(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const cockpitHint =
    !empty && alerts.length > COCKPIT_ALERTS_MAX
      ? `Showing ${COCKPIT_ALERTS_MAX} of ${alerts.length}. Open Insights for the full list.`
      : null;

  return (
    <section className="finwise-card finwise-hover rounded-2xl p-4 backdrop-blur-md sm:p-5">
      <div className="border-b border-fw-border/90 pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          Smart alerts
        </p>
        <p className="mt-1 text-xs leading-snug text-fw-muted">
          Signals from <span className="font-semibold text-fw-ink">{sourceLabel}</span>
          {isCockpit ? (
            <> — open Insights for details.</>
          ) : (
            <> — tap a row for detail.</>
          )}
        </p>
        {cockpitHint ? (
          <p className="mt-2 text-[11px] text-fw-muted">{cockpitHint}</p>
        ) : null}
        {summary ? (
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-muted">
            {dangerCount} action · {warningCount} heads-up
            {!isCockpit ? (
              <>
                {" "}
                · refreshed {new Date(String(summary.generatedAt)).toLocaleTimeString()}
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {empty ? (
        <p className="mt-4 text-sm text-fw-muted">
          You are on track. No budget, balance, or savings risks need attention right now.
        </p>
      ) : isCockpit ? (
        <ul className="mt-3 space-y-2">
          {preview.map((alert) => {
            const vibe = VARIANTS[vibeFor(alert)];
            return (
              <li key={alert.id}>
                <div
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 ${vibe.tint}`}
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${vibe.dot}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold text-fw-strong">
                      {alert.title}
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div
          className="mt-3 max-h-[13rem] min-h-0 overflow-y-auto overscroll-y-contain pr-1"
          role="region"
          aria-label="Smart alerts list"
        >
          <ul className="space-y-2">
            {preview.map((alert) => {
              const vibe = VARIANTS[vibeFor(alert)];
              const open = expandedId === alert.id;
              return (
                <li key={alert.id}>
                  <button
                    type="button"
                    onClick={() => toggleRow(alert.id)}
                    aria-expanded={open}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:brightness-[1.02] ${vibe.tint}`}
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${vibe.dot}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm font-semibold text-fw-strong">
                        {alert.title}
                      </span>
                      {open ? (
                        <span className="mt-2 block text-[0.8125rem] leading-relaxed text-fw-ink">
                          {alert.message}
                          {alert.recommendation ? (
                            <span className="mt-2 block rounded-lg bg-fw-panel/60 px-2 py-1.5 text-xs font-medium dark:bg-black/30">
                              Next: {alert.recommendation}
                            </span>
                          ) : null}
                          {alert.metricLabel && alert.metricValue ? (
                            <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-muted">
                              {alert.metricLabel} · {alert.metricValue}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className={`shrink-0 text-fw-muted transition ${open ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
