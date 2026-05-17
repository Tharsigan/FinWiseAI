const JSON_HEADERS = {
  Accept: "application/json",
};

const AUTH_FETCH = {
  headers: JSON_HEADERS,
  credentials: "include",
};

/**
 * @param {Response} res
 */
async function readOkData(res) {
  const body = /** @type {Record<string, unknown>} */ (
    await res.json().catch(() => ({}))
  );

  if (!res.ok || body.ok !== true) {
    const message =
      typeof body.message === "string"
        ? body.message
        : `Request failed · HTTP ${res.status}`;
    throw new Error(message);
  }

  return body.data;
}

/**
 * @param {Response} res
 */
async function readOkEnvelope(res) {
  const body = /** @type {Record<string, unknown>} */ (
    await res.json().catch(() => ({}))
  );

  if (!res.ok || body.ok !== true) {
    const message =
      typeof body.message === "string"
        ? body.message
        : `Request failed · HTTP ${res.status}`;
    throw new Error(message);
  }

  return body;
}

/** @typedef {{ id: string; email: string }} AuthUserEnvelope */

/** @returns {Promise<AuthUserEnvelope | null>} */
export async function fetchAuthMe() {
  const res = await fetch("/api/auth/me", AUTH_FETCH);
  const body = /** @type {Record<string, unknown>} */ (
    await res.json().catch(() => ({}))
  );
  if (!res.ok || body.ok !== true) return null;
  const data = /** @type {{ user?: AuthUserEnvelope }} */ (body.data);
  const user = data?.user;
  if (!user || typeof user.email !== "string" || typeof user.id !== "string") {
    return null;
  }
  return user;
}

/**
 * @param {{ email: string; password: string }} input
 */
export async function postAuthLogin(input) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return readOkData(res);
}

/**
 * @param {{ email: string; password: string }} input
 */
export async function postAuthRegister(input) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return readOkData(res);
}

export async function postAuthLogout() {
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    ...AUTH_FETCH,
  });
  return readOkData(res);
}

/**
 * @param {{ email: string }} input
 */
export async function postAuthForgotPassword(input) {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return readOkData(res);
}

/**
 * @param {{ token: string; newPassword: string }} input
 */
export async function postAuthResetPassword(input) {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return readOkData(res);
}

/** @returns {Promise<Record<string, unknown>>} */
export async function fetchAuthProfile() {
  const res = await fetch("/api/auth/profile", AUTH_FETCH);
  const data = await readOkData(res);
  const profile = /** @type {Record<string, unknown>} */ (
    typeof data?.profile === "object" && data.profile !== null
      ? data.profile
      : {}
  );
  return profile;
}

/**
 * @param {Record<string, unknown>} patch
 */
export async function patchAuthProfile(patch) {
  const res = await fetch("/api/auth/profile", {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  const data = await readOkData(res);
  return /** @type {Record<string, unknown>} */ (
    typeof data?.profile === "object" && data.profile !== null ? data.profile : {}
  );
}

/** @param {File} file */
export async function postAuthAvatar(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/auth/profile/avatar", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
    body: fd,
  });
  const data = await readOkData(res);
  return /** @type {Record<string, unknown>} */ (
    typeof data?.profile === "object" && data.profile !== null ? data.profile : {}
  );
}

