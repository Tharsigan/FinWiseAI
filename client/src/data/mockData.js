/** Study-only demo payloads for Phase 2; replace via API responses later. */

export const mockProfile = {
  firstName: "Kavindu",
  lastName: "Perera",
  university: "University of Sri Jayewardenapura",
  email: "dinara.student@campus.ac.lk",
};

/** ISO month used for budgeting rollups (“this month”). */
export const mockCurrentMonth = "2026-05";

/** Category budgets (LKR/month). Spending is recomputed from `mockTransactions`. */
export const mockCategoryBudgets = [
  { category: "Food", budget: 8360 },
  { category: "Transport", budget: 2670 },
  { category: "Rent", budget: 22000 },
  { category: "Mobile Data", budget: 5700 },
  { category: "Entertainment", budget: 5480 },
  { category: "Savings", budget: 15000 },
  { category: "Other", budget: 9200 },
];

export const mockSavingsGoal = {
  title: "Postgraduate tuition abroad",
  targetAmount: 485000,
  savedAmount: 137500,
  targetDateISO: "2027-06-01",
  monthlyIncome: 78000,
  monthlyExpensesSnapshot: 61200,
};

export const mockAccount = {
  numberMasked: "**8821",
  type: "Student Savings",
};

/**
 * Planned monthly income deposited (before spending).
 */
export const mockPlannedMonthlyIncome = 78000;

/** Illustrative ledger before mocked May activity — chosen so rollup matches headline UI totals. */
export const MOCK_LEDGER_BEFORE_MONTH_LKR = 59260;

/**
 * Debit amounts should be stored as POSITIVE debit values below; mapper normalizes signs.
 */
export const mockTransactions = [
  {
    id: "t-519",
    dateISO: "2026-05-17",
    description: "Campus lab fee refund",
    category: "Unallocated Income",
    credit: 3200,
  },
  {
    id: "t-518",
    dateISO: "2026-05-17",
    description: "UberEats — late dinner",
    category: "Food",
    debit: 1890,
  },
  {
    id: "t-517",
    dateISO: "2026-05-17",
    description: "Freelance poster design",
    category: "Unallocated Income",
    credit: 4500,
  },
  {
    id: "t-516",
    dateISO: "2026-05-16",
    description: "Keells — groceries",
    category: "Food",
    debit: 3240,
  },
  {
    id: "t-515",
    dateISO: "2026-05-16",
    description: "PickMe rides",
    category: "Transport",
    debit: 680,
  },
  {
    id: "t-514",
    dateISO: "2026-05-15",
    description: "Dialog reload",
    category: "Mobile Data",
    debit: 1200,
  },
  {
    id: "t-513",
    dateISO: "2026-05-15",
    description: "Textbook resale (credit)",
    category: "Unallocated Income",
    credit: 1200,
  },
  {
    id: "t-512",
    dateISO: "2026-05-14",
    description: "Coursera renewal",
    category: "Other",
    debit: 2900,
  },
  {
    id: "t-511",
    dateISO: "2026-05-13",
    description: "Boarding allowance",
    category: "Rent",
    debit: 16000,
  },
  {
    id: "t-510",
    dateISO: "2026-05-13",
    description: "Mega pizza night",
    category: "Entertainment",
    debit: 2400,
  },
  {
    id: "t-509",
    dateISO: "2026-05-12",
    description: "Kottu lunches (week)",
    category: "Food",
    debit: 2650,
  },
  {
    id: "t-508",
    dateISO: "2026-05-11",
    description: "Train pass top-up",
    category: "Transport",
    debit: 1500,
  },
  {
    id: "t-507",
    dateISO: "2026-05-09",
    description: "Mega savings sweep",
    category: "Savings",
    debit: 8000,
  },
  {
    id: "t-506",
    dateISO: "2026-05-08",
    description: "Gym promo",
    category: "Entertainment",
    debit: 3500,
  },
  {
    id: "t-505",
    dateISO: "2026-05-06",
    description: "Part-time tutoring pay",
    category: "Unallocated Income",
    credit: 9500,
  },
  {
    id: "t-504",
    dateISO: "2026-05-06",
    description: "Campus stationery",
    category: "Other",
    debit: 1850,
  },
  {
    id: "t-503",
    dateISO: "2026-05-04",
    description: "Mobile bill",
    category: "Mobile Data",
    debit: 2790,
  },
  {
    id: "t-502",
    dateISO: "2026-05-03",
    description: "Coffee & pastries",
    category: "Food",
    debit: 1420,
  },
  {
    id: "t-501",
    dateISO: "2026-05-01",
    description: "Parent allowance",
    category: "Unallocated Income",
    credit: 25000,
  },
];
