import { env } from "../config/env.js";
import { HttpError } from "../http/errors.js";
import {
  mapBalanceResponse,
  mapTransactionResponse,
  mapTransferResponse,
  readBankStatus,
} from "./bankResponseMapper.js";

const BALANCE_PATH = "/Inquiry/Account/AccountInquiry/1.0/GetAccountBalance";
const TRANSACTIONS_PATH =
  "/Inquiry/Account/AccountInquiry/1.0/GetAccountTransactions";
const INTERNAL_TRANSFER_PATH =
  "/Posting/Account/InternalTransfer/1.0/TransferFunds";
const DEFAULT_TIMEOUT_MS = 15_000;

function maskSecret(value = "") {
  const raw = String(value || "");
  if (!raw) return "<missing>";
  if (raw.length <= 8) return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
  return `${raw.slice(0, 4)}***${raw.slice(-4)}`;
}

function logSeylanDebug(message, data = {}) {
  console.info(`[seylan:sandbox] ${message}`, data);
}

function logSeylanError(message, error, data = {}) {
  console.error(`[seylan:sandbox] ${message}`, {
    ...data,
    error,
    name: error?.name,
    message: error instanceof Error ? error.message : String(error),
    cause: error?.cause,
    code: error?.code,
    status: error?.status,
    failureMode: error?.failureMode,
  });
}

function classifyHttpStatus(status) {
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    return "INVALID_REQUEST";
  }
  if (status >= 500) return "NETWORK_ERROR";
  return "INVALID_REQUEST";
}

function classifyBankStatus(bankStatus) {
  const haystack = `${bankStatus?.code ?? ""} ${bankStatus?.description ?? ""}`
    .toLowerCase();
  if (haystack.includes("checksum") || haystack.includes("check value")) {
    return "HMAC_MISMATCH";
  }
  if (bankStatus?.code === "1010") return "NETWORK_ERROR";
  if (bankStatus?.code === "2020" || bankStatus?.code === "2090") {
    return "INVALID_REQUEST";
  }
  return "INVALID_REQUEST";
}

function classifyFetchError(error) {
  if (error?.failureMode) return error.failureMode;
  if (error instanceof TypeError && error.message.includes("Invalid URL")) {
    return "INVALID_URL";
  }
  if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    return "TIMEOUT";
  }

  const networkCodes = new Set([
    "EAI_AGAIN",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENETUNREACH",
    "ENOTFOUND",
    "ETIMEDOUT",
  ]);
  if (networkCodes.has(error?.cause?.code) || networkCodes.has(error?.code)) {
    return "NETWORK_ERROR";
  }
  if (error instanceof TypeError && error.message === "fetch failed") {
    return "NETWORK_ERROR";
  }
  return "NETWORK_ERROR";
}

function attachFailureMode(error, failureMode, details = {}) {
  if (error && typeof error === "object") {
    error.failureMode = failureMode;
    Object.assign(error, details);
  }
  return error;
}

function parseResponseBody(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { rawText: text };
  }
}

function describeSandboxError(raw, fallback) {
  if (!raw || typeof raw !== "object") return fallback;
  const rawText = [
    raw.ErrorCode,
    raw.ErrorMessage,
    raw.MoreInfo,
    raw.code,
    raw.message,
    raw.moreInfo,
  ]
    .filter((value) => typeof value === "string")
    .join(" ");
  if (/invalid subscription/i.test(rawText) && /verify api key/i.test(rawText)) {
    return `${fallback} The sandbox key is valid for some APIs, but the transfer product is not subscribed/enabled for this hackathon key. Ask the sandbox provider to enable Posting/Account/InternalTransfer for the team key.`;
  }
  const code =
    typeof raw.ErrorCode === "string"
      ? raw.ErrorCode
      : typeof raw.code === "string"
        ? raw.code
        : "";
  const message =
    typeof raw.ErrorMessage === "string"
      ? raw.ErrorMessage
      : typeof raw.message === "string"
        ? raw.message
        : "";
  const moreInfo =
    typeof raw.MoreInfo === "string"
      ? raw.MoreInfo
      : typeof raw.moreInfo === "string"
        ? raw.moreInfo
        : "";
  const details = [code, message, moreInfo].filter(Boolean).join(" · ");
  return details ? `${fallback} ${details}` : fallback;
}

function buildSeylanHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-api-key": env.seylan.teamApiKey,
  };
}

function debugHeaders(headers) {
  return {
    ...headers,
    "x-api-key": maskSecret(headers["x-api-key"]),
  };
}

function sanitizeSandboxError(raw) {
  if (!raw || typeof raw !== "object") return null;
  const text = [
    raw.ErrorCode,
    raw.ErrorMessage,
    raw.MoreInfo,
    raw.code,
    raw.message,
    raw.moreInfo,
  ]
    .filter((value) => typeof value === "string")
    .join(" ");
  return {
    errorCode:
      typeof raw.ErrorCode === "string"
        ? raw.ErrorCode
        : typeof raw.code === "string"
          ? raw.code
          : null,
    hasInvalidSubscription: /invalid subscription/i.test(text),
    hasVerifyApiKeyPolicy: /verify api key/i.test(text),
  };
}