/** @param {{ newEmail: string; currentPassword: string }} body */
export async function postAuthChangeEmail(body) {
  const res = await fetch("/api/auth/change-email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return readOkData(res);
}

/** @param {{ currentPassword: string; newPassword: string }} body */
export async function postAuthChangePassword(body) {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return readOkData(res);
}

/**
 * Dashboard bundle served from Phase 3 mock services.
 */
export async function fetchMockSnapshot() {
  const res = await fetch("/api/mock/snapshot", { headers: JSON_HEADERS });
  const body = /** @type {Record<string, unknown>} */ (
    await res.json().catch(() => ({}))
  );

  if (!res.ok || body.ok !== true) {
    const message =
      typeof body.message === "string"
        ? body.message
        : `Snapshot rejected · HTTP ${res.status}`;
    throw new Error(message);
  }

  return body.data;
}

/**
 * Record a mock payment in the server demo ledger (updates snapshot).
 * @param {{
 *   amount: number;
 *   category: string;
 *   beneficiaryId: string;
 *   reference?: string;
 * }} body
 */
export async function postMockRecordPayment(body) {
  const res = await fetch("/api/mock/record-payment", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return readOkData(res);
}

/**
 * Phase 8 Smart Alerts Engine. Uses Seylan sandbox data when the backend is
 * configured, and the same deterministic fallback payload otherwise.
 * @param {{ month?: string }} [params]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchSmartAlerts(params = {}) {
  const query = new URLSearchParams();
  if (params.month) query.set("month", params.month);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`/api/alerts${suffix}`, { headers: JSON_HEADERS });
  return readOkEnvelope(res);
}

/**
 * @param {{ message: string; history?: { role: string; content: string }[] }} body
 */
export async function postAiChat(body) {
  let res;
  try {
    res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw error;
  }
  return readOkData(res);
}

/**
 * @param {Record<string, unknown>} body
 */
export async function postAiScholarships(body) {
  let res;
  try {
    res = await fetch("/api/ai/scholarships", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw error;
  }
  return readOkData(res);
}

/**
 * @param {Record<string, unknown>} body
 */
export async function postAiSavingsPlan(body) {
  const res = await fetch("/api/ai/savings-plan", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return readOkData(res);
}

/**
 * Phase 9 deterministic Savings Planner Engine.
 * @param {Record<string, unknown>} body
 */
export async function postSavingsPlan(body) {
  const res = await fetch("/api/savings/plan", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return readOkData(res);
}

/**
 * @returns {Promise<{ configured: boolean; model: string }>}
 */
export async function fetchAiStatus() {
  const res = await fetch("/api/ai/status", {
    headers: { Accept: "application/json" },
  });
  return readOkData(res);
}

/** @returns {Promise<Record<string, unknown>>} */
export async function fetchIntelligenceOverlay() {
  const res = await fetch("/api/intelligence/overlay", {
    headers: JSON_HEADERS,
  });
  return readOkData(res);
}

/**
 * @param {{ question: string }} body
 * @returns {Promise<Record<string, unknown>>}
 */
export async function postMoneyAdvice(body) {
  const res = await fetch("/api/ai/money-advice", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return readOkData(res);
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchBankBalance() {
  const res = await fetch("/api/bank/balance", { headers: JSON_HEADERS });
  return readOkEnvelope(res);
}

/**
 * @param {{ month?: string; count?: number }} [params]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchBankTransactions(params = {}) {
  const query = new URLSearchParams();
  if (params.month) query.set("month", params.month);
  if (params.count) query.set("count", String(params.count));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`/api/bank/transactions${suffix}`, {
    headers: JSON_HEADERS,
  });
  return readOkEnvelope(res);
}

/**
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchBankBeneficiaries() {
  const res = await fetch("/api/bank/beneficiaries", { headers: JSON_HEADERS });
  return readOkEnvelope(res);
}

/**
 * @param {{ name: string; accountNumber: string }} input
 * @returns {Promise<Record<string, unknown>>}
 */
export async function createBankBeneficiary(input) {
  const res = await fetch("/api/bank/beneficiaries", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readOkEnvelope(res);
}

/**
 * Phase 10 Seylan sandbox transfer. The backend may return a labeled demo
 * acknowledgement when sandbox credentials are absent; the client does not
 * fabricate successful receipts.
 * @param {{ beneficiaryId: string; amount: number; reference?: string; category: string }} input
 */
export async function submitSandboxInternalTransfer(input) {
  const res = await fetch("/api/bank/internal-transfer", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readOkEnvelope(res);
}

/**
 * MPGS configuration probe (merchant id is safe to expose; API password stays server-only).
 * @returns {Promise<Record<string, unknown>>}
 */
export async function fetchPaymentStatus() {
  const res = await fetch("/api/payment/status", { headers: JSON_HEADERS });
  return readOkEnvelope(res);
}

/**
 * Mastercard MPGS Hosted Checkout session creation.
 * @param {{ amount: number; currency?: string; reference?: string; category?: string }} input
 */
export async function createPaymentSession(input) {
  const res = await fetch("/api/payment/create-session", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  return readOkEnvelope(res);
}
