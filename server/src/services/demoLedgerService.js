import crypto from "node:crypto";

import { mockCurrentMonth } from "../data/mockData.js";

const demoTransactions = [];

const DEFAULT_PAYMENT_CATEGORY = "Other";

function todayInMockMonth() {
  const today = new Date().toISOString().slice(0, 10);
  return today.startsWith(mockCurrentMonth) ? today : `${mockCurrentMonth}-16`;
}

/**
 * @param {{
 *   amount: number;
 *   beneficiary: string;
 *   reference: string;
 *   category?: string;
 *   description?: string;
 *   source?: string;
 * }} input
 */
export function recordDemoPaymentDebit({
  amount,
  beneficiary,
  reference,
  category = DEFAULT_PAYMENT_CATEGORY,
  description,
  source = "payment_transfer",
}) {
  const roundedAmount = Math.round(Number(amount) * 100) / 100;
  const trimmedDescription =
    typeof description === "string" && description.trim().length > 0
      ? description.trim().replace(/\s+/g, " ")
      : null;
  const transaction = {
    id: `demo-pay-${crypto.randomUUID().slice(0, 8)}`,
    dateISO: todayInMockMonth(),
    description: trimmedDescription || `Payment to ${beneficiary}`,
    category,
    debit: roundedAmount,
    reference,
    createdAt: new Date().toISOString(),
    source,
  };

  demoTransactions.unshift(transaction);
  return transaction;
}

export function getDemoTransactions() {
  return [...demoTransactions];
}
