import { API_PHASE, API_VERSION } from "../config/constants.js";

/** Machine-readable catalog for `GET /api/meta` (discovery + hackathon judging). */
export const API_ENDPOINT_CATALOG = [
  {
    method: "GET",
    path: "/api/health",
    summary: "Liveness + route index",
  },
  {
    method: "GET",
    path: "/api/meta",
    summary: "API version, phase, and endpoint catalog",
  },
  {
    method: "POST",
    path: "/api/auth/register",
    summary: "Create account (SQLite), session cookie issued",
  },
  {
    method: "POST",
    path: "/api/auth/login",
    summary: "Email + password login, session cookie",
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    summary: "Revoke active session cookie",
  },
  {
    method: "GET",
    path: "/api/auth/me",
    summary: "Current user from session cookie",
  },
  {
    method: "POST",
    path: "/api/auth/forgot-password",
    summary: "Request password reset token (enumeration-safe)",
  },
  {
    method: "POST",
    path: "/api/auth/reset-password",
    summary: "Set new password with reset token",
  },
  {
    method: "GET",
    path: "/api/auth/profile",
    summary: "User profile + prefs (SQLite), session cookie",
  },
  {
    method: "PATCH",
    path: "/api/auth/profile",
    summary: "Update profile fields",
  },
  {
    method: "GET",
    path: "/api/auth/profile/avatar",
    summary: "Stream profile avatar when signed in",
  },
  {
    method: "POST",
    path: "/api/auth/profile/avatar",
    summary: "Upload profile JPEG/PNG/WebP (multipart \"file\")",
  },
  {
    method: "POST",
    path: "/api/auth/change-email",
    summary: "Change account email after password confirmation, new session cookie",
  },
  {
    method: "POST",
    path: "/api/auth/change-password",
    summary: "Change password after verification, rotate session cookie",
  },
  {
    method: "GET",
    path: "/api/mock/profile",
    summary: "Demo student profile & account mask",
  },
  {
    method: "GET",
    path: "/api/mock/snapshot",
    summary: "Unified dashboard payload used by the SPA",
  },
  {
    method: "POST",
    path: "/api/mock/record-payment",
    summary:
      "Record a mock payment debit in the in-memory demo ledger (updates snapshot balances and category usage)",
  },
  {
    method: "GET",
    path: "/api/mock/summary",
    summary: "Lightweight balances + category spend map",
  },
  {
    method: "GET",
    path: "/api/mock/balance",
    summary: "Minimal LKR balance projection for thin clients",
  },
  {
    method: "GET",
    path: "/api/mock/transactions?month=YYYY-MM",
    summary: "Filterable mock ledger (month required format when provided)",
  },
  {
    method: "GET",
    path: "/api/alerts",
    summary:
      "Phase 8 Smart Alerts Engine over sandbox or fallback balance, budgets, spending, and savings risk",
  },
  {
    method: "POST",
    path: "/api/savings/plan",
    summary:
      "Phase 9 deterministic Savings Planner Engine with feasibility, scenarios, milestones, and action plan",
  },
  {
    method: "GET",
    path: "/api/bank/balance",
    summary: "Seylan sandbox balance inquiry with mock fallback",
  },
  {
    method: "GET",
    path: "/api/bank/transactions?count=10&month=YYYY-MM",
    summary:
      "Seylan sandbox transaction history with optional month filtering and normalized categories",
  },
  {
    method: "POST",
    path: "/api/bank/internal-transfer",
    summary:
      "Phase 10 validated Seylan sandbox internal transfer using backend-only test accounts",
  },
  {
    method: "GET",
    path: "/api/intelligence/overlay",
    summary:
      "Read-only intelligence bundle: health score, spending insights, balance forecast, recurring simulation, narrative",
  },
  {
    method: "POST",
    path: "/api/ai/money-advice",
    summary:
      "Read-only AI money Q&A using snapshot context (no transfers or payments)",
  },
  {
    method: "POST",
    path: "/api/ai/chat",
    summary: "FinWise student finance chat (gpt-4o-mini)",
  },
  {
    method: "POST",
    path: "/api/ai/scholarships",
    summary: "Structured scholarship ideas with verification reminders",
  },
  {
    method: "POST",
    path: "/api/ai/savings-plan",
    summary: "Phase 9 savings engine output with GPT narration",
  },
  {
    method: "GET",
    path: "/api/ai/status",
    summary: "Surface whether OpenAI credentials are loaded + default model",
  },
];

export function buildMetaPayload() {
  return {
    apiVersion: API_VERSION,
    phase: API_PHASE,
    service: "finwise-ai-api",
    description:
      "Phase 10 adds sandbox internal transfers on top of live OpenAI, Seylan balance and transaction adapters, smart alerts, savings planning, and mock fallback layers.",
    endpoints: API_ENDPOINT_CATALOG,
  };
}

/** @returns {string[]} */
export function apiRouteLines() {
  return API_ENDPOINT_CATALOG.map((row) => `${row.method} ${row.path}`);
}