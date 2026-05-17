import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DemoBadge from "../components/DemoBadge.jsx";
import FullPageSpinner from "../components/FullPageSpinner.jsx";
import PageHeading from "../components/PageHeading.jsx";
import ShellPageBody from "../components/ShellPageBody.jsx";
import { useFinwiseData } from "../context/FinwiseDataProvider.jsx";
import { formatLKR } from "../lib/formatMoney.js";
import { buildTransferSpendAdvisoryLines } from "../lib/financialClarity.js";
import { showMpgsHostedCheckoutPage } from "../lib/mpgsHostedCheckout.js";
import {
  createBankBeneficiary,
  createPaymentSession,
  fetchBankBeneficiaries,
  fetchPaymentStatus,
  postMockRecordPayment,
} from "../services/api.js";

const PAYMENT_CATEGORIES = [
  "Entertainment",
  "Food",
  "Transport",
  "Rent",
  "Mobile Data",
  "Savings",
  "Other",
];

const ADD_NEW_BENEFICIARY = "__add_new__";

const MPGS_PENDING_KEY = "finwise_mpgs_hosted_pending_v1";

/** @typedef {{ id: string; name: string; bankName?: string; accountNumberMasked?: string }} BeneficiaryRow */

export default function TransferPage() {
  const { loading, snapshot, refresh } = useFinwiseData();
  const [searchParams, setSearchParams] = useSearchParams();

  const [amount, setAmount] = useState("1200");
  const [memo, setMemo] = useState("Mess dues");
  const [category, setCategory] = useState("Food");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [beneficiaries, setBeneficiaries] = useState(
    /** @type {BeneficiaryRow[]} */ ([]),
  );
  const [beneficiariesReady, setBeneficiariesReady] = useState(false);
  const [beneficiariesLoadError, setBeneficiariesLoadError] = useState(
    /** @type {string|null} */ (null),
  );

  const [newBenName, setNewBenName] = useState("");
  const [newBenAccount, setNewBenAccount] = useState("");
  const [addBenError, setAddBenError] = useState(/** @type {string|null} */ (null));
  const [savingBeneficiary, setSavingBeneficiary] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(/** @type {string|null} */ (null));
  const [submission, setSubmission] = useState(
    /** @type {{envelope: unknown}|null} */ (null),
  );

  const [mpgsConfigured, setMpgsConfigured] = useState(false);
  const [mpgsStatusReady, setMpgsStatusReady] = useState(false);
  const [cardSubmitting, setCardSubmitting] = useState(false);
  const [mpgsCardError, setMpgsCardError] = useState(/** @type {string|null} */ (null));

  const loadBeneficiaries = useCallback(async () => {
    setBeneficiariesLoadError(null);
    try {
      const env = await fetchBankBeneficiaries();
      const block =
        env && typeof env === "object" && env.data !== undefined && env.data !== null
          ? /** @type {Record<string, unknown>} */ (env.data)
          : {};
      const items = Array.isArray(block.items) ? block.items : [];
      /** @type {BeneficiaryRow[]} */
      const rows = items
        .filter((x) => x && typeof x === "object")
        .map((x) => {
          const o = /** @type {Record<string, unknown>} */ (x);
          return {
            id: String(o.id ?? ""),
            name: String(o.name ?? ""),
            bankName: typeof o.bankName === "string" ? o.bankName : undefined,
            accountNumberMasked:
              typeof o.accountNumberMasked === "string"
                ? o.accountNumberMasked
                : undefined,
          };
        })
        .filter((r) => r.id.length > 0 && r.name.length > 0);
      setBeneficiaries(rows);
    } catch (err) {
      setBeneficiaries([]);
      setBeneficiariesLoadError(
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setBeneficiariesReady(true);
    }
  }, []);

  useEffect(() => {
    loadBeneficiaries();
  }, [loadBeneficiaries]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const env = await fetchPaymentStatus();
        const block =
          env && typeof env === "object" && env.data !== undefined && env.data !== null
            ? /** @type {Record<string, unknown>} */ (env.data)
            : {};
        if (!cancelled && block.configured === true) setMpgsConfigured(true);
      } catch {
        if (!cancelled) setMpgsConfigured(false);
      } finally {
        if (!cancelled) setMpgsStatusReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const resultIndicator = searchParams.get("resultIndicator");
    if (!resultIndicator) return;

    const raw = sessionStorage.getItem(MPGS_PENDING_KEY);
    if (!raw) {
      setSearchParams({}, { replace: true });
      return;
    }

    sessionStorage.removeItem(MPGS_PENDING_KEY);

    /** @type {{ successIndicator?: string; amount?: number; category?: string; memo?: string; beneficiaryLabel?: string; sessionId?: string; merchantName?: string; order?: unknown }} */
    let pending;
    try {
      pending = JSON.parse(raw);
    } catch {
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchParams({}, { replace: true });

    if (resultIndicator === pending.successIndicator) {
      const order =
        pending.order && typeof pending.order === "object"
          ? /** @type {Record<string, unknown>} */ (pending.order)
          : {};
      setSubmission({
        envelope: {
          ok: true,
          source: "mpgs_hosted_checkout",
          data: {
            sessionId: pending.sessionId,
            successIndicator: resultIndicator,
            merchantName:
              typeof pending.merchantName === "string" && pending.merchantName
                ? pending.merchantName
                : pending.beneficiaryLabel || null,
            order,
            amountLKR:
              typeof pending.amount === "number" && Number.isFinite(pending.amount)
                ? pending.amount
                : undefined,
          },
          meta: {
            message:
              "Mastercard Hosted Checkout returned a successful result indicator. Settlement is handled by the bank; the demo ledger is unchanged.",
            provider: "mpgs",
          },
        },
        mode: "mpgs",
      });
      setShowSuccess(true);
    } else {
      setMpgsCardError(
        "Card payment was not completed. The result did not match the checkout session. You can try again or record a mock payment.",
      );
    }
  }, [searchParams, setSearchParams]);

  const parsedAmount = Number(amount);
  const spendAdvisory = useMemo(() => {
    if (!snapshot || !Array.isArray(snapshot.budgets)) return null;
    const envelope = snapshot.budgets.find((b) => b.category === category);
    const monthlyBudget =
      envelope && Number(envelope.budget) > 0 ? Number(envelope.budget) : null;
    const weeklyBudgetLKR =
      monthlyBudget != null ? monthlyBudget / 4 /* heuristic: monthly envelope ÷ 4 */ : null;
    const amt = Number(amount);
    if (!Number.isFinite(amt)) return null;
    return buildTransferSpendAdvisoryLines({
      amountLKR: amt,
      category,
      weeklyBudgetLKR,
    });
  }, [snapshot, category, amount]);

  const canSubmit =
    Number.isFinite(parsedAmount) &&
    parsedAmount >= 50 &&
    parsedAmount <= 25_000 &&
    PAYMENT_CATEGORIES.includes(category) &&
    Boolean(beneficiaryId) &&
    beneficiaryId !== ADD_NEW_BENEFICIARY;

  const showAddPanel = beneficiaryId === ADD_NEW_BENEFICIARY;
  const pageReady = !loading && snapshot && beneficiariesReady;

  if (!loading && !snapshot) {
    return (
      <ShellPageBody>
        <FullPageSpinner
          detail="Transfers read the hydrated snapshot preview while Express stamps the acknowledgement."
          label="Loading snapshot-aware transfer shell…"
        />
      </ShellPageBody>
    );
  }

  if (!pageReady) {
    return (
      <ShellPageBody>
        <FullPageSpinner
          detail="Loading beneficiaries and snapshot…"
          label="Preparing payment form…"
        />
      </ShellPageBody>
    );
  }

  async function handleSaveNewBeneficiary(event) {
    event.preventDefault();
    setAddBenError(null);
    const name = newBenName.trim();
    const accountNumber = stripToAccountDigits(newBenAccount);
    if (name.length < 2) {
      setAddBenError("Enter a beneficiary name (at least 2 characters).");
      return;
    }
    if (accountNumber.length < 6 || accountNumber.length > 18) {
      setAddBenError("Bank account number must be 6–18 digits.");
      return;
    }
    setSavingBeneficiary(true);
    try {
      const env = await createBankBeneficiary({ name, accountNumber });
      const data =
        env && typeof env === "object" && env.data !== undefined
          ? /** @type {Record<string, unknown>} */ (env.data)
          : {};
      const id = typeof data.id === "string" ? data.id : "";
      if (!id) {
        throw new Error("Could not read new beneficiary id from server.");
      }
      await loadBeneficiaries();
      setBeneficiaryId(id);
      setNewBenName("");
      setNewBenAccount("");
    } catch (err) {
      setAddBenError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingBeneficiary(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setShowSuccess(false);
    setSubmitError(null);
    try {
      const reference = memo.trim() || undefined;
      const data = await postMockRecordPayment({
        amount: parsedAmount,
        category,
        beneficiaryId,
        reference,
      });
      await refresh();
      const demoDebit = data.demoDebit;
      const beneficiaryLabel =
        typeof data.beneficiaryLabel === "string" ? data.beneficiaryLabel : "—";
      setSubmission({
        envelope: {
          ok: true,
          source: "mock_record_payment",
          data: {
            sessionId: typeof demoDebit?.id === "string" ? demoDebit.id : undefined,
            successIndicator: "RECORDED",
            merchantName: beneficiaryLabel,
            order: {
              reference: data.reference,
              amount: data.amountLKR,
              currency: "LKR",
            },
          },
          meta: {
            message:
              "Payment saved to the demo ledger. Balances and category budgets on the dashboard are updated.",
            provider: "finwise_mock_api",
          },
        },
        mode: "api",
      });
      setShowSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedBen = beneficiaries.find((b) => b.id === beneficiaryId);

  async function handleMpgsPay() {
    if (!canSubmit) return;
    setMpgsCardError(null);
    setCardSubmitting(true);
    try {
      const reference = memo.trim() || undefined;
      const envelope = await createPaymentSession({
        amount: parsedAmount,
        reference,
        category,
      });
      const data =
        envelope && typeof envelope === "object" && envelope.data !== undefined
          ? /** @type {Record<string, unknown>} */ (envelope.data)
          : {};
      const sessionId = typeof data.sessionId === "string" ? data.sessionId : "";
      const merchantId = typeof data.merchantId === "string" ? data.merchantId : "";
      const checkoutJsUrl =
        typeof data.checkoutJsUrl === "string" ? data.checkoutJsUrl : "";
      const successIndicator =
        typeof data.successIndicator === "string" ? data.successIndicator : "";
      if (!sessionId || !merchantId || !checkoutJsUrl || !successIndicator) {
        throw new Error("Incomplete MPGS session response from the server.");
      }
      const beneficiaryLabel = selectedBen?.name ?? "—";
      sessionStorage.setItem(
        MPGS_PENDING_KEY,
        JSON.stringify({
          successIndicator,
          amount: parsedAmount,
          category,
          memo: memo.trim(),
          beneficiaryLabel,
          sessionId,
          merchantName: typeof data.merchantName === "string" ? data.merchantName : "",
          order: data.order,
        }),
      );
      await showMpgsHostedCheckoutPage({
        merchantId,
        sessionId,
        checkoutJsUrl,
        merchantName:
          typeof data.merchantName === "string" ? data.merchantName : undefined,
      });
    } catch (err) {
      sessionStorage.removeItem(MPGS_PENDING_KEY);
      setMpgsCardError(err instanceof Error ? err.message : String(err));
    } finally {
      setCardSubmitting(false);
    }
  }

  return (
    <>
    <ShellPageBody>
      <div className="flex flex-col gap-4 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-xl flex-1 space-y-3">
            <PageHeading eyebrow="Movement" title="Mock Payment Details" />
            <p className="text-sm leading-snug text-fw-muted">
              Submit a mock payment to the FinWise demo API, or—when Mastercard MPGS is
              configured on the server—open Hosted Checkout for a real card authorization
              test. Mock payments hit{" "}
              <span className="font-mono text-xs">/api/mock/record-payment</span> and update
              the demo ledger; Hosted Checkout does not change the ledger until you wire
              capture or a mock sync yourself.
            </p>
          </div>
          <DemoBadge />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <form
            onSubmit={handleSubmit}
            className="finwise-card space-y-4 rounded-2xl p-5 backdrop-blur"
          >
          {beneficiariesLoadError ? (
            <p
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="status"
            >
              Could not load beneficiaries: {beneficiariesLoadError}. Check that the API
              is running and try refreshing the page.
            </p>
          ) : null}

          <div className="rounded-2xl border border-fw-border bg-fw-section/80 p-4 text-sm text-fw-muted">
            <p className="font-semibold text-fw-ink">Payee</p>
            <p className="mt-1">
              {selectedBen
                ? `${selectedBen.name}${
                    selectedBen.accountNumberMasked
                      ? ` · ${selectedBen.accountNumberMasked}`
                      : ""
                  }`
                : "Select a beneficiary below (demo ledger only)."}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-fw-muted">
              Mock path posts to{" "}
              <span className="font-mono text-[11px]">/api/mock/record-payment</span>{" "}
              with your chosen category.
              {mpgsStatusReady && mpgsConfigured
                ? " MPGS Hosted Checkout uses /api/payment/create-session and returns here with resultIndicator when the gateway redirects."
                : " Seylan sandbox transfer is not used on this screen."}
            </p>
          </div>

          <label className="block text-sm font-semibold text-fw-ink">
            Beneficiary
            <select
              required
              value={beneficiaryId}
              disabled={Boolean(beneficiariesLoadError)}
              onChange={(event) => {
                const v = event.target.value;
                setBeneficiaryId(v);
                if (v !== ADD_NEW_BENEFICIARY) {
                  setAddBenError(null);
                }
              }}
              className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-4 py-3 text-sm text-fw-ink shadow-inner outline-none ring-fw-red-600/35 transition placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4 disabled:opacity-60"
            >
              <option value="">Choose beneficiary…</option>
              {beneficiaries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.accountNumberMasked ? ` (${b.accountNumberMasked})` : ""}
                </option>
              ))}
              <option value={ADD_NEW_BENEFICIARY}>Add new beneficiary…</option>
            </select>
            <span className="mt-2 block text-xs font-normal leading-relaxed text-fw-muted">
              New payees are saved on the server (in-memory for this demo).
            </span>
          </label>

          {showAddPanel ? (
            <div className="space-y-4 rounded-2xl border border-fw-border bg-fw-panel/90 p-4 dark:bg-fw-panel/70">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-fw-muted">
                New beneficiary
              </p>
              <label className="block text-sm font-semibold text-fw-ink">
                Name
                <input
                  value={newBenName}
                  onChange={(e) => setNewBenName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-4 py-3 text-sm text-fw-ink shadow-inner outline-none ring-fw-red-600/35 transition placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  placeholder="e.g. Campus bookshop"
                  autoComplete="name"
                />
              </label>
              <label className="block text-sm font-semibold text-fw-ink">
                Bank account number
                <input
                  value={newBenAccount}
                  onChange={(e) => setNewBenAccount(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-4 py-3 text-sm text-fw-ink shadow-inner outline-none ring-fw-red-600/35 transition placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
                  placeholder="6–18 digits"
                  inputMode="numeric"
                  autoComplete="off"
                />
              </label>
              {addBenError ? (
                <p className="text-sm text-red-700" role="alert">
                  {addBenError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={savingBeneficiary}
                onClick={handleSaveNewBeneficiary}
                className="w-full rounded-xl border border-fw-border bg-fw-panel px-4 py-3 text-sm font-semibold text-fw-red-700 transition hover:bg-fw-rose-soft disabled:opacity-60"
              >
                {savingBeneficiary ? "Saving…" : "Save beneficiary"}
              </button>
            </div>
          ) : null}

          <label className="block text-sm font-semibold text-fw-ink">
            Amount · LKR
            <input
              required
              min="50"
              max="25000"
              step="50"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-4 py-3 text-sm text-fw-ink shadow-inner outline-none ring-fw-red-600/35 transition placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
            />
          </label>
          <label className="block text-sm font-semibold text-fw-ink">
            Reference
            <input
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-4 py-3 text-sm text-fw-ink shadow-inner outline-none ring-fw-red-600/35 transition placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
              placeholder="What is this for?"
            />
          </label>
          <label className="block text-sm font-semibold text-fw-ink">
            Category
            <select
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-2 w-full rounded-xl border border-fw-border bg-fw-panel px-4 py-3 text-sm text-fw-ink shadow-inner outline-none ring-fw-red-600/35 transition placeholder:text-fw-muted focus:border-fw-red-500 focus:ring-4"
            >
              {PAYMENT_CATEGORIES.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs font-normal leading-relaxed text-fw-muted">
              Pick exactly one category so the payment appears correctly in activity
              review.
            </span>
          </label>
          {submitError ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {submitError}
            </p>
          ) : null}
          {canSubmit && spendAdvisory ? (
            <p
              className="rounded-xl border border-sky-100 bg-sky-50/95 px-4 py-3 text-sm leading-relaxed text-sky-950"
              role="status"
            >
              <span className="font-semibold">Before you spend:</span> {spendAdvisory.primary}{" "}
              Right now about{" "}
              <span className="font-semibold">{formatLKR(snapshot.availableLKR)}</span>{" "}
              is available before this debit posts.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit || submitting || Boolean(beneficiariesLoadError)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#E31D23] to-[#B81419] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-fw-red-600/30 transition hover:scale-[1.02] hover:brightness-105 disabled:cursor-not-allowed disabled:border-fw-border disabled:text-fw-muted disabled:opacity-85"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Recording payment…
              </>
            ) : (
              "Record mock payment"
            )}
          </button>
          {mpgsStatusReady && mpgsConfigured ? (
            <div className="space-y-3">
              {mpgsCardError ? (
                <p
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  role="alert"
                >
                  {mpgsCardError}
                </p>
              ) : null}
              <button
                type="button"
                disabled={
                  !canSubmit || cardSubmitting || Boolean(beneficiariesLoadError)
                }
                onClick={() => void handleMpgsPay()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-fw-red-600 bg-fw-panel px-4 py-3 text-sm font-semibold text-fw-red-700 shadow-sm transition hover:bg-fw-rose-soft disabled:cursor-not-allowed disabled:border-fw-border disabled:text-fw-muted disabled:opacity-80"
              >
                {cardSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-fw-red-600/30 border-t-fw-red-600" />
                    Opening Hosted Checkout…
                  </>
                ) : (
                  "Pay with Mastercard (Hosted Checkout)"
                )}
              </button>
              <p className="text-xs leading-relaxed text-fw-muted">
                Opens the Seylan MPGS sandbox payment page in this window. After the bank
                redirects back, we compare <span className="font-mono">resultIndicator</span>{" "}
                to the session success value. Ensure{" "}
                <span className="font-mono">CLIENT_ORIGIN</span> on the server matches
                this site&apos;s origin.
              </p>
            </div>
          ) : null}
          <p className="text-xs leading-relaxed text-fw-muted">
            After a successful submit, keep this tab open or visit the dashboard to see
            the updated available balance and spending by category.
          </p>
        </form>

        <aside className="finwise-card finwise-hover space-y-4 rounded-2xl bg-gradient-to-br from-white via-white to-fw-rose-soft p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fw-red-600">
            Source · preview
          </p>
          <div>
            <p className="text-sm text-fw-muted">Snapshot available pool</p>
            <p className="mt-2 text-3xl font-semibold text-fw-strong">
              {formatLKR(snapshot.availableLKR)}
            </p>
          </div>
          <div className="rounded-2xl border border-fw-border/80 bg-fw-panel/90 p-4 text-sm text-fw-muted">
            <p>
              Submitting the form records a debit to your selected beneficiary in the demo
              server ledger and refreshes the snapshot used across Budgeting, Activity,
              and Alerts.
            </p>
          </div>
        </aside>
      </div>
      </div>
    </ShellPageBody>
      {showSuccess ? (
        <SuccessSheet
          amount={parsedAmount}
          category={category}
          memo={memo}
          submission={submission}
          advisoryLine={spendAdvisory?.primary ?? null}
          onClose={() => {
            setShowSuccess(false);
            setSubmission(null);
            setSubmitError(null);
            setMpgsCardError(null);
          }}
        />
      ) : null}
    </>
  );
}

/** @param {string} raw */
function stripToAccountDigits(raw) {
  return String(raw ?? "").replace(/\D/g, "");
}

function SuccessSheet({
  amount,
  category,
  memo,
  submission,
  advisoryLine,
  onClose,
}) {
  /** @type {Record<string, unknown>|null} */
  const metaEnvelope =
    submission?.envelope && typeof submission.envelope === "object"
      ? /** @type {Record<string, unknown>} */ (submission.envelope)
      : null;
  /** @type {Record<string, unknown>|null} */
  const meta =
    metaEnvelope &&
    typeof metaEnvelope.meta === "object" &&
    metaEnvelope.meta !== null
      ? /** @type {Record<string, unknown>} */
        (metaEnvelope.meta)
      : null;
  /** @type {unknown} */
  const serverMessage = meta?.message;
  /** @type {unknown} */
  const dataBlock = metaEnvelope ? metaEnvelope.data : null;
  const paymentData =
    dataBlock && typeof dataBlock === "object" && dataBlock !== null
      ? /** @type {Record<string, unknown>} */ (dataBlock)
      : null;
  const order =
    paymentData?.order && typeof paymentData.order === "object"
      ? /** @type {Record<string, unknown>} */ (paymentData.order)
      : null;
  const sessionId =
    typeof paymentData?.sessionId === "string" ? paymentData.sessionId : null;
  const payeeName =
    typeof paymentData?.merchantName === "string" ? paymentData.merchantName : null;
  const successIndicator =
    typeof paymentData?.successIndicator === "string"
      ? paymentData.successIndicator
      : null;
  const acknowledgementReference =
    (typeof order?.reference === "string" ? order.reference : null) ??
    (memo || "UNSIGNED");

  const source =
    typeof metaEnvelope?.source === "string" ? metaEnvelope.source : "";
  const isMpgs = source === "mpgs_hosted_checkout";
  const rawAmountLKR = paymentData?.amountLKR;
  const displayAmount =
    typeof rawAmountLKR === "number" && Number.isFinite(rawAmountLKR)
      ? rawAmountLKR
      : amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4 py-10 backdrop-blur">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-success-title"
        className="finwise-slide-in w-full max-w-lg rounded-[1.7rem] border border-fw-border/80 bg-fw-panel p-8 shadow-2xl shadow-fw-red-900/40 dark:shadow-black/45"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fw-red-600">
          {isMpgs ? "Hosted Checkout" : "Mock payment acknowledgement"}
        </p>
        <h2
          id="transfer-success-title"
          className="mt-3 text-2xl font-semibold text-fw-strong"
        >
          {isMpgs ? "Card session complete" : "Payment recorded"}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fw-muted">
          {isMpgs ? (
            <>
              Mastercard Hosted Checkout returned a matching success indicator for{" "}
              <span className="font-semibold">{formatLKR(displayAmount)}</span>
              {payeeName ? (
                <>
                  {" "}
                  (<span className="font-semibold">{payeeName}</span>)
                </>
              ) : null}
              , referencing{" "}
              <span className="font-semibold">{memo || "—"}</span> under{" "}
              <span className="font-semibold">{category}</span>. The demo dashboard
              balance is unchanged unless you add a capture webhook or sync step.
            </>
          ) : (
            <>
              Saved <span className="font-semibold">{formatLKR(displayAmount)}</span> to
              the demo ledger
              {payeeName ? (
                <>
                  {" "}
                  for <span className="font-semibold">{payeeName}</span>
                </>
              ) : null}
              , referencing{" "}
              <span className="font-semibold">{memo || "—"}</span> under{" "}
              <span className="font-semibold">{category}</span>. Your dashboard balance
              and category usage have been refreshed.
            </>
          )}
        </p>
        {advisoryLine ? (
          <p
            className="mt-4 rounded-xl border border-sky-100 bg-sky-50/95 px-4 py-3 text-sm leading-relaxed text-sky-950"
            role="status"
          >
            Insight: {advisoryLine}
          </p>
        ) : null}

        <dl className="mt-6 space-y-3 rounded-2xl border border-fw-border bg-fw-section/80 p-4 text-sm text-fw-ink">
          {payeeName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-fw-muted">
                {isMpgs ? "Display name" : "Beneficiary"}
              </dt>
              <dd className="text-right font-semibold text-fw-ink">{payeeName}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-fw-muted">Category</dt>
            <dd className="font-semibold text-fw-ink">{category}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-fw-muted">Correlation</dt>
            <dd className="font-mono text-xs font-semibold text-fw-ink">
              {acknowledgementReference || "AUTO"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-fw-muted">Channel</dt>
            <dd
              className={`font-semibold ${isMpgs ? "text-violet-700" : "text-emerald-600"}`}
            >
              {isMpgs
                ? "Mastercard Hosted Checkout (MPGS)"
                : "Demo ledger (API)"}
            </dd>
          </div>
          {sessionId ? (
            <div className="flex justify-between gap-4">
              <dt className="text-fw-muted">Transaction id</dt>
              <dd className="max-w-56 truncate text-right font-mono text-xs text-fw-muted">
                {sessionId}
              </dd>
            </div>
          ) : null}
          {successIndicator ? (
            <div className="flex justify-between gap-4">
              <dt className="text-fw-muted">Success indicator</dt>
              <dd className="font-mono text-xs text-fw-muted">
                {successIndicator}
              </dd>
            </div>
          ) : null}
          {typeof serverMessage === "string" ? (
            <div className="flex justify-between gap-4">
              <dt className="text-fw-muted">Server note</dt>
              <dd className="text-right text-xs text-fw-muted">{serverMessage}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-gradient-to-b from-[#E31D23] to-[#B81419] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-fw-red-600/40 transition hover:scale-[1.02]"
          >
            Close sheet
          </button>
        </div>
      </div>
    </div>
  );
}
