export const PAYMENT_CATEGORIES = [
  "Entertainment",
  "Food",
  "Transport",
  "Rent",
  "Mobile Data",
  "Savings",
  "Other",
];

/** @param {unknown} value */
export function normalizePaymentCategory(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  return PAYMENT_CATEGORIES.find((category) => category.toLowerCase() === raw) ?? null;
}
