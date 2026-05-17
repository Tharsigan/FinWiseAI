import crypto from "node:crypto";

import { env } from "../config/env.js";
import { HttpError } from "../http/errors.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_CURRENCY = "LKR";

function requireMpgsConfig() {
  const missing = [];
  if (!env.mpgs.merchantId) missing.push("MPGS_MERCHANT_ID");
  if (!env.mpgs.apiPassword) missing.push("MPGS_API_PASSWORD");
  if (!env.mpgs.baseUrl) missing.push("MPGS_BASE_URL");
  if (!env.mpgs.checkoutJsUrl) missing.push("MPGS_CHECKOUT_JS_URL");

  if (missing.length > 0) {
    throw new HttpError(
      503,
      "MPGS_NOT_CONFIGURED",
      `MPGS Hosted Checkout is missing: ${missing.join(", ")}`,
    );
  }
}

function normalizeAmount(amount) {
  const numericAmount = Number(amount);
  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    numericAmount > 250_000
  ) {
    throw new HttpError(
      400,
      "INVALID_PAYMENT_AMOUNT",
      "Hosted Checkout payments require an amount greater than 0 and at most 250000 LKR.",
    );
  }
  return numericAmount.toFixed(2);
}

function normalizeCurrency(currency = DEFAULT_CURRENCY) {
  const value = String(currency || DEFAULT_CURRENCY).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new HttpError(
      400,
      "INVALID_PAYMENT_CURRENCY",
      "Payment currency must be a three-letter ISO currency code.",
    );
  }
  return value;
}

function buildOrderId() {
  return `FW${Date.now()}${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function buildSessionUrl() {
  const base = env.mpgs.baseUrl.replace(/\/+$/, "");
  return new URL(
    `${base}/merchant/${encodeURIComponent(env.mpgs.merchantId)}/session`,
  );
}

function buildAuthorizationHeader() {
  const username = `merchant.${env.mpgs.merchantId}`;
  const token = Buffer.from(`${username}:${env.mpgs.apiPassword}`, "utf8").toString(
    "base64",
  );
  return `Basic ${token}`;
}

async function parseMpgsResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
}

function describeMpgsError(body, fallback) {
  const explanation =
    body?.error?.explanation ||
    body?.error?.cause ||
    body?.error?.field ||
    body?.result;
  if (typeof explanation === "string" && /invalid credentials/i.test(explanation)) {
    return `${fallback} Invalid credentials. Confirm that MPGS_API_PASSWORD is the API password generated in the MPGS portal, not the operator login password.`;
  }
  return typeof explanation === "string" && explanation
    ? `${fallback} ${explanation}`
    : fallback;
}

export function isMpgsConfigured() {
  return Boolean(
    env.mpgs.merchantId &&
      env.mpgs.apiPassword &&
      env.mpgs.baseUrl &&
      env.mpgs.checkoutJsUrl,
  );
}

export async function createMpgsCheckoutSession({
  amount,
  currency,
  reference = "",
  category = "",
} = {}) {
  requireMpgsConfig();

  const formattedAmount = normalizeAmount(amount);
  const paymentCurrency = normalizeCurrency(currency);
  const url = buildSessionUrl();
  const orderId = buildOrderId();
  const cleanReference = String(reference || "").trim().slice(0, 40);
  const cleanCategory = String(category || "").trim().slice(0, 30);
  const payload = {
    apiOperation: "CREATE_CHECKOUT_SESSION",
    interaction: {
      operation: "PURCHASE",
      merchant: {
        name: env.mpgs.merchantName,
      },
      returnUrl: `${env.clientOrigin.replace(/\/+$/, "")}/transfer`,
    },
    order: {
      id: orderId,
      amount: formattedAmount,
      currency: paymentCurrency,
      reference: cleanReference || orderId,
      description: cleanCategory
        ? `${cleanCategory} payment`
        : "FinWise hosted checkout payment",
    },
    transaction: {
      reference: cleanReference || orderId,
    },
  };

  console.info("[mpgs] create-session:start", {
    url: url.toString(),
    merchantId: env.mpgs.merchantId,
    username: `merchant.${env.mpgs.merchantId}`,
    passwordLength: env.mpgs.apiPassword.length,
    amount: formattedAmount,
    currency: paymentCurrency,
    hasReference: Boolean(reference),
    category: category || null,
    orderId,
  });

  try {
    const startedAt = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: buildAuthorizationHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    const body = await parseMpgsResponse(response);

    console.info("[mpgs] create-session:response", {
      status: response.status,
      ok: response.ok,
      elapsedMs: Date.now() - startedAt,
      result: body?.result,
      hasSessionId: Boolean(body?.session?.id),
      errorCause: body?.error?.cause,
      errorExplanation: body?.error?.explanation,
    });

    if (!response.ok || !body?.session?.id) {
      throw new HttpError(
        response.ok ? 502 : response.status,
        "MPGS_CREATE_SESSION_FAILED",
        describeMpgsError(
          body,
          `MPGS rejected the checkout session request with HTTP ${response.status}.`,
        ),
      );
    }

    return {
      sessionId: body.session.id,
      successIndicator: body.successIndicator ?? null,
      checkoutJsUrl: env.mpgs.checkoutJsUrl,
      merchantId: env.mpgs.merchantId,
      merchantName: env.mpgs.merchantName,
      order: {
        id: orderId,
        amount: formattedAmount,
        currency: paymentCurrency,
        reference: cleanReference || null,
        category: cleanCategory || null,
      },
    };
  } catch (error) {
    if (error?.status && error?.code) throw error;
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new HttpError(
        504,
        "MPGS_TIMEOUT",
        "MPGS did not respond before the checkout session timeout.",
      );
    }
    throw new HttpError(
      502,
      "MPGS_NETWORK_ERROR",
      error instanceof Error
        ? `MPGS checkout session request failed: ${error.message}`
        : "MPGS checkout session request failed.",
    );
  }
}
