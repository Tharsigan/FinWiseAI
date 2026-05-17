import { useState } from "react";
import { FriendlyErrorState } from "../FinwiseUI.jsx";
import { postMoneyAdvice } from "../../services/api.js";

export default function AskYourMoney() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [result, setResult] = useState(
    /** @type {{ affordability?: string; risk?: string; recommendation?: string; disclaimer?: string } | null} */ (
      null
    ),
  );

  async function submit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = /** @type {Record<string, unknown>} */ (await postMoneyAdvice({ question: q }));
      setResult({
        affordability: typeof data.affordability === "string" ? data.affordability : "",
        risk: typeof data.risk === "string" ? data.risk : "",
        recommendation: typeof data.recommendation === "string" ? data.recommendation : "",
        disclaimer: typeof data.disclaimer === "string" ? data.disclaimer : "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="finwise-card mt-8 rounded-2xl p-5 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-red-600">
        Ask your money
      </p>
      <p className="mt-2 text-sm text-fw-muted">
        Read-only check against your snapshot (no transfers). Uses a single AI request per
        question.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-xs font-medium text-fw-muted">
          Question
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-xl border border-fw-border bg-fw-panel px-3 py-2 text-sm text-fw-ink shadow-sm placeholder:text-fw-muted focus:border-fw-red-500 focus:outline-none focus:ring-2 focus:ring-fw-red-500/25"
            placeholder="Can I afford a LKR 15,000 weekend trip next month?"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded-full bg-fw-red-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition enabled:hover:bg-fw-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Analyzing…" : "Get guidance"}
        </button>
      </form>

      {error ? (
        <div className="mt-4">
          <FriendlyErrorState message={error} />
        </div>
      ) : null}

      {result ? (
        <div className="mt-6 space-y-4 text-sm text-fw-ink">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fw-muted">
              Affordability
            </p>
            <p className="mt-1 leading-relaxed">{result.affordability}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fw-muted">Risk</p>
            <p className="mt-1 leading-relaxed">{result.risk}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-fw-muted">
              Recommendation
            </p>
            <p className="mt-1 leading-relaxed">{result.recommendation}</p>
          </div>
          {result.disclaimer ? (
            <p className="text-xs text-fw-muted">{result.disclaimer}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
