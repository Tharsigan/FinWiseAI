import crypto from "node:crypto";
import { Router } from "express";

import { failure, success } from "../http/response.js";
import { normalizePaymentCategory } from "../lib/paymentCategory.js";
import { parseMonthOrDefault } from "../lib/monthQuery.js";
import {
  createBeneficiary,
  getBeneficiaryById,
  listBeneficiaries,
  serializeSelectedBeneficiary,
} from "../services/beneficiaryService.js";
import { recordDemoPaymentDebit } from "../services/demoLedgerService.js";
import { buildDashboardSnapshot } from "../services/snapshotService.js";
import {
  getSeylanBalance,
  getSeylanTransactions,
  isSeylanInternalTransferConfigured,
  isSeylanSandboxConfigured,
  postSeylanInternalTransfer,
  testSeylanSandboxConnectivity,
} from "../services/seylanSandboxService.js";

export const bankRouter = Router();

function transferRouteDebugLog(hypothesisId, location, message, data = {}) {
  console.debug("[bank:transfer]", { hypothesisId, location, message, data });
}

function fallbackBalancePayload() {
  const snap = buildDashboardSnapshot();
  return {
    currency: "LKR",
    availableLKR: snap.availableLKR,
    ledgerLKR: snap.availableLKR,
    accountNumberMasked: snap.account.numberMasked,
    accountType: snap.account.type,
    monthPrefix: snap.monthPrefix,
    retrievedAt: new Date().toISOString(),
  };
}

function normalizeTransactionCount(count) {
  return Math.min(Math.max(Number(count) || 10, 1), 25);
}

function fallbackTransactionsPayload(month, count) {
  const snap = buildDashboardSnapshot();
  const fallbackMonth = month || snap.monthPrefix;
  const requestedCount = normalizeTransactionCount(count);
  const matchingItems = snap.normalized.filter((row) =>
    row.dateISO.startsWith(fallbackMonth),
  );
  const items = matchingItems.slice(0, requestedCount);

  return {
    monthPrefix: fallbackMonth,
    count: items.length,
    totalAvailable: matchingItems.length,
    items,
    retrievedAt: new Date().toISOString(),
  };
}

function sandboxMeta(bankStatus, extra = {}) {
  return {
    sandbox: "seylan",
    bankStatusCode: bankStatus.code,
    bankStatusDescription: bankStatus.description,
    ...extra,
  };
}

bankRouter.get("/balance", async (_req, res) => {
  if (!isSeylanSandboxConfigured()) {
    success(res, fallbackBalancePayload(), {
      source: "fallback_mock",
      meta: {
        sandbox: "not_configured",
        hint: "Set Seylan sandbox environment variables to enable live balance inquiry.",
      },
    });
    return;
  }

  try {
    const { data, bankStatus } = await getSeylanBalance();
    success(res, data, {
      source: "seylan_sandbox",
      meta: sandboxMeta(bankStatus),
    });
  } catch (error) {
    success(res, fallbackBalancePayload(), {
      source: "fallback_mock",
      meta: {
        sandbox: "error_fallback",
        reason: error instanceof Error ? error.message : String(error),
      },
    });
  }
});

bankRouter.get("/transactions", async (req, res, next) => {
  try {
    const month =
      typeof req.query.month === "string"
        ? parseMonthOrDefault(req.query.month)
        : undefined;
    const count =
      typeof req.query.count === "string" ? Number(req.query.count) : undefined;

    if (!isSeylanSandboxConfigured()) {
      success(res, fallbackTransactionsPayload(month, count), {
        source: "fallback_mock",
        meta: {
          sandbox: "not_configured",
          hint:
            "Set Seylan sandbox environment variables to enable transaction history.",
        },
      });
      return;
    }

    try {
      const { data, bankStatus } = await getSeylanTransactions({ count });
      const items = month
        ? data.items.filter((row) => row.dateISO.startsWith(month))
        : data.items;
      success(
        res,
        {
          ...data,
          monthPrefix: month ?? null,
          count: items.length,
          items,
        },
        {
          source: "seylan_sandbox",
          meta: sandboxMeta(bankStatus, {
            hint: "Transaction narrations are categorized by backend heuristics.",
          }),
        },
      );
    } catch (error) {
      success(res, fallbackTransactionsPayload(month, count), {
        source: "fallback_mock",
        meta: {
          sandbox: "error_fallback",
          reason: error instanceof Error ? error.message : String(error),
        },
      });
    }
  } catch (e) {
    next(e);
  }
});

