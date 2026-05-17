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
  // Prior month (2026-04) — backfill for MoM spending insights vs mockCurrentMonth (May).
  {
    id: "t-420",
    dateISO: "2026-04-28",
    description: "April groceries — weekend stock-up",
    category: "Food",
    debit: 2500,
  },
  {
    id: "t-419",
    dateISO: "2026-04-25",
    description: "PickMe — campus runs",
    category: "Transport",
    debit: 900,
  },
  {
    id: "t-418",
    dateISO: "2026-04-22",
    description: "Dialog combo package",
    category: "Mobile Data",
    debit: 1700,
  },
  {
    id: "t-417",
    dateISO: "2026-04-20",
    description: "April savings top-up",
    category: "Savings",
    debit: 9000,
  },
  {
    id: "t-416",
    dateISO: "2026-04-18",
    description: "Movie + snacks",
    category: "Entertainment",
    debit: 2000,
  },
  {
    id: "t-415",
    dateISO: "2026-04-16",
    description: "UberEats — exam week",
    category: "Food",
    debit: 2100,
  },
  {
    id: "t-414",
    dateISO: "2026-04-14",
    description: "Boarding allowance",
    category: "Rent",
    debit: 16000,
  },
  {
    id: "t-413",
    dateISO: "2026-04-12",
    description: "Train + bus pass",
    category: "Transport",
    debit: 1200,
  },
  {
    id: "t-412",
    dateISO: "2026-04-10",
    description: "Printing & supplies",
    category: "Other",
    debit: 2000,
  },
  {
    id: "t-411",
    dateISO: "2026-04-08",
    description: "Cafe study sessions",
    category: "Food",
    debit: 2200,
  },
  {
    id: "t-410",
    dateISO: "2026-04-06",
    description: "Mobile reload (promo)",
    category: "Mobile Data",
    debit: 1500,
  },
  {
    id: "t-409",
    dateISO: "2026-04-05",
    description: "Hosting gift for friend",
    category: "Entertainment",
    debit: 2500,
  },
  {
    id: "t-408",
    dateISO: "2026-04-03",
    description: "Pharmacy & toiletries",
    category: "Other",
    debit: 2000,
  },
  {
    id: "t-407",
    dateISO: "2026-04-02",
    description: "Tuk trips — late class",
    category: "Transport",
    debit: 700,
  },
  {
    id: "t-406",
    dateISO: "2026-04-01",
    description: "Parent allowance",
    category: "Unallocated Income",
    credit: 25000,
  },
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
