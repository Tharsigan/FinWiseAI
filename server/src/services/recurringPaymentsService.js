/**
 * Simulation only — does not deduct balance or trigger transfers.
 * @param {ReturnType<import("./intelligenceContext.js").buildIntelligenceContext>} _ctx
 */
export function buildRecurringPayments(_ctx) {
  return [
    { name: "Rent", amount: 16000, nextDueDate: "2026-05-20" },
    { name: "Subscriptions", amount: 2900, nextDueDate: "2026-05-22" },
    { name: "Tuition installment", amount: 45000, nextDueDate: "2026-06-01" },
  ];
}
