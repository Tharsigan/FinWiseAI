import crypto from "node:crypto";
import { Router } from "express";

import { mockCurrentMonth } from "../data/mockData.js";
import { failure, success } from "../http/response.js";
import { normalizePaymentCategory } from "../lib/paymentCategory.js";
import {
  projectedMonthCashflow,
  spendByCategoryInMonth,
} from "../lib/transactionAnalytics.js";
import { parseMonthOrDefault } from "../lib/monthQuery.js";
import { buildDashboardSnapshot } from "../services/snapshotService.js";
import { getBeneficiaryById } from "../services/beneficiaryService.js";
import { recordDemoPaymentDebit } from "../services/demoLedgerService.js";

export const mockRouter = Router();

mockRouter.get("/profile", (_req, res) => {
  const snap = buildDashboardSnapshot();
  success(
    res,
    {
      profile: snap.profile,
      account: snap.account,
      monthPrefix: snap.monthPrefix,
    },
    { source: "mock" },
  );
});

mockRouter.get("/snapshot", (_req, res) => {
  success(res, buildDashboardSnapshot(), { source: "mock" });
});

const MOCK_PAY_AMOUNT_MIN = 50;
const MOCK_PAY_AMOUNT_MAX = 25_000;

mockRouter.post("/record-payment", (req, res) => {
  const rawAmount = Number(req.body?.amount);
  if (!Number.isFinite(rawAmount)) {
    failure(
      res,
      400,
      "INVALID_AMOUNT",
      "Payment amount must be a number.",
    );
    return;
  }
  const roundedAmount = Math.round(rawAmount * 100) / 100;
  if (roundedAmount < MOCK_PAY_AMOUNT_MIN || roundedAmount > MOCK_PAY_AMOUNT_MAX) {
    failure(
      res,
      400,
      "INVALID_AMOUNT",
      `Amount must be between ${MOCK_PAY_AMOUNT_MIN} and ${MOCK_PAY_AMOUNT_MAX} LKR.`,
    );
    return;
  }

  const category = normalizePaymentCategory(req.body?.category);
  if (!category) {
    failure(
      res,
      400,
      "INVALID_PAYMENT_CATEGORY",
      "Choose one payment category: Entertainment, Food, Transport, Rent, Mobile Data, Savings, or Other.",
    );
    return;
  }

  const beneficiaryId = String(req.body?.beneficiaryId ?? "").trim();
  if (!beneficiaryId) {
    failure(
      res,
      400,
      "INVALID_BENEFICIARY",
      "Choose a saved beneficiary before submitting the mock payment.",
    );
    return;
  }

  const selected = getBeneficiaryById(beneficiaryId);
  if (!selected) {
    failure(
      res,
      400,
      "INVALID_BENEFICIARY",
      "That beneficiary was not found. Refresh the list or add the payee again.",
    );
    return;
  }

  const beneficiaryLabel = selected.name;

  const reference =
    typeof req.body?.reference === "string" && req.body.reference.trim().length > 0
      ? req.body.reference.trim().replace(/\s+/g, " ").slice(0, 120)
      : `MOCK-${crypto.randomUUID().slice(0, 8)}`;

  const memo =
    typeof req.body?.reference === "string" && req.body.reference.trim().length > 0
      ? req.body.reference.trim().replace(/\s+/g, " ").slice(0, 120)
      : "";

  const beneficiary = beneficiaryLabel;
  const description = memo
    ? `Mock payment — ${memo} · ${beneficiaryLabel}`
    : `Mock payment · ${beneficiaryLabel}`;

  const demoDebit = recordDemoPaymentDebit({
    amount: roundedAmount,
    beneficiary,
    reference,
    category,
    description,
    source: "mock_payment_ui",
  });

  success(
    res,
    {
      demoDebit,
      amountLKR: roundedAmount,
      category,
      reference,
      beneficiaryId: selected.id,
      beneficiaryLabel,
      acceptedAt: new Date().toISOString(),
    },
    {
      source: "mock",
      meta: {
        demo: true,
        message: "Recorded in demo ledger; snapshot and budgets will include this debit.",
      },
    },
  );
});

mockRouter.get("/summary", (_req, res) => {
  const snap = buildDashboardSnapshot();
  const spendShare = spendByCategoryInMonth(
    snap.normalized,
    snap.monthPrefix,
  );
  success(
    res,
    {
      monthPrefix: snap.monthPrefix,
      availableLKR: snap.availableLKR,
      cashflowEstimate: snap.cashflowEstimate,
      ledgerOpening: snap.ledgerOpening,
      plannedMonthlyIncome: snap.plannedMonthlyIncome,
      categorySpend: Object.fromEntries(spendShare.entries()),
      savingsGoal: snap.savingsGoal,
    },
    { source: "mock" },
  );
});

mockRouter.get("/balance", (_req, res) => {
  const snap = buildDashboardSnapshot();
  success(
    res,
    {
      currency: "LKR",
      availableLKR: snap.availableLKR,
      monthPrefix: snap.monthPrefix,
      account: snap.account,
    },
    { source: "mock" },
  );
});

mockRouter.get("/transactions", (req, res, next) => {
  try {
    const month = parseMonthOrDefault(
      typeof req.query.month === "string" ? req.query.month : undefined,
      mockCurrentMonth,
    );
    const { normalized } = buildDashboardSnapshot();
    const filtered = normalized.filter((row) => row.dateISO.startsWith(month));

    const cashflow = projectedMonthCashflow(normalized, month);

    success(
      res,
      {
        monthPrefix: month,
        items: filtered,
        monthCashflowEstimate: cashflow,
      },
      { source: "mock" },
    );
  } catch (e) {
    next(e);
  }
});