export function isSeylanSandboxConfigured() {
  return Boolean(
    env.seylan.sandboxUrl &&
      env.seylan.teamApiKey &&
      env.seylan.sourceAccount,
  );
}

export function isSeylanInternalTransferConfigured(destinationAccountNumber = "") {
  return Boolean(
    env.seylan.sandboxUrl &&
      env.seylan.teamApiKey &&
      env.seylan.sourceAccount &&
      (destinationAccountNumber || env.seylan.internalDestinationAccount),
  );
}

export function warnForMissingSeylanEnv() {
  const missing = [];
  if (!env.seylan.sandboxUrl) missing.push("SEYLAN_SANDBOX_URL");
  if (!env.seylan.teamApiKey) missing.push("SEYLAN_TEAM_API_KEY");
  if (!env.seylan.sourceAccount) missing.push("SEYLAN_SOURCE_ACCOUNT");
  if (!env.seylan.internalDestinationAccount) {
    missing.push("SEYLAN_INTERNAL_DESTINATION_ACCOUNT");
  }

  if (missing.length > 0) {
    console.warn("[seylan:sandbox] Missing environment variables", { missing });
  }
}

function requireConfig({
  includeTransferDestination = false,
  destinationAccountNumber = "",
} = {}) {
  const missing = [];
  if (!env.seylan.sandboxUrl) missing.push("SEYLAN_SANDBOX_URL");
  if (!env.seylan.teamApiKey) missing.push("SEYLAN_TEAM_API_KEY");
  if (!env.seylan.sourceAccount) missing.push("SEYLAN_SOURCE_ACCOUNT");
  if (
    includeTransferDestination &&
    !destinationAccountNumber &&
    !env.seylan.internalDestinationAccount
  ) {
    missing.push("SEYLAN_INTERNAL_DESTINATION_ACCOUNT");
  }

  if (missing.length > 0) {
    throw new HttpError(
      503,
      "SEYLAN_SANDBOX_NOT_CONFIGURED",
      `Seylan sandbox is missing: ${missing.join(", ")}`,
    );
  }
}