bankRouter.get("/beneficiaries", (_req, res) => {
  success(res, { items: listBeneficiaries() }, { source: "mock" });
});

bankRouter.get("/debug/sandbox-test", async (_req, res, next) => {
  try {
    const result = await testSeylanSandboxConnectivity();
    success(res, result, {
      source: "seylan_sandbox_debug",
      meta: {
        temporary: true,
        modifiesLedger: false,
      },
    });
  } catch (error) {
    if (error?.status && error?.code && error?.message) {
      failure(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
});

bankRouter.post("/beneficiaries", (req, res, next) => {
  try {
    const beneficiary = createBeneficiary(req.body);
    success(res, beneficiary, { status: 201, source: "mock" });
  } catch (error) {
    if (error?.status && error?.code && error?.message) {
      failure(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
});

bankRouter.post("/internal-transfer", async (req, res, next) => {
  const amountInput = String(req.body?.amount ?? "").trim();
  const rawAmount =
    typeof req.body?.amount === "string"
      ? Number(req.body.amount)
      : Number(req.body?.amount ?? NaN);
  transferRouteDebugLog(
    "H1,H2",
    "server/src/routes/bankRoutes.js:161",
    "server transfer route entered",
    {
      amountInput,
      amountType: typeof req.body?.amount,
      rawAmount,
      beneficiaryId: req.body?.beneficiaryId,
      category: req.body?.category,
      hasReference: Boolean(req.body?.reference),
    },
  );

  if (
    !Number.isFinite(rawAmount) ||
    rawAmount < 50 ||
    rawAmount > 25_000 ||
    !/^\d+(\.\d{1,2})?$/.test(amountInput)
  ) {
    failure(
      res,
      400,
      "INVALID_AMOUNT_RANGE",
      "Sandbox transfers require an amount between 50 and 25000 LKR with at most two decimal places.",
    );
    return;
  }

  const beneficiaryId = String(req.body?.beneficiaryId ?? "").trim();
  const selectedBeneficiary = getBeneficiaryById(beneficiaryId);
  if (!selectedBeneficiary) {
    failure(
      res,
      400,
      "INVALID_BENEFICIARY",
      "Choose a saved Seylan beneficiary before submitting the sandbox transfer.",
    );
    return;
  }
  const benef = selectedBeneficiary.name;
  const beneficiaryPayload = serializeSelectedBeneficiary(selectedBeneficiary);

  const amount = Math.round(rawAmount * 100) / 100;
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

  const reference =
    typeof req.body?.reference === "string" && req.body.reference.trim().length > 0
      ? req.body.reference.trim().replace(/\s+/g, " ").slice(0, 16)
      : `FINWISE-${crypto.randomUUID().slice(0, 8)}`;
  transferRouteDebugLog(
    "H2,H3",
    "server/src/routes/bankRoutes.js:206",
    "server transfer validation passed",
    {
      amount,
      category,
      referenceLength: reference.length,
      beneficiaryId: selectedBeneficiary.id,
      sandboxConfigured: isSeylanSandboxConfigured(),
      internalTransferConfigured: isSeylanInternalTransferConfigured(
        selectedBeneficiary.accountNumber,
      ),
    },
  );

  if (!isSeylanSandboxConfigured()) {
    const demoDebit = recordDemoPaymentDebit({
      amount,
      beneficiary: benef,
      reference,
      category,
    });

    success(
      res,
      {
        amountLKR: amount,
        beneficiaryLabel: benef,
        beneficiary: beneficiaryPayload,
        category,
        reference,
        status: "accepted_fallback",
        acceptedAt: new Date().toISOString(),
        bankReference: null,
        bankStatus: {
          code: "FALLBACK",
          description: "Seylan sandbox credentials are not configured.",
          success: true,
        },
        demoDebit,
      },
      {
        status: 202,
        source: "fallback_mock",
        meta: {
          demo: true,
          sandbox: "not_configured",
          bankStatusEcho: "awaiting_credentials",
          message:
            "Transfer validated locally and recorded as a demo debit. Configure Seylan sandbox env vars to submit to the bank sandbox.",
        },
      },
    );
    return;
  }

  if (!isSeylanInternalTransferConfigured(selectedBeneficiary.accountNumber)) {
    transferRouteDebugLog(
      "H3",
      "server/src/routes/bankRoutes.js:251",
      "server transfer missing internal transfer config",
      {
        sandboxConfigured: isSeylanSandboxConfigured(),
        internalTransferConfigured: isSeylanInternalTransferConfigured(
          selectedBeneficiary.accountNumber,
        ),
      },
    );
    failure(
      res,
      503,
      "SEYLAN_TRANSFER_NOT_CONFIGURED",
      "Set Seylan transfer sandbox credentials to enable internal transfers.",
    );
    return;
  }

  try {
    const { data, bankStatus } = await postSeylanInternalTransfer({
      amount,
      reference,
      destinationAccountNumber: selectedBeneficiary.accountNumber,
    });
    transferRouteDebugLog(
      "H4",
      "server/src/routes/bankRoutes.js:262",
      "server received seylan transfer response",
      {
        bankStatusCode: bankStatus.code,
        bankStatusSuccess: bankStatus.success,
        transferStatus: data?.status,
        hasBankReference: Boolean(data?.bankReference),
      },
    );
    const demoDebit = recordDemoPaymentDebit({
      amount,
      beneficiary: benef,
      reference,
      category,
    });

    success(
      res,
      {
        ...data,
        beneficiaryLabel: benef,
        beneficiary: beneficiaryPayload,
        category,
        demoDebit,
      },
      {
        status: 202,
        source: "seylan_sandbox",
        meta: sandboxMeta(bankStatus, {
          requestedBeneficiary: benef,
          message:
            "Transfer accepted by the sandbox and recorded locally for categorized activity review.",
        }),
      },
    );
  } catch (error) {
    transferRouteDebugLog(
      "H4",
      "server/src/routes/bankRoutes.js:291",
      "server transfer caught seylan error",
      {
        status: error?.status,
        code: error?.code,
        failureMode: error?.failureMode,
        message: error instanceof Error ? error.message : String(error),
      },
    );
    if (
      error?.failureMode === "NETWORK_ERROR" ||
      error?.failureMode === "TIMEOUT" ||
      (error instanceof TypeError && error.message === "fetch failed")
    ) {
      const demoDebit = recordDemoPaymentDebit({
        amount,
        beneficiary: benef,
        reference,
        category,
      });
      transferRouteDebugLog(
        "H4",
        "server/src/routes/bankRoutes.js:302",
        "server transfer using fallback after seylan fetch failure",
        {
          amount,
          category,
          failureMode: error?.failureMode ?? "NETWORK_ERROR",
          demoDebitId: demoDebit.id,
        },
      );
      transferRouteDebugLog(
        "H1,H4",
        "server/src/routes/bankRoutes.js:internal-transfer:fallback",
        "server returning accepted_fallback after seylan failure",
        {
          routeResponseStatus: 202,
          bankStatusEcho: "sandbox_unreachable",
          failureMode: error?.failureMode ?? "NETWORK_ERROR",
          errorName: error?.name,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      );
      success(
        res,
        {
          amountLKR: amount,
          beneficiaryLabel: benef,
          beneficiary: beneficiaryPayload,
          category,
          reference,
          status: "accepted_fallback",
          acceptedAt: new Date().toISOString(),
          bankReference: null,
          bankStatus: {
            code: "FALLBACK",
            description: "Seylan sandbox transfer service was unreachable.",
            success: true,
          },
          demoDebit,
        },
        {
          status: 202,
          source: "fallback_mock",
          meta: {
            demo: true,
            sandbox: "error_fallback",
            bankStatusEcho: "sandbox_unreachable",
            message:
              "Transfer validated locally and recorded as a demo debit while the Seylan sandbox transfer service was unreachable.",
          },
        },
      );
      return;
    }
    if (error?.status && error?.code && error?.message) {
      failure(res, error.status, error.code, error.message);
      return;
    }
    next(error);
  }
});
