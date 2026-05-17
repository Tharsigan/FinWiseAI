export const INCOME_CATEGORIES = [
  "Parent Allowance",
  "Part-time Income",
  "Scholarship",
  "Refund / Reimbursement",
  "Other Income",
];

const STORAGE_KEY = "finwise.incomeAllocations.v1";

/** @typedef {{ id:string, description?:string, category?:string, debit?:number, credit?:number }} TransactionLike */

export function readIncomeAllocations() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string,string>} allocations */
export function writeIncomeAllocations(allocations) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allocations));
}

/** @param {TransactionLike} row */
export function isIncomeTransaction(row) {
  return Number(row?.credit || 0) > 0;
}

/** @param {unknown[]} rows */
export function applyIncomeAllocationsToRows(rows) {
  const allocations = readIncomeAllocations();
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const txn = /** @type {TransactionLike} */ (row);
    const allocatedCategory = allocations[txn.id];
    if (!isIncomeTransaction(txn) || !allocatedCategory) return row;
    return {
      ...txn,
      category: allocatedCategory,
      incomeCategory: allocatedCategory,
      categoryAllocated: true,
    };
  });
}

/** @param {Record<string, unknown> | null} snapshot */
export function applyIncomeAllocationsToSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.normalized)) return snapshot;
  return {
    ...snapshot,
    normalized: applyIncomeAllocationsToRows(snapshot.normalized),
  };
}

/** @param {unknown[]} rows */
export function getUnallocatedIncomeTransactions(rows) {
  const allocations = readIncomeAllocations();
  return rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    const txn = /** @type {TransactionLike} */ (row);
    return isIncomeTransaction(txn) && !allocations[txn.id];
  });
}

/** @param {Record<string,string>} allocationDraft */
export function saveIncomeAllocationDraft(allocationDraft) {
  const current = readIncomeAllocations();
  const next = { ...current };
  for (const [id, category] of Object.entries(allocationDraft)) {
    if (INCOME_CATEGORIES.includes(category)) next[id] = category;
  }
  writeIncomeAllocations(next);
  return next;
}

/** @param {TransactionLike} row */
export function guessIncomeCategory(row) {
  const text = `${row.description ?? ""} ${row.category ?? ""}`.toLowerCase();
  if (/parent|allowance/.test(text)) return "Parent Allowance";
  if (/tutor|part.?time|salary|pay|wage/.test(text)) return "Part-time Income";
  if (/scholar|grant|bursary/.test(text)) return "Scholarship";
  if (/refund|reimburse|resale|cashback/.test(text)) return "Refund / Reimbursement";
  return "Other Income";
}