function buildSandboxUrl(baseUrl, path, query = {}) {
  const cleanBaseUrl = String(baseUrl || "").trim();
  const cleanPath = String(path || "").trim();
  if (!cleanBaseUrl) {
    throw attachFailureMode(
      new HttpError(
        503,
        "SEYLAN_SANDBOX_URL_NOT_CONFIGURED",
        "Set SEYLAN_SANDBOX_URL to call the Seylan sandbox.",
      ),
      "INVALID_URL",
    );
  }

  const base = cleanBaseUrl.replace(/\/+$/, "");
  const normalizedPath = cleanPath ? `/${cleanPath.replace(/^\/+/, "")}` : "/";
  const url = new URL(`${base}${normalizedPath}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function callSeylan(path, options = {}) {
  const {
    method = "GET",
    query,
    body,
    baseUrl = env.seylan.sandboxUrl,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    checkValue = null,
    checkValueNote = null,
  } = options;
  const headers = buildSeylanHeaders();
  const requestBody = body ? JSON.stringify(body) : undefined;
  const startedAt = Date.now();
  let url;
  let requestUrl = "";
  try {
    url = buildSandboxUrl(baseUrl, path, query);
    requestUrl = url.toString();
  } catch (error) {
    const failureMode = classifyFetchError(error);
    attachFailureMode(error, failureMode, {
      requestBaseUrl: baseUrl,
      requestPath: path,
      requestMethod: method,
    });
    logSeylanError("request:invalid-url", error, {
      method,
      baseUrl,
      path,
      failureMode,
      headers: debugHeaders(headers),
    });
    throw error;
  }

  logSeylanDebug("request:start", {
    method,
    url: requestUrl,
    headers: debugHeaders(headers),
    body: body ?? null,
    baseUrl,
    path,
    checkValue,
    checkValueNote,
    timeoutMs,
  });

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseText = await response.text();
    const raw = parseResponseBody(responseText);

    logSeylanDebug("response:received", {
      method,
      url: requestUrl,
      status: response.status,
      ok: response.ok,
      elapsedMs: Date.now() - startedAt,
      body: raw,
    });

    if (!response.ok) {
      const failureMode = classifyHttpStatus(response.status);
      const message = describeSandboxError(
        raw,
        `Seylan sandbox rejected the request with HTTP ${response.status}.`,
      );
      throw attachFailureMode(
        new HttpError(
          response.status,
          "SEYLAN_SANDBOX_HTTP_ERROR",
          message,
        ),
        failureMode,
        { rawResponse: raw, httpStatus: response.status },
      );
    }

    const bankStatus = readBankStatus(raw);
    if (!bankStatus.success) {
      const failureMode = classifyBankStatus(bankStatus);
      throw attachFailureMode(
        new HttpError(
          502,
          "SEYLAN_SANDBOX_STATUS_ERROR",
          `Seylan sandbox returned status ${bankStatus.code}: ${bankStatus.description}`,
        ),
        failureMode,
        { bankStatus, rawResponse: raw },
      );
    }

    return { raw, bankStatus };
  } catch (error) {
    const failureMode = error?.failureMode ?? classifyFetchError(error);
    attachFailureMode(error, failureMode, {
      requestUrl,
      requestMethod: method,
    });
    logSeylanError("request:failed", error, {
      method,
      baseUrl,
      path,
      url: requestUrl,
      failureMode,
      headers: debugHeaders(headers),
      body: body ?? null,
      checkValue,
      checkValueNote,
    });
    throw error;
  }
}

export async function getSeylanBalance() {
  requireConfig();
  const { raw, bankStatus } = await callSeylan(BALANCE_PATH, {
    query: {
      AccountCategory: "EXT",
      AccountNumber: env.seylan.sourceAccount,
    },
  });

  return {
    data: mapBalanceResponse(raw, env.seylan.sourceAccount),
    bankStatus,
  };
}

export async function getSeylanTransactions({ count = 10 } = {}) {
  requireConfig();
  const numberOfTransactions = Math.min(Math.max(Number(count) || 10, 1), 25);
  const { raw, bankStatus } = await callSeylan(TRANSACTIONS_PATH, {
    query: {
      AccountCategory: "EXT",
      AccountNumber: env.seylan.sourceAccount,
      NumberOfTransactions: numberOfTransactions,
    },
  });
  const items = mapTransactionResponse(raw);

  return {
    data: {
      count: numberOfTransactions,
      totalAvailable: items.length,
      items,
      retrievedAt: new Date().toISOString(),
    },
    bankStatus,
  };
}

export async function testSeylanSandboxConnectivity({ timeoutMs = 5_000 } = {}) {
  if (!env.seylan.sandboxUrl) {
    throw new HttpError(
      503,
      "SEYLAN_SANDBOX_URL_NOT_CONFIGURED",
      "Set SEYLAN_SANDBOX_URL to run the direct sandbox connectivity test.",
    );
  }

  const url = buildSandboxUrl(env.seylan.sandboxUrl, "");
  const headers = buildSeylanHeaders();
  logSeylanDebug("connectivity-test:start", {
    url: url.toString(),
    headers: debugHeaders(headers),
    timeoutMs,
  });

  try {
    const startedAt = Date.now();
    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const responseText = await response.text();
    const body = parseResponseBody(responseText);
    const result = {
      reachable: true,
      status: response.status,
      ok: response.ok,
      elapsedMs: Date.now() - startedAt,
      body,
    };
    logSeylanDebug("connectivity-test:response", result);
    return result;
  } catch (error) {
    const failureMode = classifyFetchError(error);
    attachFailureMode(error, failureMode, {
      requestUrl: url.toString(),
      requestMethod: "GET",
    });
    logSeylanError("connectivity-test:failed", error, {
      url: url.toString(),
      failureMode,
    });
    return {
      reachable: false,
      failureMode,
      errorName: error?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      cause: error?.cause
        ? {
            code: error.cause.code,
            name: error.cause.name,
            message: error.cause.message,
          }
        : null,
    };
  }
}

export async function postSeylanInternalTransfer({
  amount,
  reference,
  destinationAccountNumber = "",
}) {
  requireConfig({ includeTransferDestination: true, destinationAccountNumber });
  const formattedAmount = amount.toFixed(2);
  const userReference = reference || `FINWISE-${String(Date.now()).slice(-8)}`;
  const destinationAccount =
    destinationAccountNumber || env.seylan.internalDestinationAccount;
  const payload = {
    FundsTransfer_Request: {
      Account_category: "EXT",
      Source_account_number: env.seylan.sourceAccount,
      Destination_account_number: destinationAccount,
      Transaction_amount: formattedAmount,
      Debit_transaction_code: "020",
      Credit_transaction_code: "520",
      User_reference: userReference,
    },
  };

  const { raw, bankStatus } = await callSeylan(INTERNAL_TRANSFER_PATH, {
    method: "POST",
    baseUrl: env.seylan.sandboxUrl,
    body: payload,
    checkValue: null,
    checkValueNote:
      "not_applicable_for_internal_transfer_per_seylan_web_api_manual",
  });

  return {
    data: mapTransferResponse(
      raw,
      amount,
      `Seylan test account **${destinationAccount.slice(-4)}`,
      userReference,
    ),
    bankStatus,
  };
}
