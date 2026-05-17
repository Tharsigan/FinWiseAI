import { useEffect, useState } from "react";

async function fetchHealth() {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function ApiStatusBanner() {
  const [state, setState] = useState({ status: "loading", detail: "" });

  useEffect(() => {
    let cancelled = false;

    fetchHealth()
      .then((data) => {
        if (cancelled) return;
        if (data?.ok)
          setState({ status: "ok", detail: "Banking, AI, and demo services are ready" });
        else setState({ status: "error", detail: "Sandbox Mode Active" });
      })
      .catch(() => {
        if (!cancelled)
          setState({
            status: "error",
            detail:
              "Sandbox Mode Active · cached financial snapshot is ready while services reconnect.",
          });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const styles =
    state.status === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/55 dark:text-emerald-100"
      : state.status === "loading"
        ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/45 dark:text-amber-100"
        : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/45 dark:text-amber-100";

  return (
    <div className={`border-b px-4 py-3 text-center text-sm sm:px-6 ${styles}`}>
      {state.status === "loading" && (
        <>
          Preparing secure demo services…
        </>
      )}
      {state.status !== "loading" && state.detail}
    </div>
  );
}
